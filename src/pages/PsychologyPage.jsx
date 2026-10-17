import React, { useState } from 'react';
import {
  Brain,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Coins,
  TrendingDown,
  TrendingUp,
  Search,
  Filter
} from 'lucide-react';
import { formatCurrency, formatR } from '../utils/calculations.js';

export default function PsychologyPage({ trades = [] }) {
  const completeTrades = trades.filter(t => t.recordStatus === 'complete');
  const [lessonSearch, setLessonSearch] = useState('');

  // Emotion breakdown
  const emotionCounts = {};
  let totalImpulsive = 0;
  let totalRevenge = 0;
  let compliantNet = 0;
  let violatingNet = 0;

  completeTrades.forEach(t => {
    (t.emotionTags || []).forEach(e => {
      emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    });

    if (t.isImpulsive) totalImpulsive++;
    if (t.isRevenge) totalRevenge++;

    if (t.ruleCompliant === 'yes') {
      compliantNet += Number(t.netPnL) || 0;
    } else {
      violatingNet += Number(t.netPnL) || 0;
    }
  });

  // Filter lessons
  const tradesWithLessons = completeTrades.filter(t => t.lesson && t.lesson.trim() !== '');
  const filteredLessons = tradesWithLessons.filter(t => {
    if (!lessonSearch.trim()) return true;
    const q = lessonSearch.toLowerCase();
    return (
      (t.lesson || '').toLowerCase().includes(q) ||
      (t.market || '').toLowerCase().includes(q) ||
      (t.strategy || '').toLowerCase().includes(q) ||
      (t.id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              Behavioral & Emotional Discipline Analytics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Noticing decision patterns objectively without judgment to eliminate recurring leaks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-600">
          <span className="px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
            {tradesWithLessons.length} Recorded Lessons
          </span>
        </div>
      </div>

      {/* Behavioral Cost Audit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliant Trades Net */}
        <div className="p-5 rounded-2xl glass-card border border-emerald-200/80 bg-emerald-50/20 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Disciplined Execution Net</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {formatCurrency(compliantNet)}
          </div>
          <p className="text-[11px] text-slate-500">
            Accumulated on 100% rule-compliant trades
          </p>
        </div>

        {/* Violating Trades Net */}
        <div className="p-5 rounded-2xl glass-card border border-rose-200/80 bg-rose-50/20 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cost of Undiscipline</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">
            {formatCurrency(violatingNet)}
          </div>
          <p className="text-[11px] text-slate-500">
            Net outcome on rule-violating & partial trades
          </p>
        </div>

        {/* Impulsive Entries */}
        <div className="p-5 rounded-2xl glass-card border border-amber-200/80 bg-amber-50/20 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Impulsive / FOMO Entries</span>
            <Flame className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">
            {totalImpulsive} <span className="text-xs text-slate-500 font-normal">trades</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Entries taken without planned setup confirmation
          </p>
        </div>

        {/* Revenge Trading Urges */}
        <div className="p-5 rounded-2xl glass-card border border-rose-200/80 bg-rose-50/20 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Revenge Urges Recorded</span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">
            {totalRevenge} <span className="text-xs text-slate-500 font-normal">trades</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Trades entered in attempt to recover past loss
          </p>
        </div>
      </div>

      {/* Emotion Frequency Distribution */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-600" />
          Emotion Frequency at Execution
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(emotionCounts).map(([emotion, count]) => {
            const pct = completeTrades.length > 0 ? ((count / completeTrades.length) * 100).toFixed(0) : 0;
            const isCalm = emotion === 'Calm';
            return (
              <div
                key={emotion}
                className={`p-3.5 rounded-xl border space-y-1.5 ${
                  isCalm
                    ? 'bg-blue-50/80 border-blue-200/80 text-blue-700'
                    : 'bg-slate-50/80 border-slate-200/80 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{emotion}</span>
                  <span className="font-mono text-[11px] opacity-75">{count} trades</span>
                </div>
                <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isCalm ? 'bg-blue-600' : 'bg-purple-600'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-right font-mono">
                  {pct}% of executions
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Searchable Wisdom Journal / Lessons Learned */}
      <div className="rounded-2xl glass-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              Empirical Wisdom & Lessons Learned
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific behavioral adjustments extracted from historical trades
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search lessons..."
              value={lessonSearch}
              onChange={(e) => setLessonSearch(e.target.value)}
              className="w-full glass-input text-xs pl-8 pr-3 py-1.5 rounded-xl text-slate-800"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredLessons.length > 0 ? (
            filteredLessons.map((trade) => {
              const isWin = trade.outcome === 'win';
              return (
                <div key={trade.id} className="p-4 sm:p-5 hover:bg-blue-50/20 transition space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-blue-600 font-bold">{trade.id}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-800 font-semibold">{trade.market}</span>
                      <span className="text-slate-500">({trade.direction})</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{trade.strategy}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className={isWin ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {formatCurrency(trade.netPnL)} ({formatR(trade.realisedR)})
                      </span>
                      {trade.ruleCompliant === 'yes' ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          Compliant
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          Violated
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 leading-relaxed font-medium">
                    "{trade.lesson}"
                  </div>

                  {trade.entryReason && (
                    <p className="text-[11px] text-slate-500 italic">
                      Context: {trade.entryReason}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No lessons found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
