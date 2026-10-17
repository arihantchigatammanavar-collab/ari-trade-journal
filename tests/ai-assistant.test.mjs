import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import test from 'node:test';
import {
  buildJournalAnalysisContext,
  createAiAssistantRouter,
  DEFAULT_NVIDIA_MODEL,
  NVIDIA_CHAT_COMPLETIONS_URL,
} from '../server/aiAssistant.js';

const TEST_API_KEY = 'test-nvidia-key-must-never-be-returned';

function savedTrades() {
  return [
    {
      id: 'TR-PRIVATE-001', recordStatus: 'complete', tradeDatetime: '2026-09-01T10:00:00Z',
      market: 'BTC/USDT', direction: 'Long', strategy: 'EMA Reclaim', entryPrice: 100, exitPrice: 110,
      quantity: 1, plannedRisk: 10, fees: 0, ruleCompliant: 'yes', emotionTags: ['Calm'],
      entryReason: 'Waited for volume confirmation. Contact jane.doe@example.com or 555-123-4567.', lesson: 'Keep waiting for the candle close.',
      platform: 'Private Broker XYZ', accountEquity: 123456, beforeScreenshot: '/private/uploads/chart.png',
    },
    {
      id: 'TR-PRIVATE-002', recordStatus: 'complete', tradeDatetime: '2026-09-02T10:00:00Z',
      market: 'BTC/USDT', direction: 'Long', strategy: 'EMA Reclaim', entryPrice: 100, exitPrice: 90,
      quantity: 1, plannedRisk: 10, fees: 0, ruleCompliant: 'no', emotionTags: ['FOMO'],
      entryReason: 'Entered before the signal.', lesson: 'Do not chase a late candle.', isImpulsive: true,
    },
    {
      id: 'TR-PRIVATE-003', recordStatus: 'complete', tradeDatetime: '2026-09-03T10:00:00Z',
      market: 'XAU/USD', direction: 'Short', strategy: 'London Sweep', entryPrice: 100, exitPrice: 95,
      quantity: 2, plannedRisk: 10, fees: 0, ruleCompliant: 'partial', emotionTags: ['Calm'],
      exitReason: 'Exited at the planned target.', lesson: 'Document the exit context.', isRevenge: true,
    },
    {
      id: 'TR-PRIVATE-004', recordStatus: 'excluded', tradeDatetime: '2026-09-04T10:00:00Z',
      market: 'BTC/USDT', direction: 'Long', entryPrice: 1, exitPrice: 10000, quantity: 100,
      lesson: 'This excluded record must not inform performance.',
    },
    {
      id: 'TR-PRIVATE-005', recordStatus: 'draft', tradeDatetime: '2026-09-05T10:00:00Z',
      market: 'BTC/USDT', direction: 'Long', entryPrice: 1, exitPrice: 10000, quantity: 100,
    },
  ];
}

async function startApi(t, options = {}) {
  const app = express();
  app.use('/api/ai', express.json({ limit: '16kb' }), createAiAssistantRouter(options));
  app.use('/api/ai', (err, _req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'This AI request is too large. Shorten the question or conversation and retry.' });
    return next(err);
  });
  const server = createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { port } = server.address();
  return `http://127.0.0.1:${port}/api/ai`;
}

async function postChat(baseUrl, body) {
  const response = await fetch(`${baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

function okCompletion(content = 'Data used: 3 verified trades. The sample is small.') {
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) };
}

test('journal context recalculates only complete records and gives a real date scope', () => {
  const context = buildJournalAnalysisContext(savedTrades());
  assert.equal(context.scope.completeTradeCount, 3);
  assert.deepEqual(context.scope.dateRange, { from: '2026-09-01', to: '2026-09-03' });
  assert.equal(context.scope.journalEntriesReviewed, 3);
  assert.equal(context.scope.draftsExcluded, 1);
  assert.equal(context.scope.excludedRecordsNotUsed, 1);
  assert.equal(context.calculatedStats.winCount, 2);
  assert.equal(context.calculatedStats.lossCount, 1);
  assert.equal(context.calculatedStats.winRate, 66.7);
  assert.equal(context.calculatedStats.expectancy, 3.33);
  assert.equal(context.calculatedStats.profitFactor, 2);
  assert.equal(context.calculatedStats.maxDrawdownAmount, 10);
  assert.equal(context.strategyComparisons.items.length, 2);
  assert.equal(context.recordedMistakeFlags.impulsiveEntries, 1);
  assert.equal(context.recordedMistakeFlags.revengeEntries, 1);

  const serialized = JSON.stringify(context);
  assert.doesNotMatch(serialized, /TR-PRIVATE|Private Broker|123456|private\/uploads/);
  assert.doesNotMatch(serialized, /jane\.doe@example\.com|555-123-4567/);
  assert.match(serialized, /\[email redacted\]|\[number redacted\]/);
  assert.match(serialized, /Waited for volume confirmation/);
});

test('status and missing-key response never expose an NVIDIA API key', async (t) => {
  let providerCalls = 0;
  const baseUrl = await startApi(t, {
    getTrades: savedTrades,
    getApiKey: () => '',
    fetchImpl: async () => { providerCalls += 1; return okCompletion(); },
  });

  const statusResponse = await fetch(`${baseUrl}/status`);
  const status = await statusResponse.json();
  assert.equal(status.configured, false);
  assert.equal(status.model, DEFAULT_NVIDIA_MODEL);
  assert.match(status.message, /NVIDIA_API_KEY/);

  const { response, body } = await postChat(baseUrl, { prompt: 'Summarize my journal.' });
  assert.equal(response.status, 503);
  assert.match(body.error, /NVIDIA_API_KEY/);
  assert.doesNotMatch(JSON.stringify({ status, body }), /test-nvidia-key/);
  assert.equal(providerCalls, 0);
});

test('chat uses real saved journal context and keeps the key and private fields out of the response', async (t) => {
  let capturedUrl;
  let capturedOptions;
  const baseUrl = await startApi(t, {
    getTrades: savedTrades,
    getApiKey: () => TEST_API_KEY,
    getModel: () => 'nvidia/nemotron-3.5-lightning-30b-a3b',
    fetchImpl: async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return okCompletion('Data used: 3 verified trades from 2026-09-01 through 2026-09-03. This sample is too small for reliable conclusions.');
    },
  });

  const { response, body } = await postChat(baseUrl, { prompt: 'Compare my strategy results.' });
  assert.equal(response.status, 200);
  assert.equal(capturedUrl, NVIDIA_CHAT_COMPLETIONS_URL);
  assert.equal(capturedOptions.headers.Authorization, `Bearer ${TEST_API_KEY}`);
  const request = JSON.parse(capturedOptions.body);
  assert.equal(request.model, 'nvidia/nemotron-3.5-lightning-30b-a3b');
  assert.equal(request.stream, false);
  assert.equal(request.max_tokens, 1200);
  assert.equal(request.top_p, 0.95);
  assert.equal(request.reasoning_budget, 512);
  assert.equal(request.messages[0].role, 'system');
  assert.equal(request.messages.filter(message => message.role === 'system').length, 1);
  assert.equal(request.messages.at(-1).role, 'user');
  const contextString = request.messages[0].content.split('Saved Ari journal context (JSON):\n')[1];
  const context = JSON.parse(contextString);
  assert.equal(context.scope.completeTradeCount, 3);
  assert.equal(context.calculatedStats.expectancy, 3.33);
  assert.match(JSON.stringify(context.journalEntries), /Keep waiting for the candle close/);
  assert.doesNotMatch(contextString, /TR-PRIVATE|Private Broker|123456|private\/uploads/);
  assert.doesNotMatch(contextString, /jane\.doe@example\.com|555-123-4567/);
  assert.equal(body.scope.completeTradeCount, 3);
  assert.equal(body.calculatedStats.profitFactor, 2);
  assert.match(body.answer, /too small/);
  assert.doesNotMatch(JSON.stringify(body), new RegExp(TEST_API_KEY));
});

test('empty journal returns a limitation without calling NVIDIA', async (t) => {
  let providerCalls = 0;
  const baseUrl = await startApi(t, {
    getTrades: () => [],
    getApiKey: () => TEST_API_KEY,
    fetchImpl: async () => { providerCalls += 1; return okCompletion(); },
  });

  const { response, body } = await postChat(baseUrl, { prompt: 'How am I doing?' });
  assert.equal(response.status, 200);
  assert.equal(body.scope.completeTradeCount, 0);
  assert.match(body.answer, /no verified complete trades/i);
  assert.equal(body.provider, 'local-empty-journal');
  assert.equal(providerCalls, 0);
});

test('invalid NVIDIA credentials are translated to a safe actionable error', async (t) => {
  const baseUrl = await startApi(t, {
    getTrades: savedTrades,
    getApiKey: () => TEST_API_KEY,
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: `Bearer ${TEST_API_KEY} invalid` }) }),
  });

  const { response, body } = await postChat(baseUrl, { prompt: 'Explain expectancy.' });
  assert.equal(response.status, 502);
  assert.match(body.error, /NVIDIA rejected the server credentials/);
  assert.match(body.error, /NVIDIA_API_KEY/);
  assert.doesNotMatch(JSON.stringify(body), new RegExp(TEST_API_KEY));
});

test('NVIDIA rate limits return a retryable message without exposing upstream detail', async (t) => {
  const baseUrl = await startApi(t, {
    getTrades: savedTrades,
    getApiKey: () => TEST_API_KEY,
    fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: 'provider internal detail' }) }),
  });

  const { response, body } = await postChat(baseUrl, { prompt: 'Summarize my journal.' });
  assert.equal(response.status, 429);
  assert.match(body.error, /rate-limiting/);
  assert.doesNotMatch(body.error, /provider internal detail/);
});

test('other NVIDIA API failures return a safe retry message', async (t) => {
  const baseUrl = await startApi(t, {
    getTrades: savedTrades,
    getApiKey: () => TEST_API_KEY,
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({ error: 'private provider traceback' }) }),
  });

  const { response, body } = await postChat(baseUrl, { prompt: 'Summarize my journal.' });
  assert.equal(response.status, 502);
  assert.match(body.error, /HTTP 500/);
  assert.doesNotMatch(body.error, /private provider traceback/);
});

test('unsupported model errors explain how to change NVIDIA_MODEL', async (t) => {
  const baseUrl = await startApi(t, {
    getTrades: savedTrades,
    getApiKey: () => TEST_API_KEY,
    getModel: () => 'account/unavailable-model',
    fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({ error: 'model not found' }) }),
  });

  const { response, body } = await postChat(baseUrl, { prompt: 'Summarize my journal.' });
  assert.equal(response.status, 502);
  assert.match(body.error, /NVIDIA_MODEL \(account\/unavailable-model\)/);
  assert.match(body.error, /enabled for your account/);
});

test('timeouts and oversized prompts fail clearly before changing any journal data', async (t) => {
  let providerCalls = 0;
  const baseUrl = await startApi(t, {
    getTrades: savedTrades,
    getApiKey: () => TEST_API_KEY,
    timeoutMs: 15,
    fetchImpl: async (_url, { signal }) => {
      providerCalls += 1;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      });
    },
  });

  const tooLong = await postChat(baseUrl, { prompt: 'x'.repeat(1201) });
  assert.equal(tooLong.response.status, 400);
  assert.match(tooLong.body.error, /under 1200 characters/);
  assert.equal(providerCalls, 0);

  const oversizedBody = await fetch(`${baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: `{"prompt":"${'x'.repeat(17_000)}"}`,
  });
  assert.equal(oversizedBody.status, 413);
  assert.match((await oversizedBody.json()).error, /request is too large/);
  assert.equal(providerCalls, 0);

  const timedOut = await postChat(baseUrl, { prompt: 'Summarize my journal.' });
  assert.equal(timedOut.response.status, 504);
  assert.match(timedOut.body.error, /took too long/);
  assert.equal(providerCalls, 1);
});

test('Ari enforces its own per-client rate limit', async (t) => {
  const baseUrl = await startApi(t, {
    getTrades: savedTrades,
    getApiKey: () => TEST_API_KEY,
    rateLimit: 1,
    fetchImpl: async () => okCompletion(),
  });

  const first = await postChat(baseUrl, { prompt: 'Summarize my journal.' });
  const second = await postChat(baseUrl, { prompt: 'Explain drawdown.' });
  assert.equal(first.response.status, 200);
  assert.equal(second.response.status, 429);
  assert.ok(Number(second.response.headers.get('Retry-After')) > 0);
  assert.match(second.body.error, /Ari allows 1 AI requests per minute/);
});
