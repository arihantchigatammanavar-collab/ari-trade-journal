import React, { useMemo } from 'react';
import {
  Clock, AlertTriangle, CheckCircle, BookOpen, Calendar,
  ChevronRight, Flame, Target, BarChart2, RefreshCw, TrendingUp,
  AlertCircle, Play
} from 'lucide-react';

const PRIORITY_COLORS = {
  critical: 'priority-bg-critical',
  high: 'priority-bg-high',
  medium: 'priority-bg-medium',
  low: 'priority-bg-low',
};

const TYPE_LABELS = {
  assignment: 'Assignment', exam: 'Exam', reading: 'Reading',
  revision: 'Revision', project: 'Project', practice: 'Practice', other: 'Other',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return `In ${diff} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isToday(iso) {
  if (!iso) return false;
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-indigo-600', bg = 'bg-indigo-50' }) {
  return (
    <div className="sf-card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={18} className={color} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-slate-900 leading-tight">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function WorkloadBanner({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  const highWarnings = warnings.filter(w => w.severity === 'high');
  if (highWarnings.length === 0) return null;
  const warning = highWarnings[0];

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3 animate-fade-in">
      <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">{warning.message}</p>
        {warning.suggestions && (
          <ul className="mt-1.5 space-y-0.5">
            {warning.suggestions.slice(0, 2).map((s, i) => (
              <li key={i} className="text-xs text-amber-700 flex gap-1.5">
                <span className="shrink-0">→</span>{s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TodaySessions({ sessions, tasks, onStartSession }) {
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = (sessions || [])
    .filter(s => s.startTime?.slice(0, 10) === today)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  if (todaySessions.length === 0) {
    return (
      <div className="py-8 text-center">
        <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">No sessions scheduled for today.</p>
        <p className="text-xs text-slate-400 mt-1">Generate a study schedule to get started.</p>
      </div>
    );
  }

  const now = new Date();
  const nextScheduled = todaySessions.find(s => s.state === 'scheduled' && new Date(s.startTime) >= now)
    || todaySessions.find(s => s.state === 'scheduled');

  return (
    <div className="space-y-2">
      {todaySessions.map(session => {
        const isNext = session.id === nextScheduled?.id;
        const isPast = new Date(session.endTime) < now && session.state === 'scheduled';
        const isDone = session.state === 'completed';
        const isActive = session.state === 'active';

        return (
          <div
            key={session.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
              isActive  ? 'border-indigo-300 bg-indigo-50 shadow-sm' :
              isDone    ? 'border-emerald-200 bg-emerald-50/60' :
              isPast    ? 'border-slate-200 bg-slate-50 opacity-60' :
              isNext    ? 'border-indigo-200 bg-white shadow-sm' :
              'border-slate-100 bg-white'
            }`}
          >
            <div className={`w-1.5 h-10 rounded-full shrink-0 ${
              isActive ? 'bg-indigo-500' :
              isDone   ? 'bg-emerald-400' :
              isPast   ? 'bg-slate-300' :
              isNext   ? 'bg-indigo-400' :
              'bg-slate-200'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{session.taskTitle}</p>
              <p className="text-[11px] text-slate-400">
                {formatTime(session.startTime)} – {formatTime(session.endTime)} · {session.durationMinutes}min
              </p>
            </div>
            {isActive && (
              <span className="sf-badge sf-badge-accent text-[10px] animate-pulse-soft">Active</span>
            )}
            {isDone && <CheckCircle size={16} className="text-emerald-500 shrink-0" />}
            {isPast && !isDone && <span className="text-[10px] text-slate-400">Missed</span>}
            {isNext && !isActive && (
              <button
                className="sf-btn sf-btn-primary text-[11px] py-1 px-2.5 gap-1"
                onClick={() => onStartSession(session.id)}
              >
                <Play size={11} /> Start
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UpcomingDeadlines({ tasks }) {
  const urgent = (tasks || [])
    .filter(t => !t.completed)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  if (urgent.length === 0) {
    return <p className="text-sm text-slate-400 py-4 text-center">No upcoming deadlines</p>;
  }

  return (
    <div className="space-y-2">
      {urgent.map(task => {
        const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysLeft < 0;
        const isUrgent  = daysLeft <= 2 && !isOverdue;
        return (
          <div key={task.id} className="flex items-center gap-2.5 py-1.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              isOverdue ? 'bg-red-500' :
              isUrgent  ? 'bg-amber-400' :
              daysLeft <= 7 ? 'bg-indigo-400' : 'bg-slate-300'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{task.title}</p>
              <p className="text-[11px] text-slate-400">{TYPE_LABELS[task.type] || task.type}</p>
            </div>
            <span className={`text-[11px] font-semibold shrink-0 ${
              isOverdue ? 'text-red-600' :
              isUrgent  ? 'text-amber-600' :
              'text-slate-500'
            }`}>
              {formatDate(task.deadline)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WeeklyHeatmap({ dailyFocusMinutes }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1), minutes: dailyFocusMinutes?.[key] || 0 });
  }
  const max = Math.max(...days.map(d => d.minutes), 1);

  return (
    <div className="flex items-end gap-1.5 h-12">
      {days.map(d => (
        <div key={d.key} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-sm bg-indigo-500 transition-all duration-500"
            style={{ height: `${Math.max(4, (d.minutes / max) * 40)}px`, opacity: d.minutes === 0 ? 0.15 : 0.8 + (d.minutes / max) * 0.2 }}
            title={`${d.label}: ${Math.round(d.minutes / 60 * 10) / 10}h`}
          />
          <span className="text-[10px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage({
  tasks, sessions, schedule, progress, workload,
  onNavigate, onStartSession, onReplan, replanning
}) {
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = (sessions || []).filter(s => s.startTime?.slice(0, 10) === today);
  const completedToday = todaySessions.filter(s => s.state === 'completed');
  const activeTasks = (tasks || []).filter(t => !t.completed);
  const overdueTasks = activeTasks.filter(t => new Date(t.deadline) < new Date());

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';
  const name = progress?.displayName || '';

  const nextSession = (sessions || [])
    .filter(s => s.state === 'scheduled' && new Date(s.startTime) >= new Date())
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header greeting */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-tight">
            {greeting}{name ? `, ${name}` : ''}! 👋
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="sf-btn sf-btn-secondary text-sm"
            onClick={onReplan}
            disabled={replanning}
          >
            <RefreshCw size={15} className={replanning ? 'animate-spin' : ''} />
            {replanning ? 'Replanning…' : 'Replan my day'}
          </button>
          <button className="sf-btn sf-btn-primary text-sm" onClick={() => onNavigate('tasks')}>
            + Add Task
          </button>
        </div>
      </div>

      {/* Workload warning */}
      <WorkloadBanner warnings={workload?.signals} />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={CheckCircle}
          label="Completed today"
          value={completedToday.length}
          sub={`of ${todaySessions.length} sessions`}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          icon={Target}
          label="Active tasks"
          value={activeTasks.length}
          sub={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'All on track'}
          color={overdueTasks.length > 0 ? 'text-red-600' : 'text-indigo-600'}
          bg={overdueTasks.length > 0 ? 'bg-red-50' : 'bg-indigo-50'}
        />
        <StatCard
          icon={Clock}
          label="Focus minutes today"
          value={completedToday.reduce((s, sess) => s + (sess.actualDurationMinutes || 0), 0)}
          sub="tracked this session"
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          icon={TrendingUp}
          label="This week"
          value={`${Math.round((progress?.totalFocusMinutes || 0) / 60 * 10) / 10}h`}
          sub="total focus time"
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Today's sessions — 2 cols */}
        <div className="lg:col-span-2 sf-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-500" />
              Today's Study Plan
            </h3>
            <button
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
              onClick={() => onNavigate('schedule')}
            >
              Full schedule <ChevronRight size={14} />
            </button>
          </div>
          <TodaySessions sessions={sessions} tasks={tasks} onStartSession={onStartSession} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Next up */}
          {nextSession && (
            <div className="sf-card p-4 border-l-4 border-l-indigo-500">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Up Next</p>
              <p className="font-bold text-slate-800 text-sm">{nextSession.taskTitle}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatTime(nextSession.startTime)} · {nextSession.durationMinutes} min
              </p>
              <button
                className="sf-btn sf-btn-primary text-xs mt-3 w-full"
                onClick={() => { onStartSession(nextSession.id); onNavigate('focus'); }}
              >
                <Play size={13} /> Start Focus Session
              </button>
            </div>
          )}

          {/* Upcoming deadlines */}
          <div className="sf-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-500" />
                Upcoming Deadlines
              </h3>
              <button
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                onClick={() => onNavigate('tasks')}
              >
                All tasks
              </button>
            </div>
            <UpcomingDeadlines tasks={tasks} />
          </div>
        </div>
      </div>

      {/* Weekly activity + Progress row */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sf-card p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart2 size={15} className="text-indigo-500" />
            7-Day Focus Activity
          </h3>
          <WeeklyHeatmap dailyFocusMinutes={progress?.dailyFocusMinutes} />
          <p className="text-xs text-slate-400 mt-2">
            Actual study minutes per day (from completed sessions)
          </p>
        </div>

        <div className="sf-card p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Flame size={15} className="text-amber-500" />
            Quick Wins
          </h3>
          <div className="space-y-2.5">
            {(tasks || []).filter(t => !t.completed && t.estimatedHours <= 1).slice(0, 3).map(task => (
              <div key={task.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 truncate">{task.title}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">{task.estimatedHours}h</span>
              </div>
            ))}
            {(tasks || []).filter(t => !t.completed && t.estimatedHours <= 1).length === 0 && (
              <p className="text-xs text-slate-400">No quick tasks right now</p>
            )}
          </div>
          <button
            className="mt-3 w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1 transition-colors"
            onClick={() => onNavigate('tasks')}
          >
            Manage all tasks →
          </button>
        </div>
      </div>
    </div>
  );
}
