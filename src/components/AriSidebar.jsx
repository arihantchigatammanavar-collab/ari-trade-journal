import React from 'react';
import { LayoutDashboard, Plus, History, ChartNoAxesCombined, Bot, Brain, ClipboardCheck, Settings, X, CandlestickChart } from 'lucide-react';

const items = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'add-trade', label: 'New trade', icon: Plus },
  { id: 'history', label: 'Trade history', icon: History },
  { id: 'analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { id: 'assistant', label: 'AI assistant', icon: Bot },
  { id: 'psychology', label: 'Psychology', icon: Brain },
  { id: 'reviews', label: 'Trade reviews', icon: ClipboardCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AriSidebar({ activePage, setActivePage, mobileOpen, setMobileOpen, onOpenAddTrade }) {
  const content = (
    <div className="flex h-full flex-col border-r border-slate-200/80 bg-white/85 px-4 py-5 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-2 pb-7">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20"><CandlestickChart size={22} /></span>
        <div><p className="text-[15px] font-bold tracking-[0.14em] text-slate-900">ARI</p><p className="text-[11px] text-slate-500">Trading Journal</p></div>
      </div>
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Workspace</p>
      <nav className="space-y-1" aria-label="Main navigation">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return <button key={id} onClick={() => { setActivePage(id); setMobileOpen(false); }} aria-current={active ? 'page' : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />{label}
          </button>;
        })}
      </nav>
      <div className="mt-auto border-t border-slate-100 pt-4">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">Your process, clearly.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">A private record of your trades, decisions, and lessons.</p>
          <button onClick={onOpenAddTrade} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"><Plus size={14} /> Add trade</button>
        </div>
      </div>
    </div>
  );

  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{content}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <button aria-label="Close navigation" className="absolute inset-0 bg-slate-900/30" onClick={() => setMobileOpen(false)} />
      <aside className="relative h-full w-[min(19rem,88vw)] shadow-2xl">{content}<button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-lg p-2 text-slate-500"><X size={18} /></button></aside>
    </div>}
  </>;
}
