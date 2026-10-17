import React from 'react';
import { Zap, CheckCircle, Clock, Target, Calendar, TrendingUp, BarChart2, BookOpen } from 'lucide-react';

function StatBlock({ label, value, sub, icon: Icon, color = 'text-indigo-500', bg = 'bg-indigo-50' }) {
  return (
    <div className="sf-card p-4">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2`}>
        <Icon size={18} className={color} />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function WeeklyBar({ date, minutes, maxMinutes }) {
  const pct = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;
  const label = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  const hours = (minutes / 60).toFixed(1);
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="relative w-full flex justify-center" style={{ height: '80px' }}>
        <div className="absolute bottom-0 w-full max-w-[32px] rounded-t-md bg-indigo-500 transition-all duration-700"
          style={{ height: `${Math.max(4, pct)}%`, opacity: minutes === 0 ? 0.15 : 0.85 }}
          title={`${label}: ${hours}h`}
        />
      </div>
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
      <span className="text-[10px] text-slate-400">{hours}h</span>
    </div>
  );
}

export default function ProgressPage({ progress, sessions, tasks, checkins }) {
  const {
    tasksCompleted = 0,
    tasksTotal = 0,
    totalFocusMinutes = 0,
    completedSessions: completedSessionsCount = 0,
    plannedSessions = 0,
    dailyFocusMinutes = {},
    upcomingDeadlines = [],
    recentCheckins = [],
  } = progress || {};

  const completionRate = plannedSessions > 0 ? Math.round((completedSessionsCount / plannedSessions) * 100) : 0;
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const maxMinutes = Math.max(...days7.map(d => dailyFocusMinutes[d] || 0), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Progress & Activity</h2>
        <p className="text-sm text-slate-500 mt-1">
          Based on your actual recorded sessions and completed tasks.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBlock
          label="Tasks completed"
          value={tasksCompleted}
          sub={`of ${tasksTotal} total`}
          icon={CheckCircle}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatBlock
          label="Focus hours"
          value={`${(totalFocusMinutes / 60).toFixed(1)}h`}
          sub="total recorded"
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatBlock
          label="Sessions done"
          value={completedSessionsCount}
          sub={`${completionRate}% completion rate`}
          icon={Zap}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <StatBlock
          label="Tasks remaining"
          value={tasksTotal - tasksCompleted}
          sub={upcomingDeadlines.length > 0 ? `${upcomingDeadlines.length} due this week` : 'none due soon'}
          icon={Target}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* Weekly activity chart */}
      <div className="sf-card p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart2 size={15} className="text-indigo-500" />
          7-Day Study Activity
          <span className="text-xs font-normal text-slate-400 ml-auto">
            Actual completed session minutes
          </span>
        </h3>
        <div className="flex items-end gap-1.5">
          {days7.map(d => (
            <WeeklyBar key={d} date={d} minutes={dailyFocusMinutes[d] || 0} maxMinutes={maxMinutes} />
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Total this week: {(days7.reduce((s, d) => s + (dailyFocusMinutes[d] || 0), 0) / 60).toFixed(1)}h
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Upcoming deadlines */}
        <div className="sf-card p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar size={15} className="text-amber-500" />
            Upcoming Deadlines
          </h3>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No deadlines in the next 7 days</p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map(task => {
                const days = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={task.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      days <= 1 ? 'bg-red-500' : days <= 3 ? 'bg-amber-400' : 'bg-indigo-400'
                    }`} />
                    <span className="text-slate-700 flex-1 truncate">{task.title}</span>
                    <span className={`font-semibold shrink-0 ${days <= 1 ? 'text-red-600' : days <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent check-ins */}
        <div className="sf-card p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-teal-500" />
            Recent Well-being
          </h3>
          {recentCheckins.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No check-ins recorded yet</p>
          ) : (
            <div className="space-y-2">
              {recentCheckins.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 w-20 shrink-0">
                    {new Date(c.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-slate-600">Stress: {c.stressLevel}/5</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">Focus: {c.focusLevel}/5</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completed tasks */}
      <div className="sf-card p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-500" />
          Completed Tasks
        </h3>
        {(tasks || []).filter(t => t.completed).length === 0 ? (
          <p className="text-xs text-slate-400 py-2 text-center">No completed tasks yet</p>
        ) : (
          <div className="space-y-1.5">
            {(tasks || []).filter(t => t.completed).slice(0, 8).map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs py-1">
                <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                <span className="text-slate-600 flex-1 truncate">{t.title}</span>
                {t.completedAt && (
                  <span className="text-slate-400 shrink-0">
                    {new Date(t.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
