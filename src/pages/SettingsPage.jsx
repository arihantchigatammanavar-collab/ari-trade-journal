import React, { useState } from 'react';
import {
  Settings, User, Clock, Calendar, BookOpen, Plus, Trash2,
  Download, Upload, RefreshCw, ChevronRight, AlertTriangle, Save
} from 'lucide-react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ACADEMIC_LEVELS = [
  { value: 'high_school', label: 'High School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'professional', label: 'Professional / Other' },
];

const SUBJECT_COLORS = [
  'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Teal', 'Pink', 'Emerald'
];

function AvailabilityEditor({ availability, onChange }) {
  const add = () => {
    const newWindow = {
      id: crypto.randomUUID(),
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '11:00',
      label: '',
    };
    onChange([...availability, newWindow]);
  };

  const update = (id, field, val) => {
    onChange(availability.map(w => w.id === id ? { ...w, [field]: val } : w));
  };

  const remove = (id) => {
    onChange(availability.filter(w => w.id !== id));
  };

  return (
    <div className="space-y-2">
      {availability.length === 0 && (
        <p className="text-xs text-slate-400 py-3 text-center">
          No availability windows yet. Add your typical study times.
        </p>
      )}
      {availability.map(w => (
        <div key={w.id} className="flex items-center gap-2 flex-wrap">
          <select
            value={w.dayOfWeek}
            onChange={e => update(w.id, 'dayOfWeek', Number(e.target.value))}
            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 w-20"
          >
            {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <input
            type="time"
            value={w.startTime}
            onChange={e => update(w.id, 'startTime', e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 w-24"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="time"
            value={w.endTime}
            onChange={e => update(w.id, 'endTime', e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 w-24"
          />
          <input
            type="text"
            value={w.label}
            onChange={e => update(w.id, 'label', e.target.value)}
            placeholder="Label (optional)"
            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 flex-1 min-w-[100px]"
          />
          <button onClick={() => remove(w.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button className="sf-btn sf-btn-secondary text-xs mt-1" onClick={add}>
        <Plus size={13} /> Add window
      </button>
    </div>
  );
}

function SubjectManager({ subjects, onCreateSubject, onDeleteSubject }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(0);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onCreateSubject({ name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor(c => (c + 1) % 8);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Subject name"
          className="flex-1 text-sm px-3 py-2 rounded-lg"
        />
        <select
          value={newColor}
          onChange={e => setNewColor(Number(e.target.value))}
          className="text-xs px-2 py-2 rounded-lg border border-slate-200"
        >
          {SUBJECT_COLORS.map((c, i) => <option key={i} value={i}>{c}</option>)}
        </select>
        <button className="sf-btn sf-btn-primary text-sm" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus size={15} /> Add
        </button>
      </div>
      <div className="space-y-1.5">
        {(subjects || []).map(s => (
          <div key={s.id} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full subject-color-${s.color % 8} border shrink-0`} />
            <span className="text-sm text-slate-700 flex-1">{s.name}</span>
            <button
              onClick={() => onDeleteSubject(s.id)}
              className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {(subjects || []).length === 0 && (
          <p className="text-xs text-slate-400">No subjects yet</p>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage({
  preferences, subjects, availability,
  onSavePreferences, onSaveAvailability,
  onCreateSubject, onDeleteSubject,
  onDownloadBackup, onRestoreBackup,
}) {
  const [prefs, setPrefs] = useState({ ...preferences });
  const [avail, setAvail] = useState([...(availability || [])]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const fileInputRef = React.useRef(null);

  const setP = (field, val) => setPrefs(p => ({ ...p, [field]: val }));

  const handleSavePrefs = async () => {
    setSaving(true);
    try {
      await onSavePreferences(prefs);
      setSaved('prefs');
      setTimeout(() => setSaved(''), 2000);
    } finally { setSaving(false); }
  };

  const handleSaveAvail = async () => {
    setSaving(true);
    try {
      await onSaveAvailability(avail);
      setSaved('avail');
      setTimeout(() => setSaved(''), 2000);
    } finally { setSaving(false); }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.appName !== 'StudyFlow AI') {
        alert('This does not appear to be a StudyFlow AI backup file.');
        return;
      }
      await onRestoreBackup(data);
      alert('Backup restored successfully.');
    } catch {
      alert('Failed to read backup file. Make sure it is a valid StudyFlow backup.');
    }
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your study preferences, subjects, and data.</p>
      </div>

      {/* Study Preferences */}
      <div className="sf-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock size={15} className="text-indigo-500" />
          Study Preferences
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Your name (optional)</label>
            <input
              type="text"
              value={prefs.displayName || ''}
              onChange={e => setP('displayName', e.target.value)}
              placeholder="e.g. Alex"
              className="w-full text-sm px-3 py-2 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Academic level</label>
            <select
              value={prefs.academicLevel || 'undergraduate'}
              onChange={e => setP('academicLevel', e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg"
            >
              {ACADEMIC_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Max daily study hours: <strong>{prefs.maxDailyHours}h</strong>
            </label>
            <input
              type="range" min="1" max="14" step="0.5"
              value={prefs.maxDailyHours}
              onChange={e => setP('maxDailyHours', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Session length: <strong>{prefs.sessionDurationMinutes}min</strong>
            </label>
            <input
              type="range" min="15" max="180" step="15"
              value={prefs.sessionDurationMinutes}
              onChange={e => setP('sessionDurationMinutes', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Break between sessions: <strong>{prefs.breakDurationMinutes}min</strong>
            </label>
            <input
              type="range" min="5" max="60" step="5"
              value={prefs.breakDurationMinutes}
              onChange={e => setP('breakDurationMinutes', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <button className="sf-btn sf-btn-primary text-sm" onClick={handleSavePrefs} disabled={saving}>
          <Save size={14} /> {saved === 'prefs' ? 'Saved!' : saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>

      {/* Availability */}
      <div className="sf-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Calendar size={15} className="text-indigo-500" />
          Study Availability
        </h3>
        <p className="text-xs text-slate-500">
          Add your regular study windows. The scheduler will only place sessions within these times.
        </p>
        <AvailabilityEditor availability={avail} onChange={setAvail} />
        <button className="sf-btn sf-btn-primary text-sm" onClick={handleSaveAvail} disabled={saving}>
          <Save size={14} /> {saved === 'avail' ? 'Saved!' : saving ? 'Saving…' : 'Save Availability'}
        </button>
      </div>

      {/* Subjects */}
      <div className="sf-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <BookOpen size={15} className="text-indigo-500" />
          Subjects
        </h3>
        <SubjectManager
          subjects={subjects}
          onCreateSubject={onCreateSubject}
          onDeleteSubject={onDeleteSubject}
        />
      </div>

      {/* Backup & Restore */}
      <div className="sf-card p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Download size={15} className="text-indigo-500" />
          Backup & Restore
        </h3>
        <p className="text-xs text-slate-500">
          Export all your tasks, schedule, and preferences. Restore from a previous backup.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button className="sf-btn sf-btn-secondary text-sm" onClick={onDownloadBackup}>
            <Download size={14} /> Download Backup
          </button>
          <button className="sf-btn sf-btn-ghost text-sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Restore from Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleRestoreFile}
          />
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
          <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Restoring a backup will overwrite all current data.</p>
        </div>
      </div>
    </div>
  );
}
