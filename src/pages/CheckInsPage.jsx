import React, { useState } from 'react';
import { Activity, Plus, TrendingUp, TrendingDown, Minus, Info, CheckCircle } from 'lucide-react';

const STRESS_LABELS = { 1: 'Very calm', 2: 'Calm', 3: 'Neutral', 4: 'Stressed', 5: 'Very stressed' };
const FOCUS_LABELS  = { 1: 'Unfocused', 2: 'Distracted', 3: 'Okay', 4: 'Focused', 5: 'Very focused' };
const STRESS_COLORS = { 1: 'bg-emerald-500', 2: 'bg-teal-500', 3: 'bg-amber-400', 4: 'bg-orange-500', 5: 'bg-red-500' };
const FOCUS_COLORS  = { 1: 'bg-red-400', 2: 'bg-orange-400', 3: 'bg-amber-400', 4: 'bg-teal-500', 5: 'bg-emerald-500' };

function MiniChart({ data, colorMap, label }) {
  if (!data || data.length < 2) return null;
  const max = 5;
  return (
    <div className="flex items-end gap-1 h-10">
      {data.slice(-10).map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className={`w-full rounded-sm ${colorMap[v] || 'bg-slate-300'}`}
            style={{ height: `${(v / max) * 32}px` }}
            title={`${label}: ${v}`}
          />
        </div>
      ))}
    </div>
  );
}

function Trend({ current, previous }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff > 0) return <TrendingUp size={13} className="text-rose-500" />;
  if (diff < 0) return <TrendingDown size={13} className="text-emerald-500" />;
  return <Minus size={13} className="text-slate-400" />;
}

function ScaleButtons({ value, onChange, colorMap, labels, name }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          className={`checkin-scale-btn ${value === n ? 'selected' : ''}`}
          onClick={() => onChange(n)}
          aria-label={`${name} ${n}: ${labels[n]}`}
          style={value === n ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function CheckInsPage({ checkins, onSaveCheckin }) {
  const [stressLevel, setStressLevel] = useState(3);
  const [focusLevel, setFocusLevel] = useState(3);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveCheckin({ stressLevel, focusLevel, note: note.trim() });
      setSaved(true);
      setNote('');
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const recent = (checkins || []).slice(0, 10);
  const stressValues = recent.map(c => c.stressLevel).reverse();
  const focusValues  = recent.map(c => c.focusLevel).reverse();
  const avgStress = recent.length ? (recent.reduce((s, c) => s + c.stressLevel, 0) / recent.length).toFixed(1) : null;
  const avgFocus  = recent.length ? (recent.reduce((s, c) => s + c.focusLevel, 0) / recent.length).toFixed(1) : null;

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Stress & Focus Check-in</h2>
        <p className="text-sm text-slate-500 mt-1">
          These are subjective self-reports — there's no right or wrong answer.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
        <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          This tool records how you feel right now. It doesn't diagnose any condition and the data stays on your device. Check-in data helps you notice patterns over time.
        </p>
      </div>

      {/* Check-in form */}
      <div className="sf-card p-5 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-800">
              Stress level right now
            </label>
            <span className="text-xs text-slate-500">{STRESS_LABELS[stressLevel]}</span>
          </div>
          <ScaleButtons value={stressLevel} onChange={setStressLevel} colorMap={STRESS_COLORS} labels={STRESS_LABELS} name="Stress" />
          <div className="flex justify-between mt-1 text-[10px] text-slate-400">
            <span>Very calm</span>
            <span>Very stressed</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-800">
              Focus level right now
            </label>
            <span className="text-xs text-slate-500">{FOCUS_LABELS[focusLevel]}</span>
          </div>
          <ScaleButtons value={focusLevel} onChange={setFocusLevel} colorMap={FOCUS_COLORS} labels={FOCUS_LABELS} name="Focus" />
          <div className="flex justify-between mt-1 text-[10px] text-slate-400">
            <span>Unfocused</span>
            <span>Very focused</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Optional note <span className="text-slate-400 font-normal">(max 200 characters)</span>
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 200))}
            placeholder="e.g. Had a difficult morning, struggling to focus on readings"
            className="w-full text-sm px-3 py-2 rounded-lg resize-none"
          />
          <p className="text-[11px] text-slate-400 mt-0.5 text-right">{note.length}/200</p>
        </div>

        <button
          className="sf-btn sf-btn-primary w-full text-sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saved
            ? <><CheckCircle size={16} /> Saved!</>
            : <><Activity size={16} /> {saving ? 'Saving…' : 'Save Check-in'}</>
          }
        </button>
      </div>

      {/* Trends */}
      {recent.length > 0 && (
        <div className="sf-card p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-indigo-500" />
            Recent Trends
          </h3>
          <div className="grid grid-cols-2 gap-5 mb-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Stress (last {recent.length})</p>
              <MiniChart data={stressValues} colorMap={STRESS_COLORS} label="Stress" />
              <p className="text-xs text-slate-500 mt-1">Average: <strong className="text-slate-800">{avgStress}/5</strong></p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Focus (last {recent.length})</p>
              <MiniChart data={focusValues} colorMap={FOCUS_COLORS} label="Focus" />
              <p className="text-xs text-slate-500 mt-1">Average: <strong className="text-slate-800">{avgFocus}/5</strong></p>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">Recent entries</p>
            {recent.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-3 text-xs">
                <span className="text-slate-400 shrink-0 w-24">
                  {new Date(c.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${STRESS_COLORS[c.stressLevel] || 'bg-slate-300'}`} />
                <span className="text-slate-600">Stress {c.stressLevel}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${FOCUS_COLORS[c.focusLevel] || 'bg-slate-300'}`} />
                <span className="text-slate-600">Focus {c.focusLevel}</span>
                {c.note && <span className="text-slate-400 truncate italic">"{c.note}"</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length === 0 && (
        <div className="text-center py-6">
          <Activity size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">Your check-in history will appear here.</p>
        </div>
      )}
    </div>
  );
}
