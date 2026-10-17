import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, CheckSquare, Square, ChevronDown, ChevronUp,
  Calendar, Clock, BookOpen, Filter, Search, AlertCircle, CheckCircle2,
  SortAsc, Tag
} from 'lucide-react';

const TASK_TYPES = ['assignment', 'exam', 'reading', 'revision', 'project', 'practice', 'other'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_LABELS = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
const TYPE_LABELS = {
  assignment: 'Assignment', exam: 'Exam', reading: 'Reading',
  revision: 'Revision', project: 'Project', practice: 'Practice', other: 'Other',
};

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline }) {
  if (!deadline) return null;
  const days = daysUntil(deadline);
  const label = days < 0 ? `${Math.abs(days)}d overdue`
    : days === 0 ? 'Due today'
    : days === 1 ? 'Due tomorrow'
    : days <= 7 ? `${days}d left`
    : new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const cls = days < 0 ? 'sf-badge-danger'
    : days <= 1 ? 'sf-badge-warning'
    : days <= 3 ? 'sf-badge-coral'
    : 'sf-badge-neutral';

  return <span className={`sf-badge ${cls}`}><Calendar size={10} />{label}</span>;
}

function TaskForm({ subjects, initialData, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '', subjectId: '', type: 'assignment', deadline: '',
    estimatedHours: 2, priority: 'medium', notes: '', progressPercent: 0,
    ...initialData,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.deadline) errs.deadline = 'Deadline is required';
    if (!form.estimatedHours || form.estimatedHours <= 0) errs.estimatedHours = 'Enter a positive number';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  };

  const set = (field, val) => { setForm(f => ({ ...f, [field]: val })); setErrors(e => ({ ...e, [field]: '' })); };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Write Chapter 3 analysis"
            className={`w-full text-sm px-3 py-2 rounded-lg border ${errors.title ? 'border-red-400' : ''}`}
            autoFocus
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
          <select value={form.subjectId} onChange={e => set('subjectId', e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg">
            <option value="">No subject</option>
            {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Task Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg">
            {TASK_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Deadline <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.deadline ? form.deadline.slice(0, 10) : ''}
            onChange={e => set('deadline', e.target.value)}
            className={`w-full text-sm px-3 py-2 rounded-lg border ${errors.deadline ? 'border-red-400' : ''}`}
          />
          {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Estimated hours <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.estimatedHours}
            onChange={e => set('estimatedHours', parseFloat(e.target.value))}
            min="0.25" step="0.25" placeholder="2"
            className={`w-full text-sm px-3 py-2 rounded-lg border ${errors.estimatedHours ? 'border-red-400' : ''}`}
          />
          {errors.estimatedHours && <p className="text-red-500 text-xs mt-1">{errors.estimatedHours}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg">
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Progress ({form.progressPercent}%)
          </label>
          <input
            type="range" min="0" max="100" step="5"
            value={form.progressPercent}
            onChange={e => set('progressPercent', Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            placeholder="Any additional notes…"
            className="w-full text-sm px-3 py-2 rounded-lg resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="sf-btn sf-btn-ghost text-sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="sf-btn sf-btn-primary text-sm">
          {initialData ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}

function TaskCard({ task, subjects, onEdit, onDelete, onToggleComplete }) {
  const [expanded, setExpanded] = useState(false);
  const subject = subjects?.find(s => s.id === task.subjectId);
  const remaining = task.estimatedHours * (1 - (task.progressPercent || 0) / 100);

  return (
    <div className={`sf-card p-4 transition-all ${task.completed ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleComplete(task)}
          className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed
            ? <CheckCircle2 size={20} className="text-emerald-500" />
            : <Square size={20} />
          }
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className={`text-sm font-semibold text-slate-800 flex-1 ${task.completed ? 'line-through text-slate-500' : ''}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`sf-badge ${
                task.priority === 'critical' ? 'priority-bg-critical sf-badge-danger' :
                task.priority === 'high'     ? 'priority-bg-high sf-badge-coral' :
                task.priority === 'medium'   ? 'priority-bg-medium sf-badge-warning' :
                'sf-badge-neutral'
              }`}>
                {PRIORITY_LABELS[task.priority]}
              </span>
              <DeadlineBadge deadline={task.deadline} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {subject && (
              <span className={`sf-badge subject-color-${subject.color % 8}`}>
                <BookOpen size={9} />{subject.name}
              </span>
            )}
            <span className="sf-badge sf-badge-neutral">
              <Tag size={9} />{TYPE_LABELS[task.type]}
            </span>
            <span className="text-[11px] text-slate-400">
              <Clock size={10} className="inline mr-0.5" />
              {remaining.toFixed(1)}h remaining
            </span>
          </div>

          {/* Progress bar */}
          {!task.completed && task.progressPercent > 0 && (
            <div className="mt-2">
              <div className="sf-progress-track">
                <div className="sf-progress-fill" style={{ width: `${task.progressPercent}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{task.progressPercent}% complete</p>
            </div>
          )}

          {expanded && task.notes && (
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{task.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {task.notes && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            aria-label="Edit task"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Delete task"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage({ tasks, subjects, onCreateTask, onUpdateTask, onDeleteTask }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active'); // active | completed | all
  const [sortBy, setSortBy] = useState('deadline'); // deadline | priority | created

  const filtered = (tasks || [])
    .filter(t => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    })
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'deadline') return new Date(a.deadline) - new Date(b.deadline);
      if (sortBy === 'priority') {
        const p = { critical: 0, high: 1, medium: 2, low: 3 };
        return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const handleSave = (data) => {
    if (editingTask) {
      onUpdateTask(editingTask.id, data);
      setEditingTask(null);
    } else {
      onCreateTask(data);
      setShowForm(false);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(false);
  };

  const handleToggleComplete = (task) => {
    onUpdateTask(task.id, { completed: !task.completed, progressPercent: !task.completed ? 100 : task.progressPercent });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tasks & Assignments</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {(tasks || []).filter(t => !t.completed).length} active · {(tasks || []).filter(t => t.completed).length} completed
          </p>
        </div>
        <button
          className="sf-btn sf-btn-primary text-sm"
          onClick={() => { setShowForm(s => !s); setEditingTask(null); }}
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Add/Edit form */}
      {(showForm || editingTask) && (
        <div className="sf-card p-5 animate-slide-down">
          <h3 className="text-sm font-bold text-slate-800 mb-4">
            {editingTask ? 'Edit Task' : 'New Task'}
          </h3>
          <TaskForm
            subjects={subjects}
            initialData={editingTask}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingTask(null); }}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg"
          />
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
          {[['active', 'Active'], ['completed', 'Done'], ['all', 'All']].map(([v, l]) => (
            <button
              key={v}
              className={`px-3 py-1.5 transition-colors ${filter === v ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600"
        >
          <option value="deadline">Sort: Deadline</option>
          <option value="priority">Sort: Priority</option>
          <option value="created">Sort: Newest</option>
        </select>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="sf-card p-10 text-center">
          <CheckSquare size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">
            {search ? 'No tasks match your search' : filter === 'completed' ? 'No completed tasks yet' : 'No tasks yet'}
          </p>
          {!search && filter === 'active' && (
            <p className="text-sm text-slate-400 mt-1">
              Add a task to get started with your study planning.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              subjects={subjects}
              onEdit={handleEdit}
              onDelete={onDeleteTask}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
