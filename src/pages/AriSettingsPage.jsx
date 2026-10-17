import React, { useRef, useState } from 'react';
import { AlertTriangle, Download, Plus, Save, ShieldCheck, Trash2, Upload } from 'lucide-react';

const Panel = ({ children, className = '' }) => <section className={`rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.045)] backdrop-blur-xl sm:p-6 ${className}`}>{children}</section>;

export default function AriSettingsPage({ settings, onSaveSettings, strategies = [], onAddStrategy, onClearAllData, onRestoreBackup, backendStatus }) {
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [strategyName, setStrategyName] = useState('');
  const [strategyMarket, setStrategyMarket] = useState('BTC/USDT');
  const [strategyTimeframe, setStrategyTimeframe] = useState('15m');
  const fileInput = useRef(null);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const save = async event => {
    event.preventDefault();
    setSaving(true); setNotice('');
    try { await onSaveSettings(form); setNotice('Risk settings saved.'); }
    catch { setNotice('Could not save settings. Check the connection and retry.'); }
    finally { setSaving(false); }
  };
  const addStrategy = async event => {
    event.preventDefault();
    if (!strategyName.trim()) return;
    try {
      await onAddStrategy({ name: strategyName.trim(), market: strategyMarket, timeframe: strategyTimeframe, status: 'active', description: '', rules: [] });
      setStrategyName(''); setNotice('Strategy added.');
    } catch { setNotice('Could not add that strategy.'); }
  };
  const restore = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (backup.appName !== 'Ari Trading Journal') throw new Error('That file is not an Ari journal backup.');
      await onRestoreBackup(backup); setNotice('Backup restored.');
    } catch (error) { setNotice(error.message || 'Could not read this backup file.'); }
    finally { event.target.value = ''; }
  };

  return <div className="mx-auto max-w-5xl space-y-6 pb-8">
    <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Preferences</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Journal settings</h2><p className="mt-1 text-sm text-slate-500">Set your risk reference values and manage saved journal data.</p></div>
    {notice && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</p>}
    <Panel>
      <div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><ShieldCheck size={18} /></span><div><h3 className="font-semibold text-slate-900">Risk controls</h3><p className="mt-1 text-xs text-slate-500">Used as reference values when recording and reviewing trades.</p></div></div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['defaultAccountEquity', 'Reference account equity', 'number', 0.01],
          ['maxRiskPerTradePercent', 'Max planned risk per trade (%)', 'number', 0.1],
          ['maxDailyLoss', 'Max daily loss', 'number', 0.01],
          ['maxOpenPositions', 'Max open positions', 'number', 1],
          ['breakevenTolerance', 'Breakeven tolerance', 'number', 0.01],
        ].map(([key, label, type, step]) => <label key={key} className="text-xs font-medium text-slate-600">{label}<input type={type} min="0" step={step} value={form[key] ?? ''} onChange={event => update(key, Number(event.target.value))} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>)}
        <label className="text-xs font-medium text-slate-600">Currency symbol<input value={form.currencySymbol || ''} onChange={event => update('currencySymbol', event.target.value)} maxLength={4} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
        <div className="flex items-end"><button disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Save size={15} />{saving ? 'Saving…' : 'Save risk settings'}</button></div>
      </form>
    </Panel>
    <Panel>
      <div className="mb-5"><h3 className="font-semibold text-slate-900">Strategies</h3><p className="mt-1 text-xs text-slate-500">Maintain the strategy labels used in your journal.</p></div>
      <form onSubmit={addStrategy} className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_1fr_100px_auto]">
        <input value={strategyName} onChange={event => setStrategyName(event.target.value)} placeholder="Strategy name" maxLength={80} className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
        <input value={strategyMarket} onChange={event => setStrategyMarket(event.target.value)} placeholder="Market" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
        <input value={strategyTimeframe} onChange={event => setStrategyTimeframe(event.target.value)} placeholder="Timeframe" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
        <button disabled={!strategyName.trim()} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"><Plus size={15} /> Add</button>
      </form>
      <div className="mt-4 divide-y divide-slate-100">{strategies.map(strategy => <div key={strategy.id || strategy.name} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium text-slate-800">{strategy.name}</p><p className="mt-0.5 text-xs text-slate-500">{strategy.market || '—'} · {strategy.timeframe || 'Timeframe not set'}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-emerald-700">{strategy.status || 'active'}</span></div>)}</div>
      {!strategies.length && <p className="pt-4 text-sm text-slate-500">No strategies saved yet.</p>}
    </Panel>
    <Panel>
      <div className="mb-4"><h3 className="font-semibold text-slate-900">Backup and restore</h3><p className="mt-1 text-xs text-slate-500">Export a local copy of trades, strategies, reviews, and risk settings.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => window.open('/api/ari/backup', '_blank')} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Download size={15} /> Download backup</button><button onClick={() => fileInput.current?.click()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Upload size={15} /> Restore backup</button><input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={restore} /></div>
      {backendStatus !== 'online' && <p className="mt-3 text-xs text-rose-600">Reconnect to the local journal server before backing up or restoring.</p>}
    </Panel>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-4"><div className="flex gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" /><div><p className="text-sm font-semibold text-amber-900">Demo data stays out of your journal</p><p className="mt-1 text-xs leading-relaxed text-amber-800/80">Ari will not seed sample trades into your saved records. Use restore only with a backup you trust.</p></div></div><button onClick={onClearAllData} className="flex shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={14} /> Clear journal</button></div>
  </div>;
}
