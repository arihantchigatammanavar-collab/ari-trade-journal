import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Clock,
  DollarSign,
  Maximize2,
  FileText,
  Brain,
  Edit3,
  Trash2,
  Ban
} from 'lucide-react';
import { formatCurrency, formatR } from '../utils/calculations.js';

export default function TradeDetailModal({
  trade,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onExclude
}) {
  const [zoomedImage, setZoomedImage] = useState(null);

  if (!isOpen || !trade) return null;

  const isWin = trade.outcome === 'win';
  const isLoss = trade.outcome === 'loss';

  const isLong = String(trade.direction).toLowerCase() === 'long';

  const getComplianceBadge = () => {
    const val = String(trade.ruleCompliant).toLowerCase();
    if (val === 'yes') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" />
          Rule Compliant
        </span>
      );
    }
    if (val === 'no') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80 text-xs font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" />
          Rule Violation
        </span>
      );
    }
    if (val === 'partial') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 text-xs font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" />
          Partial Compliance
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
        <HelpCircle className="h-3.5 w-3.5" />
        Unknown Compliance
      </span>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl glass-panel border border-slate-200/90 shadow-2xl overflow-hidden my-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between bg-white/70">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-blue-600 px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200/80">
                {trade.id}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">{trade.market}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-lg font-mono font-bold uppercase ${
                    isLong
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                      : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                  }`}
                >
                  {trade.direction}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  {trade.tradeType}
                </span>
                {trade.recordStatus === 'draft' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                    Draft
                  </span>
                )}
                {trade.recordStatus === 'excluded' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                    Excluded
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onEdit(trade)}
                className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Edit Trade"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              {trade.recordStatus !== 'excluded' && (
                <button
                  onClick={() => onExclude(trade)}
                  className="p-2 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Exclude from Stats"
                >
                  <Ban className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => onDelete(trade.id)}
                className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Delete Trade"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Exclusion Notice if applicable */}
            {trade.recordStatus === 'excluded' && (
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-3">
                <Ban className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-purple-900">Excluded Record Notice</h4>
                  <p className="text-xs text-purple-700 mt-0.5">
                    {trade.exclusionReason || 'Excluded from headline calculations by user.'}
                  </p>
                </div>
              </div>
            )}

            {/* Headline Outcomes Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl glass-card border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Net P&L (After Costs)</span>
                <span
                  className={`text-xl font-bold font-mono ${
                    isWin ? 'text-emerald-600' : isLoss ? 'text-rose-600' : 'text-slate-700'
                  }`}
                >
                  {formatCurrency(trade.netPnL)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Gross: {formatCurrency(trade.grossPnL)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl glass-card border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Realised R-Multiple</span>
                <span
                  className={`text-xl font-bold font-mono ${
                    trade.realisedR > 0 ? 'text-emerald-600' : trade.realisedR < 0 ? 'text-rose-600' : 'text-slate-700'
                  }`}
                >
                  {formatR(trade.realisedR)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {trade.realisedRReason ? trade.realisedRReason : `Risk: ${formatCurrency(trade.plannedRisk)}`}
                </span>
              </div>

              <div className="p-3.5 rounded-xl glass-card border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Strategy & Rules</span>
                <div className="truncate text-xs font-semibold text-slate-900">
                  {trade.strategy} <span className="text-blue-600 font-mono text-[11px]">{trade.strategyVersion}</span>
                </div>
                <div className="mt-1">{getComplianceBadge()}</div>
              </div>

              <div className="p-3.5 rounded-xl glass-card border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Execution Time</span>
                <span className="text-xs font-mono font-semibold text-slate-800 block">
                  {trade.tradeDatetime ? new Date(trade.tradeDatetime).toLocaleString() : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Session: {trade.session || 'Unspecified'} ({trade.timezone || 'UTC+0'})
                </span>
              </div>
            </div>

            {/* Plan vs Actual Execution Matrix */}
            <div className="rounded-xl glass-card border border-slate-200/80 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Execution Audit & Price Levels
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Entry Price</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {trade.entryPrice ? Number(trade.entryPrice).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Exit Price</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {trade.exitPrice ? Number(trade.exitPrice).toLocaleString() : 'Pending Fill (Draft)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Stop-Loss Level</span>
                  <span className="font-mono font-semibold text-rose-600">
                    {trade.stopLoss ? Number(trade.stopLoss).toLocaleString() : 'Unset'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Take-Profit Target</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {trade.takeProfit ? Number(trade.takeProfit).toLocaleString() : 'Discretionary'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200/70 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Position Size</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {trade.quantity} {trade.positionSizeUnit || 'Units'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Planned Monetary Risk</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {trade.plannedRisk ? formatCurrency(trade.plannedRisk) : 'Unrecorded'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Planned R:R</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {trade.plannedRR ? `1:${trade.plannedRR}` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fees & Costs</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {trade.feesUnknown ? (
                      <span className="text-amber-600 font-semibold">Unknown Fees</span>
                    ) : (
                      formatCurrency((Number(trade.fees) || 0) + (Number(trade.otherCosts) || 0))
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Screenshots Side-by-Side Comparison */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Chart Evidence & Verification
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before Entry */}
                <div className="rounded-xl glass-card border border-slate-200/80 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-700">Before-Entry Chart</span>
                    <span className="text-[10px] text-slate-500">Pre-execution thesis</span>
                  </div>

                  {trade.beforeScreenshot ? (
                    <div
                      onClick={() => setZoomedImage(trade.beforeScreenshot)}
                      className="relative h-48 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group shadow-2xs"
                    >
                      <img
                        src={trade.beforeScreenshot}
                        alt="Before Entry Chart"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Maximize2 className="h-6 w-6" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500 bg-slate-50/50">
                      No before-entry screenshot attached
                    </div>
                  )}

                  {trade.beforeScreenshotCaption && (
                    <p className="text-[11px] text-slate-600 italic">
                      "{trade.beforeScreenshotCaption}"
                    </p>
                  )}
                </div>

                {/* After Exit */}
                <div className="rounded-xl glass-card border border-slate-200/80 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-700">After-Exit Chart</span>
                    <span className="text-[10px] text-slate-500">Post-trade resolution</span>
                  </div>

                  {trade.afterScreenshot ? (
                    <div
                      onClick={() => setZoomedImage(trade.afterScreenshot)}
                      className="relative h-48 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group shadow-2xs"
                    >
                      <img
                        src={trade.afterScreenshot}
                        alt="After Exit Chart"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Maximize2 className="h-6 w-6" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500 bg-slate-50/50">
                      No after-exit screenshot attached
                    </div>
                  )}

                  {trade.afterScreenshotCaption && (
                    <p className="text-[11px] text-slate-600 italic">
                      "{trade.afterScreenshotCaption}"
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Psychology & Behavioral Notes */}
            <div className="rounded-xl glass-card border border-slate-200/80 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                Psychology & Behavioral Audit
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">Emotion State at Entry</span>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.emotionTags && trade.emotionTags.length > 0 ? (
                      trade.emotionTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-medium"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">None recorded</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Discipline & Bias Flags</span>
                  <div className="flex items-center gap-2">
                    {trade.isImpulsive && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                        Impulsive Entry
                      </span>
                    )}
                    {trade.isRevenge && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-red-100 text-red-800 border border-red-300 font-bold">
                        Revenge Urge Present
                      </span>
                    )}
                    {!trade.isImpulsive && !trade.isRevenge && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                        No Emotional Impulsivity Detected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Qualitative Observations */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200/70 text-xs">
                {trade.entryReason && (
                  <div>
                    <span className="text-slate-600 font-semibold block mb-0.5">Entry Thesis:</span>
                    <p className="text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      {trade.entryReason}
                    </p>
                  </div>
                )}

                {trade.exitReason && (
                  <div>
                    <span className="text-slate-600 font-semibold block mb-0.5">Exit Context:</span>
                    <p className="text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      {trade.exitReason}
                    </p>
                  </div>
                )}

                {trade.lesson && (
                  <div>
                    <span className="text-amber-700 font-semibold block mb-0.5">One Specific Lesson Learned:</span>
                    <p className="text-amber-900 leading-relaxed bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 font-medium">
                      {trade.lesson}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Zoom Overlay */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={zoomedImage}
              alt="High Resolution Screenshot"
              className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
