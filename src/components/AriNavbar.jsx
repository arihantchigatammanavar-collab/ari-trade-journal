import React from 'react';
import { Menu, Plus, Download, Search, Wifi, WifiOff } from 'lucide-react';
import { DEFAULT_MARKETS } from '../data/defaultStrategies.js';

export default function AriNavbar({ pageTitle, pageSubtitle, backendStatus, filters, setFilters, strategies = [], sampleSize, excludedCount, onOpenAddTrade, onExportCsv, setMobileOpen }) {
  const update = (key, value) => setFilters(previous => ({ ...previous, [key]: value }));
  const markets = [...new Set([...DEFAULT_MARKETS.map(item => item.symbol), ...strategies.map(item => item.market).filter(Boolean)])];
  return <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
    <div className="flex min-h-10 items-center gap-3">
      <button onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={19} /></button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold text-slate-900">{pageTitle}</h1>
        {pageSubtitle && <p className="hidden truncate text-xs text-slate-500 sm:block">{pageSubtitle}</p>}
      </div>
      <span title={backendStatus === 'online' ? 'Journal storage connected' : 'Journal storage disconnected'} className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:flex ${backendStatus === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
        {backendStatus === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}{backendStatus === 'online' ? 'Synced' : 'Offline'}
      </span>
      <button onClick={onExportCsv} className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 md:flex"><Download size={14} /> Export</button>
      <button onClick={onOpenAddTrade} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"><Plus size={15} /> <span className="hidden sm:inline">Add trade</span><span className="sm:hidden">Trade</span></button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className="relative min-w-[180px] flex-1 sm:max-w-[240px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={filters.search || ''} onChange={e => update('search', e.target.value)} placeholder="Search journal" className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
      <select value={filters.market || 'ALL'} onChange={e => update('market', e.target.value)} aria-label="Filter market" className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600"><option value="ALL">All markets</option>{markets.map(market => <option key={market}>{market}</option>)}</select>
      <select value={filters.strategy || 'ALL'} onChange={e => update('strategy', e.target.value)} aria-label="Filter strategy" className="h-8 max-w-36 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600"><option value="ALL">All strategies</option>{strategies.map(item => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}</select>
      <select value={filters.direction || 'ALL'} onChange={e => update('direction', e.target.value)} aria-label="Filter direction" className="hidden h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 sm:block"><option value="ALL">Any direction</option><option>Long</option><option>Short</option></select>
      <select value={filters.outcome || 'ALL'} onChange={e => update('outcome', e.target.value)} aria-label="Filter outcome" className="hidden h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 sm:block"><option value="ALL">Any outcome</option><option value="win">Wins</option><option value="loss">Losses</option><option value="breakeven">Breakeven</option></select>
      <span className="ml-auto hidden text-[11px] text-slate-400 xl:block">{sampleSize || 0} verified · {excludedCount || 0} excluded</span>
    </div>
  </header>;
}
