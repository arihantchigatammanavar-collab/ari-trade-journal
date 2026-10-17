import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BadgeCheck, BarChart3, CircleDollarSign, Gauge, ShieldCheck, Target, TrendingDown, TrendingUp } from 'lucide-react';
import MetricCard from '../components/MetricCard.jsx';
import { formatCurrency } from '../utils/calculations.js';

const GlassPanel = ({ children, className = '' }) => <section className={`rounded-2xl border border-slate-200/80 bg-white/85 shadow-[0_8px_28px_rgba(15,23,42,0.045)] backdrop-blur-xl ${className}`}>{children}</section>;

export default function AriDashboardPage({ summary, filteredTrades = [], filters, setFilters, onOpenTradeDetail, onOpenAddTrade }) {
  const cards = [
    { title: 'Net P&L', value: formatCurrency(summary.totalNetPnL), subtitle: 'Completed trades', icon: CircleDollarSign, trend: summary.totalNetPnL > 0 ? 'positive' : summary.totalNetPnL < 0 ? 'negative' : 'neutral' },
    { title: 'Verified trades', value: summary.sampleSize, subtitle: `${summary.draftCount} drafts · ${summary.excludedCount} excluded`, icon: BadgeCheck, trend: 'accent' },
    { title: 'Win rate', value: `${summary.winRate}%`, subtitle: `${summary.winCount} wins · ${summary.lossCount} losses`, icon: Target, trend: 'neutral' },
    { title: 'Average realised R', value: `${summary.averageRealisedR}R`, subtitle: 'Across trades with valid risk', icon: Activity, trend: summary.averageRealisedR > 0 ? 'positive' : summary.averageRealisedR < 0 ? 'negative' : 'neutral' },
    { title: 'Expectancy', value: formatCurrency(summary.expectancy), subtitle: 'Average net P&L per verified trade', icon: TrendingUp, trend: summary.expectancy > 0 ? 'positive' : summary.expectancy < 0 ? 'negative' : 'neutral' },
    { title: 'Profit factor', value: summary.profitFactor, subtitle: summary.profitFactorReason || 'Gross wins ÷ gross losses', icon: Gauge, trend: 'accent' },
    { title: 'Max drawdown', value: `−${formatCurrency(summary.maxDrawdownAmount)}`, subtitle: `${summary.maxDrawdownPercent}% from peak`, icon: TrendingDown, trend: summary.maxDrawdownAmount > 0 ? 'negative' : 'neutral' },
    { title: 'Rule compliance', value: `${summary.complianceRate}%`, subtitle: 'Of trades with a recorded rule status', icon: ShieldCheck, trend: summary.complianceRate >= 80 ? 'positive' : 'neutral' },
  ];
  const recent = [...filteredTrades].sort((a, b) => new Date(b.tradeDatetime || b.createdAt) - new Date(a.tradeDatetime || a.createdAt)).slice(0, 5);
  const equity = summary.equityCurve || [];
  const resetFilters = () => setFilters({ market: 'ALL', strategy: 'ALL', tradeType: 'ALL', direction: 'ALL', outcome: 'ALL', ruleCompliant: 'ALL', recordStatus: 'ALL', startDate: '', endDate: '', search: '' });

  return <div className="space-y-6 pb-8">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Performance overview</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Your trading, at a glance</h2><p className="mt-1 text-sm text-slate-500">Calculated from saved journal records using the active filters.</p></div>{(filters.market !== 'ALL' || filters.strategy !== 'ALL' || filters.search || filters.startDate || filters.endDate) && <button onClick={resetFilters} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white">Clear filters</button>}</div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <MetricCard key={card.title} {...card} />)}</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
      <GlassPanel className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="font-semibold text-slate-900">Equity curve</h3><p className="mt-1 text-xs text-slate-500">Cumulative P&L across completed trades</p></div><div className="rounded-xl bg-blue-50 p-2 text-blue-600"><BarChart3 size={17} /></div></div>
        {equity.length > 1 ? <div className="h-[270px] w-full">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={equity} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <defs><linearGradient id="ariEquityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} /></linearGradient></defs>
            <CartesianGrid stroke="#e8edf4" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} width={58} tickFormatter={value => formatCurrency(value, '$', 0)} />
            <Tooltip formatter={value => [formatCurrency(value), 'Cumulative P&L']} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,.08)' }} />
            <Area type="monotone" dataKey="cumulativePnL" stroke="#3478e5" strokeWidth={2.4} fill="url(#ariEquityFill)" activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart></ResponsiveContainer>
        </div> : <div className="flex h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center"><BarChart3 size={25} className="text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">No completed trades in this view</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">Your equity curve will appear here once the journal contains verified trades.</p></div>}
      </GlassPanel>
      <GlassPanel className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold text-slate-900">Outcomes</h3><p className="mt-1 text-xs text-slate-500">Verified trades only</p></div><span className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">n = {summary.sampleSize}</span></div>
        {summary.sampleSize ? <div className="space-y-5">
          {[['Wins', summary.winCount, 'bg-emerald-500'], ['Losses', summary.lossCount, 'bg-rose-500'], ['Breakeven', summary.breakevenCount, 'bg-slate-400']].map(([label, count, color]) => <div key={label}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-600">{label}</span><span className="font-medium tabular-nums text-slate-800">{count} <span className="text-slate-400">({Math.round(count / summary.sampleSize * 100)}%)</span></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`${color} h-full rounded-full transition-all`} style={{ width: `${count / summary.sampleSize * 100}%` }} /></div></div>)}
          <div className="rounded-xl bg-blue-50/70 p-3"><p className="text-xs font-medium text-blue-900">Reading the sample</p><p className="mt-1 text-[11px] leading-relaxed text-blue-800/80">These outcomes describe the selected records. They do not predict future results.</p></div>
        </div> : <div className="py-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-300"><Target size={20} /></div><p className="mt-3 text-sm text-slate-500">No outcome data yet</p><button onClick={onOpenAddTrade} className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700">Record a trade</button></div>}
      </GlassPanel>
    </div>
    <GlassPanel className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-semibold text-slate-900">Recent journal activity</h3><p className="mt-1 text-xs text-slate-500">Latest records matching your current filters</p></div><button onClick={() => setFilters(previous => ({ ...previous, recordStatus: 'ALL' }))} className="text-xs font-semibold text-blue-600 hover:text-blue-700">View history</button></div>
      {recent.length ? <div className="divide-y divide-slate-100">{recent.map(trade => <button key={trade.id} onClick={() => onOpenTradeDetail(trade)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1.5fr)_minmax(100px,1fr)_minmax(80px,.7fr)_minmax(90px,.7fr)]"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{trade.market} <span className="text-xs font-normal text-slate-400">· {trade.direction}</span></p><p className="mt-0.5 truncate text-[11px] text-slate-500">{trade.strategy || 'Unspecified strategy'}</p></div><span className="hidden text-xs text-slate-500 sm:block">{trade.tradeDatetime ? new Date(trade.tradeDatetime).toLocaleDateString() : '—'}</span><span className={`hidden text-xs font-medium capitalize sm:block ${trade.outcome === 'win' ? 'text-emerald-600' : trade.outcome === 'loss' ? 'text-rose-600' : 'text-slate-500'}`}>{trade.recordStatus === 'complete' ? trade.outcome : trade.recordStatus}</span><span className={`text-right text-sm font-semibold tabular-nums ${Number(trade.netPnL) > 0 ? 'text-emerald-600' : Number(trade.netPnL) < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{trade.netPnL == null ? '—' : formatCurrency(trade.netPnL)}</span></button>)}</div> : <div className="flex flex-col items-center px-5 py-10 text-center"><p className="text-sm font-medium text-slate-600">Your saved trades will show up here.</p><button onClick={onOpenAddTrade} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">Add your first trade</button></div>}
    </GlassPanel>
  </div>;
}
