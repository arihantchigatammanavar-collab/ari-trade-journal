import React, { useState } from 'react';
import {
  Calendar, RefreshCw, Play, CheckCircle, AlertTriangle,
  Clock, Zap, ChevronRight, Info, AlertCircle, List
} from 'lucide-react';

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const dateStr = d.toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function SeverityIcon({ severity }) {
  if (severity === 'high')   return <AlertCircle size={15} className="text-red-500 shrink-0" />;
  if (severity === 'medium') return <AlertTriangle size={15} className="text-amber-500 shrink-0" />;
  return <Info size={15} className="text-blue-500 shrink-0" />;
}

function WarningCard({ warning }) {
  const [expanded, setExpanded] = useState(false);
  const bg = warning.severity === 'high' ? 'bg-red-50 border-red-200' :
             warning.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
             'bg-blue-50 border-blue-200';

  return (
    <div className={`rounded-xl border p-3 ${bg}`}>
      <div className="flex items-start gap-2">
        <SeverityIcon severity={warning.severity} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800">{warning.message}</p>
          {warning.suggestions && warning.suggestions.length > 0 && (
            <button
              className="text-[11px] text-slate-500 hover:text-slate-700 mt-0.5 flex items-center gap-1 transition-colors"
              onClick={() => setExpanded(e => !e)}
            >
              Suggestions {expanded ? '▲' : '▼'}
            </button>
          )}
          {expanded && warning.suggestions && (
            <ul className="mt-1.5 space-y-0.5">
              {warning.suggestions.map((s, i) => (
                <li key={i} className="text-[11px] text-slate-600 flex gap-1.5">
                  <span className="shrink-0 text-slate-400">→</span>{s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionBlock({ session, onStart, onNavigateToFocus }) {
  const isPast      = new Date(session.endTime) < new Date() && session.state === 'scheduled';
  const isDone      = session.state === 'completed';
  const isActive    = session.state === 'active';
  const isCancelled = session.state === 'cancelled';

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
      isActive    ? 'border-indigo-300 bg-indigo-50' :
      isDone      ? 'border-emerald-200 bg-emerald-50/50 opacity-80' :
      isCancelled ? 'border-slate-200 bg-slate-50 opacity-50 line-through' :
      isPast      ? 'border-orange-200 bg-orange-50/40' :
      'border-slate-100 bg-white hover:border-slate-200'
    }`}>
      <div className={`w-1 h-10 rounded-full shrink-0 ${
        isActive    ? 'bg-indigo-500' :
        isDone      ? 'bg-emerald-400' :
        isCancelled ? 'bg-slate-300' :
        isPast      ? 'bg-orange-400' :
        'bg-indigo-300'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{session.taskTitle}</p>
        <p className="text-[11px] text-slate-400">
          {formatTime(session.startTime)} – {formatTime(session.endTime)} · {session.durationMinutes}min
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isActive && <span className="sf-badge sf-badge-accent text-[10px] animate-pulse-soft">Active</span>}
        {isDone && <CheckCircle size={15} className="text-emerald-500" />}
        {isPast && !isDone && !isCancelled && <span className="text-[11px] text-orange-600 font-medium">Missed</span>}
        {session.state === 'scheduled' && !isPast && (
          <button
            className="sf-btn sf-btn-primary text-[11px] py-1 px-2.5 gap-1"
            onClick={() => { onStart(session.id); onNavigateToFocus?.(); }}
          >
            <Play size={11} /> Start
          </button>
        )}
      </div>
    </div>
  );
}

export default function SchedulePage({
  schedule, sessions, tasks, subjects,
  onGenerate, generating, onReplan, replanning,
  onStartSession, onNavigateToFocus
}) {
  const [viewMode, setViewMode] = useState('day'); // day | week | list

  // Group sessions by date
  const sessionsByDate = {};
  (sessions || []).forEach(s => {
    const d = s.startTime?.slice(0, 10);
    if (!d) return;
    if (!sessionsByDate[d]) sessionsByDate[d] = [];
    sessionsByDate[d].push(s);
  });
  const dates = Object.keys(sessionsByDate).sort();

  const summary = schedule?.summary;
  const warnings = schedule?.workloadWarnings || [];
  const unscheduled = schedule?.unscheduledTasks || [];

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySessions = sessionsByDate[todayKey] || [];
  const upcomingSessions = (sessions || [])
    .filter(s => s.state === 'scheduled' && new Date(s.startTime) >= new Date())
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Study Schedule</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {schedule?.generatedAt
              ? `Generated ${new Date(schedule.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              : 'No schedule generated yet'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="sf-btn sf-btn-ghost text-sm"
            onClick={onReplan}
            disabled={replanning || !schedule?.generatedAt}
            title={!schedule?.generatedAt ? 'Generate a schedule first' : ''}
          >
            <RefreshCw size={15} className={replanning ? 'animate-spin' : ''} />
            {replanning ? 'Replanning…' : 'Replan'}
          </button>
          <button
            className="sf-btn sf-btn-primary text-sm"
            onClick={onGenerate}
            disabled={generating}
          >
            <Zap size={15} className={generating ? 'animate-pulse' : ''} />
            {generating ? 'Generating…' : 'Generate Schedule'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Sessions planned', value: summary.sessionsCount || 0, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Hours scheduled', value: `${summary.totalScheduledHours}h`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Tasks covered', value: summary.tasksScheduled || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Warnings', value: summary.warningCount || 0, icon: AlertTriangle, color: summary.warningCount > 0 ? 'text-amber-600' : 'text-slate-400', bg: summary.warningCount > 0 ? 'bg-amber-50' : 'bg-slate-50' },
          ].map(s => (
            <div key={s.label} className="sf-card p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon size={16} className={s.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">{s.value}</div>
                <div className="text-[11px] text-slate-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="sf-card p-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            Schedule Warnings
          </h3>
          {warnings.map((w, i) => <WarningCard key={i} warning={w} />)}
        </div>
      )}

      {/* Unscheduled tasks */}
      {unscheduled.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
            <AlertCircle size={15} /> Tasks that couldn't be scheduled
          </h3>
          <ul className="space-y-1.5">
            {unscheduled.map((u, i) => (
              <li key={i} className="text-xs text-red-700">
                <span className="font-semibold">"{u.taskTitle}"</span>: {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No schedule state */}
      {!schedule?.generatedAt && sessions?.length === 0 && (
        <div className="sf-card p-12 text-center">
          <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">No schedule yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
            Make sure you have tasks and availability windows set up, then click "Generate Schedule" to create a realistic study plan.
          </p>
          <button className="sf-btn sf-btn-primary" onClick={onGenerate} disabled={generating}>
            <Zap size={16} /> {generating ? 'Generating…' : 'Generate My Schedule'}
          </button>
        </div>
      )}

      {/* Session list grouped by day */}
      {dates.length > 0 && (
        <div className="space-y-4">
          {dates.map(date => (
            <div key={date} className="sf-card overflow-hidden">
              <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${
                date === todayKey ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'
              }`}>
                <Calendar size={14} className={date === todayKey ? 'text-indigo-500' : 'text-slate-400'} />
                <span className={`text-xs font-bold ${date === todayKey ? 'text-indigo-700' : 'text-slate-600'}`}>
                  {formatDate(date + 'T12:00:00')} {date === todayKey ? '— Today' : ''}
                </span>
                <span className="text-[11px] text-slate-400 ml-auto">
                  {sessionsByDate[date].length} session{sessionsByDate[date].length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {sessionsByDate[date]
                  .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                  .map(s => (
                    <SessionBlock
                      key={s.id}
                      session={s}
                      onStart={onStartSession}
                      onNavigateToFocus={onNavigateToFocus}
                    />
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
