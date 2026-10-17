import React, { useState } from 'react';
import {
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  History,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Save,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { formatCurrency, formatR } from '../utils/calculations.js';

export default function ReviewsPage({
  trades = [],
  savedReviews = [],
  onSaveReview
}) {
  const [activeTab, setActiveTab] = useState('10-trade'); // '10-trade' | '100-trade' | 'history'

  const completeTrades = trades.filter(t => t.recordStatus === 'complete');
  const sortedTrades = [...completeTrades].sort(
    (a, b) => new Date(b.tradeDatetime || b.createdAt) - new Date(a.tradeDatetime || a.createdAt)
  );

  // 10-Trade Sample
  const last10Trades = sortedTrades.slice(0, 10);
  const sample10Size = last10Trades.length;
  const net10 = last10Trades.reduce((acc, t) => acc + (Number(t.netPnL) || 0), 0);
  const wins10 = last10Trades.filter(t => t.outcome === 'win').length;
  const compliant10 = last10Trades.filter(t => t.ruleCompliant === 'yes').length;

  // 10-Trade Form
  const [review10, setReview10] = useState({
    followedRiskRules: true,
    executedWithoutFOMO: true,
    exitsDisciplined: true,
    findings: '',
    actionItem: '',
  });

  // 100-Trade Form
  const [review100, setReview100] = useState({
    marketRegimeNotes: '',
    robustnessAssessment: '',
    actionCommitments: '',
  });

  const handleSave10Review = (e) => {
    e.preventDefault();
    if (!review10.findings.trim() || !review10.actionItem.trim()) {
      alert('Please fill out the key findings and next action commitment.');
      return;
    }

    const payload = {
      type: '10-Trade Review',
      sampleSize: sample10Size,
      netPnL: net10,
      winRate: sample10Size > 0 ? ((wins10 / sample10Size) * 100).toFixed(1) : 0,
      complianceRate: sample10Size > 0 ? ((compliant10 / sample10Size) * 100).toFixed(1) : 0,
      checklist: {
        followedRiskRules: review10.followedRiskRules,
        executedWithoutFOMO: review10.executedWithoutFOMO,
        exitsDisciplined: review10.exitsDisciplined,
      },
      findings: review10.findings,
      actionItem: review10.actionItem,
      tradeIds: last10Trades.map(t => t.id),
      reviewDate: new Date().toISOString(),
    };

    onSaveReview(payload);
    setReview10({ followedRiskRules: true, executedWithoutFOMO: true, exitsDisciplined: true, findings: '', actionItem: '' });
    setActiveTab('history');
  };

  const handleSave100Review = (e) => {
    e.preventDefault();
    if (!review100.robustnessAssessment.trim() || !review100.actionCommitments.trim()) {
      alert('Please complete the robustness assessment and action commitments.');
      return;
    }

    const payload = {
      type: '100-Trade Milestone Audit',
      sampleSize: completeTrades.length,
      netPnL: completeTrades.reduce((acc, t) => acc + (Number(t.netPnL) || 0), 0),
      winRate: completeTrades.length > 0 ? ((completeTrades.filter(t => t.outcome === 'win').length / completeTrades.length) * 100).toFixed(1) : 0,
      marketRegimeNotes: review100.marketRegimeNotes,
      findings: review100.robustnessAssessment,
      actionItem: review100.actionCommitments,
      reviewDate: new Date().toISOString(),
    };

    onSaveReview(payload);
    setReview100({ marketRegimeNotes: '', robustnessAssessment: '', actionCommitments: '' });
    setActiveTab('history');
  };

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-panel max-w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('10-trade')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === '10-trade'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          10-Trade Review
        </button>

        <button
          onClick={() => setActiveTab('100-trade')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === '100-trade'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          100-Trade Milestone Audit
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Audit Log ({savedReviews.length})</span>
        </button>
      </div>

      {/* 10-TRADE REVIEW TAB */}
      {activeTab === '10-trade' && (
        <div className="space-y-6">
          {/* Sample Metrics Overview */}
          <div className="p-5 rounded-2xl glass-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-blue-600" />
                  10-Trade Micro Audit Workflow
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reviewing the last 10 completed trades to diagnose behavioral patterns
                </p>
              </div>

              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                Sample: {sample10Size} / 10 Trades
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="text-slate-500 block text-[10px] font-sans">Batch Net P&L</span>
                <span className={`text-lg font-bold ${net10 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(net10)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="text-slate-500 block text-[10px] font-sans">Batch Win Rate</span>
                <span className="text-lg font-bold text-slate-800">
                  {sample10Size > 0 ? ((wins10 / sample10Size) * 100).toFixed(0) : 0}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="text-slate-500 block text-[10px] font-sans">Rule Discipline Rate</span>
                <span className={`text-lg font-bold ${compliant10 >= 8 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {sample10Size > 0 ? ((compliant10 / sample10Size) * 100).toFixed(0) : 0}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="text-slate-500 block text-[10px] font-sans">Batch IDs</span>
                <span className="text-xs text-slate-600 truncate block mt-1">
                  {last10Trades.map(t => t.id).join(', ') || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave10Review} className="p-5 rounded-2xl glass-card space-y-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Qualitative Execution Checklist
            </h4>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 cursor-pointer hover:bg-blue-50/40 transition">
                <input
                  type="checkbox"
                  checked={review10.followedRiskRules}
                  onChange={(e) => setReview10(p => ({ ...p, followedRiskRules: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0 h-4 w-4"
                />
                <span className="text-xs text-slate-700">
                  Did I strictly respect position sizing and avoid moving stop losses during this batch?
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 cursor-pointer hover:bg-blue-50/40 transition">
                <input
                  type="checkbox"
                  checked={review10.executedWithoutFOMO}
                  onChange={(e) => setReview10(p => ({ ...p, executedWithoutFOMO: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0 h-4 w-4"
                />
                <span className="text-xs text-slate-700">
                  Did I execute entries calmly without chasing extended green/red candles or entering out of FOMO?
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 cursor-pointer hover:bg-blue-50/40 transition">
                <input
                  type="checkbox"
                  checked={review10.exitsDisciplined}
                  onChange={(e) => setReview10(p => ({ ...p, exitsDisciplined: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0 h-4 w-4"
                />
                <span className="text-xs text-slate-700">
                  Did I allow winning trades to reach their planned take-profit without panic-exiting from fear?
                </span>
              </label>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Findings & Psychological Observations <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="What patterns stood out during these 10 trades? (e.g. Tendency to cut Gold trades too quickly during London session open)"
                  value={review10.findings}
                  onChange={(e) => setReview10(p => ({ ...p, findings: e.target.value }))}
                  className="w-full glass-input text-xs p-3 rounded-xl text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  Single Actionable Commitment for the Next 10 Trades <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Set limit order and step away from the screen for 30 minutes after entry."
                  value={review10.actionItem}
                  onChange={(e) => setReview10(p => ({ ...p, actionItem: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2.5 rounded-xl border-amber-300 bg-amber-50/30 text-amber-950 font-medium"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Save 10-Trade Review</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 100-TRADE MILESTONE AUDIT TAB */}
      {activeTab === '100-trade' && (
        <div className="space-y-6">
          <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-amber-300/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Blueprint North Star: Statistical Caution
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              "A 100-trade review is useful, but it does not prove a lasting edge. Results are affected by market regime, costs, selection bias, execution and chance. Test rules on data not used to invent them, and review across different conditions."
            </p>
          </div>

          <form onSubmit={handleSave100Review} className="p-5 rounded-2xl glass-card space-y-5">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              100-Trade Sample Robustness Audit
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Market Regime & Macro Climate Observed
                </label>
                <textarea
                  rows={2}
                  placeholder="Were these trades taken in a high-volatility trending regime, a range-bound summer chop, or across multiple regimes?"
                  value={review100.marketRegimeNotes}
                  onChange={(e) => setReview100(p => ({ ...p, marketRegimeNotes: e.target.value }))}
                  className="w-full glass-input text-xs p-3 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Strategy Robustness & Edge Assessment <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="How did the strategy hold up after fees and execution slippage? Did Bitcoin or Gold demonstrate clearer follow-through?"
                  value={review100.robustnessAssessment}
                  onChange={(e) => setReview100(p => ({ ...p, robustnessAssessment: e.target.value }))}
                  className="w-full glass-input text-xs p-3 rounded-xl text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1">
                  Long-Term Action Commitments & Rule Refinements <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="What written rule adjustments will be made for the next versioned strategy rollout?"
                  value={review100.actionCommitments}
                  onChange={(e) => setReview100(p => ({ ...p, actionCommitments: e.target.value }))}
                  className="w-full glass-input text-xs p-3 rounded-xl text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Save 100-Trade Milestone Audit</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SAVED AUDIT LOG TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="rounded-2xl glass-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <History className="h-4 w-4 text-blue-600" />
                  Historical Review Audit Trail
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Saved periodic reviews and behavioral commitments
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {savedReviews.length > 0 ? (
                savedReviews.map((rev) => (
                  <div key={rev.id} className="p-5 space-y-3 hover:bg-blue-50/20 transition">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{rev.type}</span>
                        <span className="font-mono text-blue-600 text-[11px] px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                          {rev.id}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(rev.reviewDate || rev.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/80">
                        <span className="text-slate-500 text-[10px] block font-sans">Sample Size</span>
                        <span className="text-slate-800 font-bold">{rev.sampleSize} trades</span>
                      </div>
                      {rev.netPnL !== undefined && (
                        <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/80">
                          <span className="text-slate-500 text-[10px] block font-sans">Period Net P&L</span>
                          <span className={`font-bold ${rev.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(rev.netPnL)}
                          </span>
                        </div>
                      )}
                      {rev.complianceRate !== undefined && (
                        <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/80">
                          <span className="text-slate-500 text-[10px] block font-sans">Discipline Score</span>
                          <span className="text-blue-600 font-bold">{rev.complianceRate}%</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-700 font-semibold block">Key Findings:</span>
                        <p className="text-slate-700 mt-0.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed">
                          {rev.findings}
                        </p>
                      </div>

                      <div>
                        <span className="text-amber-800 font-semibold block">Action Commitment:</span>
                        <p className="text-amber-950 mt-0.5 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 font-medium leading-relaxed">
                          {rev.actionItem}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No historical reviews recorded yet. Complete a 10-trade review above to start your audit trail!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
