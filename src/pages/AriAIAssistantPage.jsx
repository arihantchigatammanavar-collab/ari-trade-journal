import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, Info, LoaderCircle, RefreshCw, Send, UserRound } from 'lucide-react';
import { api } from '../utils/api.js';
import { formatCurrency } from '../utils/calculations.js';

const suggestions = [
  'Summarize my recorded performance and its limitations.',
  'Explain expectancy and profit factor in plain English.',
  'What patterns appear in my recorded mistakes and lessons?',
  'Compare my saved strategies using the journal data.',
  'How does rule compliance relate to my recorded outcomes?',
  'What questions should I investigate next in my journal?',
];

function ScopeCard({ scope, stats }) {
  if (!scope) return null;
  const dateText = scope.dateRange ? `${scope.dateRange.from} to ${scope.dateRange.to}` : 'No dated completed trades';
  return <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-[11px]">
    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600"><span className="font-semibold">Calculated journal scope</span><span>{scope.completeTradeCount} completed trades · {dateText}</span></div>
    {scope.completeTradeCount > 0 && stats && <div className="mt-2 grid grid-cols-2 gap-2 text-slate-600 sm:grid-cols-4">
      <span>Win rate <b className="text-slate-800">{stats.winRate}%</b></span><span>Expectancy <b className="text-slate-800">{formatCurrency(stats.expectancy)}</b></span><span>Profit factor <b className="text-slate-800">{stats.profitFactor}</b></span><span>Max drawdown <b className="text-slate-800">{formatCurrency(stats.maxDrawdownAmount)}</b></span>
    </div>}
    {scope.journalEntriesReviewed < scope.completeTradeCount && <p className="mt-2 text-slate-500">AI received notes for the latest {scope.journalEntriesReviewed} of {scope.completeTradeCount} trades; the calculated totals use all completed trades.</p>}
    {scope.draftsExcluded > 0 || scope.excludedRecordsNotUsed > 0 ? <p className="mt-1 text-slate-500">Drafts excluded: {scope.draftsExcluded}. Explicitly excluded records not used: {scope.excludedRecordsNotUsed}.</p> : null}
  </div>;
}

export default function AriAIAssistantPage() {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'I can help you read your saved trading journal, explain its calculated metrics, and identify patterns worth investigating. My comments are informational and do not predict outcomes.' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const endRef = useRef(null);
  useEffect(() => { api.getAiStatus().then(setStatus).catch(() => setStatus({ configured: false, message: 'Could not reach the local Ari server. Start the server and retry.' })); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading]);

  const send = async (raw = input) => {
    const prompt = raw.trim();
    if (!prompt || loading) return;
    setInput(''); setError(''); setLastPrompt(prompt);
    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages(current => [...current, { role: 'user', content: prompt }]);
    setLoading(true);
    try {
      const result = await api.askJournalAI(prompt, history);
      setMessages(current => [...current, { role: 'assistant', content: result.answer, scope: result.scope, calculatedStats: result.calculatedStats, provider: result.provider }]);
    } catch (requestError) {
      setError(requestError.message || 'The assistant could not respond. Check your connection and retry.');
    } finally { setLoading(false); }
  };

  return <div className="mx-auto flex min-h-[calc(100vh-11rem)] max-w-4xl flex-col gap-4 pb-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Journal insights</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">AI trading assistant</h2><p className="mt-1 text-sm text-slate-500">Ask about patterns recorded in your trades, notes, and reviews.</p></div><button onClick={() => { setMessages([{ role: 'assistant', content: 'Chat cleared. Ask me about your saved journal.' }]); setError(''); }} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"><RefreshCw size={13} /> Clear chat</button></div>
    <div className="flex gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-relaxed text-blue-900/80"><Info size={15} className="mt-0.5 shrink-0 text-blue-600" /><p>Analysis is informational, not financial advice. Ari calculates statistics from saved completed trades and shows the data scope separately from AI interpretation. The assistant cannot edit trades or place orders.</p></div>
    {status && !status.configured && <div role="status" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><AlertCircle size={15} className="mt-0.5 shrink-0" /><p><b>NVIDIA AI setup needed.</b> {status.message || 'Set NVIDIA_API_KEY on the server and restart it.'} The assistant can still explain when the saved journal is empty.</p></div>}
    <section className="flex min-h-[380px] flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-[0_8px_28px_rgba(15,23,42,0.045)] backdrop-blur-xl sm:p-5">
      <div className="flex-1 space-y-4 overflow-y-auto pb-3" role="log" aria-live="polite" aria-label="AI trading assistant conversation">
        {messages.map((message, index) => <div key={index} className={`flex gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${message.role === 'user' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'}`}>{message.role === 'user' ? <UserRound size={15} /> : <Bot size={16} />}</span>
          <div className={`max-w-[88%] ${message.role === 'user' ? 'text-right' : 'min-w-0 flex-1'}`}><div className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-tr-md bg-blue-600 text-white' : 'rounded-tl-md border border-slate-200 bg-white text-slate-700'}`}>{message.content}</div>{message.role === 'assistant' && <ScopeCard scope={message.scope} stats={message.calculatedStats} />}</div>
        </div>)}
        {loading && <div className="flex items-center gap-2 pl-10 text-xs text-slate-500"><LoaderCircle size={15} className="animate-spin text-blue-600" /> Reviewing your saved journal…</div>}
        <div ref={endRef} />
      </div>
      {messages.length <= 1 && <div className="mb-3 flex flex-wrap gap-2">{suggestions.map(prompt => <button key={prompt} disabled={loading} onClick={() => send(prompt)} className="rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-left text-[11px] text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60">{prompt}</button>)}</div>}
      {error && <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"><AlertCircle size={14} className="mt-0.5 shrink-0" /><div className="flex-1">{error}</div><button onClick={() => send(lastPrompt)} disabled={loading || !lastPrompt} className="shrink-0 font-semibold underline underline-offset-2">Retry</button></div>}
      <form onSubmit={event => { event.preventDefault(); send(); }} className="flex items-end gap-2 border-t border-slate-100 pt-3"><textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Ask about your recorded trades…" rows={2} maxLength={1200} className="min-h-11 flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100" aria-label="Question about trading journal" /><button type="submit" disabled={!input.trim() || loading} className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} /><span className="hidden sm:inline">Ask Ari</span></button></form>
      <p className="mt-2 text-right text-[10px] text-slate-400">{input.length}/1200 characters</p>
    </section>
  </div>;
}
