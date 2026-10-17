/**
 * Ari Trading Journal assistant. NVIDIA credentials and provider calls remain
 * server-side; the model receives bounded, redacted journal context only.
 */
import { Router } from 'express';
import { calculatePerformanceSummary, computeTradeMetrics } from '../src/utils/calculations.js';

export const NVIDIA_CHAT_COMPLETIONS_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
export const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const PROMPT_LIMIT = 1200;
const CONTEXT_TRADE_LIMIT = 100;

function redact(value) {
  return String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email redacted]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[number redacted]')
    .slice(0, 1200);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildJournalAnalysisContext(trades = []) {
  const records = Array.isArray(trades) ? trades : [];
  const complete = records
    .filter(trade => trade?.recordStatus === 'complete')
    .map(computeTradeMetrics)
    .sort((a, b) => new Date(a.tradeDatetime || a.createdAt || 0) - new Date(b.tradeDatetime || b.createdAt || 0));
  const summary = calculatePerformanceSummary(complete);
  const dates = complete
    .map(trade => String(trade.tradeDatetime || trade.createdAt || '').slice(0, 10))
    .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();

  const strategies = new Map();
  for (const trade of complete) {
    const name = redact(trade.strategy || 'Unspecified');
    const items = strategies.get(name) || [];
    items.push(trade);
    strategies.set(name, items);
  }
  const strategyItems = [...strategies.entries()].map(([name, items]) => {
    const totals = calculatePerformanceSummary(items);
    return {
      strategy: name,
      tradeCount: totals.sampleSize,
      netPnL: totals.totalNetPnL,
      winRate: totals.winRate,
      expectancy: totals.expectancy,
      profitFactor: totals.profitFactor,
      averageRealisedR: totals.averageRealisedR,
    };
  });

  const contextTrades = complete.slice(-CONTEXT_TRADE_LIMIT);
  const journalEntries = contextTrades.map(trade => ({
    date: String(trade.tradeDatetime || trade.createdAt || '').slice(0, 10) || null,
    market: redact(trade.market || ''),
    strategy: redact(trade.strategy || ''),
    direction: redact(trade.direction || ''),
    outcome: trade.outcome || 'unknown',
    netPnL: numberOrNull(trade.netPnL),
    realisedR: numberOrNull(trade.realisedR),
    ruleCompliant: trade.ruleCompliant || 'unknown',
    emotions: (Array.isArray(trade.emotionTags) ? trade.emotionTags : []).slice(0, 8).map(redact),
    impulsive: Boolean(trade.isImpulsive),
    revenge: Boolean(trade.isRevenge),
    notes: [trade.entryReason, trade.exitReason, trade.managementNotes, trade.lesson]
      .filter(Boolean).map(redact).join(' | ').slice(0, 900),
  }));

  return {
    scope: {
      completeTradeCount: complete.length,
      dateRange: dates.length ? { from: dates[0], to: dates.at(-1) } : null,
      journalEntriesReviewed: journalEntries.length,
      journalEntryLimit: CONTEXT_TRADE_LIMIT,
      draftsExcluded: records.filter(trade => trade?.recordStatus === 'draft').length,
      excludedRecordsNotUsed: records.filter(trade => trade?.recordStatus === 'excluded').length,
    },
    calculatedStats: {
      netPnL: summary.totalNetPnL,
      winCount: summary.winCount,
      lossCount: summary.lossCount,
      winRate: summary.winRate,
      expectancy: summary.expectancy,
      expectancyR: summary.expectancyR,
      profitFactor: summary.profitFactor,
      profitFactorReason: summary.profitFactorReason,
      maxDrawdownAmount: summary.maxDrawdownAmount,
      maxDrawdownPercent: summary.maxDrawdownPercent,
      averageRealisedR: summary.averageRealisedR,
      complianceRate: summary.complianceRate,
      wins: summary.winCount,
      losses: summary.lossCount,
      breakeven: summary.breakevenCount,
    },
    strategyComparisons: { items: strategyItems },
    recordedMistakeFlags: {
      impulsiveEntries: complete.filter(trade => trade.isImpulsive).length,
      revengeEntries: complete.filter(trade => trade.isRevenge).length,
      ruleViolations: complete.filter(trade => ['no', 'partial'].includes(String(trade.ruleCompliant || '').toLowerCase())).length,
    },
    journalEntries,
  };
}

function allowRequest(rateLimits, ip, maxRequests) {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
    return { allowed: true };
  }
  if (entry.count >= maxRequests) return { allowed: false, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  entry.count += 1;
  return { allowed: true };
}

const SYSTEM_PROMPT = `You are Ari's trading-journal analysis assistant. Use only the saved-journal context and the user's question. Calculated statistics are authoritative and must be described separately from your interpretations. Always state how many completed trades and which date range were used. State limitations when the sample is small or data is missing. Do not invent trades, statistics, prices, or conclusions. You may explain performance metrics in plain language, identify recorded patterns in mistakes, notes, emotions, rules, and compare recorded strategies. Offer questions the trader could investigate. This is informational journal analysis, not guaranteed financial advice; never promise profits or certainty. You cannot modify the journal, place orders, or execute transactions.`;

export function createAiAssistantRouter(options = {}) {
  const router = Router();
  const getTrades = options.getTrades || (() => []);
  const getApiKey = options.getApiKey || (() => process.env.NVIDIA_API_KEY || '');
  const getModel = options.getModel || (() => process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = options.timeoutMs || Math.max(1000, Number(process.env.NVIDIA_TIMEOUT_SECONDS || 30) * 1000);
  const rateLimit = options.rateLimit || 10;
  const rateLimits = new Map();

  router.get('/status', (_req, res) => res.json({
    configured: Boolean(getApiKey()),
    model: getModel(),
    message: getApiKey() ? 'NVIDIA assistant is configured.' : 'Set NVIDIA_API_KEY in the server .env file, then restart the server.',
  }));

  router.post('/chat', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) return res.status(400).json({ error: 'Enter a question about your trading journal.' });
    if (prompt.length > PROMPT_LIMIT) return res.status(400).json({ error: `Keep your question under ${PROMPT_LIMIT} characters.` });

    const limited = allowRequest(rateLimits, req.ip || req.socket?.remoteAddress || 'unknown', rateLimit);
    if (!limited.allowed) {
      res.setHeader('Retry-After', String(limited.retryAfter));
      return res.status(429).json({ error: `Ari allows ${rateLimit} AI requests per minute. Please retry shortly.` });
    }

    let context;
    try { context = buildJournalAnalysisContext(getTrades()); }
    catch { return res.status(500).json({ error: 'Could not read journal records for analysis. Your saved trades were not changed.' }); }

    if (context.scope.completeTradeCount === 0) {
      return res.json({
        answer: 'There are no verified complete trades in the saved journal yet, so I cannot calculate or interpret trading performance. Add completed trades to enable journal analysis.',
        provider: 'local-empty-journal',
        scope: context.scope,
        calculatedStats: context.calculatedStats,
      });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(503).json({ error: 'AI is not configured yet. Add NVIDIA_API_KEY to the server-side .env file and restart the server. The journal remains available without AI.' });
    }

    const model = getModel();
    const history = Array.isArray(req.body?.conversationHistory)
      ? req.body.conversationHistory.slice(-6)
        .filter(item => ['user', 'assistant'].includes(item?.role) && typeof item?.content === 'string')
        .map(item => ({ role: item.role, content: redact(item.content).slice(0, 900) }))
      : [];
    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nSaved Ari journal context (JSON):\n${JSON.stringify(context)}` },
      ...history,
      { role: 'user', content: redact(prompt) },
    ];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(NVIDIA_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model, messages, stream: false, max_tokens: 1200,
          temperature: 0.5, top_p: 0.95, reasoning_budget: 512,
        }),
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return res.status(502).json({ error: 'NVIDIA rejected the server credentials. Check that NVIDIA_API_KEY is valid and enabled.' });
        }
        if (response.status === 429) {
          res.setHeader('Retry-After', response.headers?.get?.('retry-after') || '30');
          return res.status(429).json({ error: 'NVIDIA is rate-limiting requests. Wait a moment and retry.' });
        }
        if (response.status === 404) {
          return res.status(502).json({ error: `NVIDIA could not find NVIDIA_MODEL (${model}). Configure a model enabled for your account.` });
        }
        return res.status(502).json({ error: `NVIDIA assistant request failed (HTTP ${response.status}). Please retry.` });
      }
      const data = await response.json();
      const answer = data?.choices?.[0]?.message?.content;
      if (typeof answer !== 'string' || !answer.trim()) return res.status(502).json({ error: 'NVIDIA returned an empty answer. Please retry.' });
      return res.json({ answer: answer.trim(), provider: 'nvidia', model, scope: context.scope, calculatedStats: context.calculatedStats });
    } catch (error) {
      if (error?.name === 'AbortError') return res.status(504).json({ error: 'The AI request took too long. Please retry.' });
      return res.status(502).json({ error: 'Could not reach NVIDIA. Check the server connection and retry.' });
    } finally {
      clearTimeout(timeout);
    }
  });
  return router;
}
