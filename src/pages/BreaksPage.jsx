import React, { useState, useEffect, useRef } from 'react';
import { Wind, Compass, Activity, Monitor, Scissors, MessageCircle, ChevronRight, ChevronLeft, X, Play, Pause, RotateCcw } from 'lucide-react';

const TYPE_ICONS = {
  breathing:  Wind,
  grounding:  Compass,
  movement:   Activity,
  screen:     Monitor,
  reflection: MessageCircle,
};

const TYPE_COLORS = {
  breathing:  { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', accent: '#0d9488' },
  grounding:  { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', accent: '#4f6ef7' },
  movement:   { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', accent: '#d97706' },
  screen:     { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', accent: '#8b5cf6' },
  reflection: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', accent: '#e8624a' },
};

function ExerciseCard({ exercise, onStart }) {
  const Icon = TYPE_ICONS[exercise.type] || Wind;
  const colors = TYPE_COLORS[exercise.type] || TYPE_COLORS.breathing;

  return (
    <div
      className={`sf-card p-5 cursor-pointer group hover:border-opacity-100 border ${colors.border}`}
      onClick={() => onStart(exercise)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onStart(exercise)}
    >
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
          <Icon size={22} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">
            {exercise.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{exercise.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`sf-badge ${colors.bg} ${colors.text}`}>
              {exercise.durationMinutes} min
            </span>
            <span className="sf-badge sf-badge-neutral capitalize">{exercise.type}</span>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
      </div>
    </div>
  );
}

function ExerciseRunner({ exercise, onClose }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const colors = TYPE_COLORS[exercise.type] || TYPE_COLORS.breathing;
  const step = exercise.steps[stepIdx];
  const isLast = stepIdx === exercise.steps.length - 1;
  const progress = step ? Math.min(1, stepElapsed / step.durationSeconds) : 0;

  useEffect(() => {
    if (running && step) {
      intervalRef.current = setInterval(() => {
        setStepElapsed(s => {
          if (s >= step.durationSeconds) {
            if (!isLast) {
              setStepIdx(i => i + 1);
              setStepElapsed(0);
              return 0;
            } else {
              clearInterval(intervalRef.current);
              setRunning(false);
              return s;
            }
          }
          return s + 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, stepIdx, step?.durationSeconds, isLast]);

  const reset = () => {
    setStepIdx(0);
    setStepElapsed(0);
    setRunning(false);
  };

  const isDone = isLast && stepElapsed >= step?.durationSeconds && !running;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md sf-surface-raised rounded-2xl p-6 animate-slide-down">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900">{exercise.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Step {stepIdx + 1} of {exercise.steps.length}
            </p>
          </div>
          <button
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onClose}
            aria-label="Close exercise"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step progress bar */}
        <div className="sf-progress-track mb-5" style={{ height: '4px' }}>
          <div
            className="sf-progress-fill"
            style={{
              width: `${(stepIdx / exercise.steps.length) * 100 + (progress / exercise.steps.length) * 100}%`,
              background: colors.accent,
            }}
          />
        </div>

        {/* Step text */}
        <div className={`rounded-xl ${colors.bg} p-5 min-h-[100px] flex items-center justify-center mb-5`}>
          <p className="text-sm font-medium text-slate-700 text-center leading-relaxed">
            {isDone ? '✓ Exercise complete! Take a moment to notice how you feel.' : step?.text}
          </p>
        </div>

        {/* Timer */}
        {!isDone && step && (
          <div className="flex items-center justify-center gap-2 mb-5 text-slate-500">
            <div className="text-2xl font-mono font-bold text-slate-900">
              {Math.max(0, step.durationSeconds - stepElapsed)}s
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {!isDone && (
            <button
              className={`sf-btn text-sm px-6 ${running ? 'sf-btn-ghost' : 'sf-btn-primary'}`}
              onClick={() => setRunning(r => !r)}
            >
              {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {stepElapsed > 0 ? 'Resume' : 'Start'}</>}
            </button>
          )}
          {!running && stepIdx > 0 && (
            <button className="sf-btn sf-btn-ghost text-sm" onClick={reset}>
              <RotateCcw size={15} /> Restart
            </button>
          )}
          {isDone && (
            <button className="sf-btn sf-btn-success text-sm px-8" onClick={onClose}>
              Done — Back to study
            </button>
          )}
          {!isDone && !running && isLast && stepElapsed === 0 && (
            <button className="sf-btn sf-btn-ghost text-sm" onClick={onClose}>
              Skip
            </button>
          )}
        </div>

        {/* Skip step */}
        {running && !isLast && (
          <button
            className="block mx-auto mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            onClick={() => { setStepIdx(i => i + 1); setStepElapsed(0); }}
          >
            Skip this step →
          </button>
        )}
      </div>
    </div>
  );
}

export default function BreaksPage({ exercises }) {
  const [activeExercise, setActiveExercise] = useState(null);
  const [filter, setFilter] = useState('all');

  const types = ['all', 'breathing', 'grounding', 'movement', 'screen', 'reflection'];
  const filtered = (exercises || []).filter(e => filter === 'all' || e.type === filter);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Breaks & Well-being</h2>
        <p className="text-sm text-slate-500 mt-1">
          Short exercises to help you recharge. Participation is always optional.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 leading-relaxed">
        These exercises are for general well-being only. They are not a substitute for professional mental health support. If you're feeling overwhelmed or distressed, please speak to a counsellor or trusted adult.
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {types.map(t => (
          <button
            key={t}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              filter === t
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setFilter(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Exercise cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="sf-card p-8 text-center">
            <Wind size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm">No exercises in this category</p>
          </div>
        ) : (
          filtered.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} onStart={setActiveExercise} />
          ))
        )}
      </div>

      {/* Exercise runner modal */}
      {activeExercise && (
        <ExerciseRunner exercise={activeExercise} onClose={() => setActiveExercise(null)} />
      )}
    </div>
  );
}
