import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend, // 'positive' | 'negative' | 'neutral' | 'accent'
  tooltip,
  tag,
  className = ''
}) {
  const getTrendColor = () => {
    switch (trend) {
      case 'positive':
        return 'text-emerald-600';
      case 'negative':
        return 'text-rose-600';
      case 'accent':
        return 'text-blue-600';
      default:
        return 'text-slate-900';
    }
  };

  const getBadgeStyle = () => {
    switch (trend) {
      case 'positive':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'negative':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      case 'accent':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className={`metric-card relative p-4 sm:p-5 rounded-2xl glass-card glass-card-hover flex flex-col justify-between overflow-hidden group ${className}`}
    >
      {/* Top row: Title, Icon, Tag, Tooltip */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <span>{title}</span>
          {tooltip && (
            <div className="relative group/tip cursor-help">
              <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tip:block w-48 p-2 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 shadow-xl z-50 pointer-events-none leading-relaxed">
                {tooltip}
              </div>
            </div>
          )}
        </div>

        {Icon && (
          <div className="metric-card-icon h-8 w-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors shadow-2xs">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Primary Value */}
      <div className="flex items-baseline gap-2 my-1">
        <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${getTrendColor()}`}>
          {value}
        </span>
        {tag && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold border ${getBadgeStyle()}`}>
            {tag}
          </span>
        )}
      </div>

      {/* Subtitle / Context Breakdown */}
      {subtitle && (
        <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between font-medium">
          <span>{subtitle}</span>
        </div>
      )}

      {/* Subtle top edge border glow on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/50 transition-all duration-300" />
    </div>
  );
}
