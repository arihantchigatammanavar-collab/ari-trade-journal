import React, { useState } from 'react';
import { BookOpen, ChevronRight, ChevronLeft, Check, Clock, Calendar, Target, Zap } from 'lucide-react';

const ACADEMIC_LEVELS = [
  { value: 'high_school', label: 'High School', emoji: '🎒' },
  { value: 'undergraduate', label: 'Undergraduate', emoji: '🎓' },
  { value: 'postgraduate', label: 'Postgraduate / Graduate', emoji: '📚' },
  { value: 'professional', label: 'Professional / Other', emoji: '💼' },
];

const PLANNING_CHALLENGES = [
  { value: 'procrastination', label: 'Procrastination' },
  { value: 'overloaded', label: 'Too many tasks at once' },
  { value: 'inconsistent', label: 'Inconsistent study routine' },
  { value: 'prioritization', label: 'Difficulty prioritizing' },
  { value: 'deadlines', label: 'Keeping track of deadlines' },
  { value: 'focus', label: 'Maintaining focus' },
];

function ProgressDots({ step, total }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i <= step ? 'bg-indigo-600 w-4' : 'bg-slate-200 w-1.5'
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    displayName: '',
    academicLevel: '',
    sessionDurationMinutes: 45,
    breakDurationMinutes: 10,
    maxDailyHours: 6,
    challenges: [],
  });

  const total = 4;
  const set = (field, val) => setData(d => ({ ...d, [field]: val }));

  const toggleChallenge = (val) => {
    setData(d => ({
      ...d,
      challenges: d.challenges.includes(val)
        ? d.challenges.filter(c => c !== val)
        : [...d.challenges, val],
    }));
  };

  const next = () => setStep(s => Math.min(s + 1, total - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handleComplete = () => {
    onComplete({
      displayName: data.displayName,
      academicLevel: data.academicLevel || 'undergraduate',
      sessionDurationMinutes: data.sessionDurationMinutes,
      breakDurationMinutes: data.breakDurationMinutes,
      maxDailyHours: data.maxDailyHours,
      challenges: data.challenges,
      completed: true,
    });
  };

  const steps = [
    // Step 0: Welcome
    <div key={0} className="space-y-5 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
          <BookOpen size={30} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome to StudyFlow AI</h2>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-sm mx-auto">
          Let's set up your study planner. This takes about 2 minutes.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700 block">
          What's your name? <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          type="text"
          value={data.displayName}
          onChange={e => set('displayName', e.target.value)}
          placeholder="e.g. Alex"
          className="w-full text-base px-4 py-3 rounded-xl"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700 block">Academic level</label>
        <div className="grid grid-cols-2 gap-2">
          {ACADEMIC_LEVELS.map(l => (
            <button
              key={l.value}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                data.academicLevel === l.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
              onClick={() => set('academicLevel', l.value)}
            >
              <span className="text-xl">{l.emoji}</span>
              <p className="text-xs font-semibold text-slate-700 mt-1">{l.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>,

    // Step 1: Study habits
    <div key={1} className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Your study habits</h2>
        <p className="text-sm text-slate-500 mt-1">We'll use these to build a realistic schedule.</p>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">
          How long do you prefer to study in one session?
          <strong className="text-indigo-600"> {data.sessionDurationMinutes} minutes</strong>
        </label>
        <input
          type="range" min="15" max="120" step="15"
          value={data.sessionDurationMinutes}
          onChange={e => set('sessionDurationMinutes', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[11px] text-slate-400 mt-1">
          <span>15 min</span><span>30</span><span>45</span><span>60</span><span>90</span><span>2h</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">
          Break between sessions:
          <strong className="text-indigo-600"> {data.breakDurationMinutes} minutes</strong>
        </label>
        <input
          type="range" min="5" max="30" step="5"
          value={data.breakDurationMinutes}
          onChange={e => set('breakDurationMinutes', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[11px] text-slate-400 mt-1">
          <span>5 min</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">
          Maximum study hours per day:
          <strong className="text-indigo-600"> {data.maxDailyHours}h</strong>
        </label>
        <input
          type="range" min="1" max="12" step="0.5"
          value={data.maxDailyHours}
          onChange={e => set('maxDailyHours', parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          We'll use this to prevent your schedule from becoming unrealistic.
        </p>
      </div>
    </div>,

    // Step 2: Challenges (optional)
    <div key={2} className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Planning challenges</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select any that apply to you. <span className="text-slate-400">(Optional — skip if you prefer)</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PLANNING_CHALLENGES.map(c => (
          <button
            key={c.value}
            className={`p-3 rounded-xl border-2 text-left text-xs font-medium transition-all ${
              data.challenges.includes(c.value)
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
            }`}
            onClick={() => toggleChallenge(c.value)}
          >
            {data.challenges.includes(c.value) && <Check size={12} className="inline mr-1" />}
            {c.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        This helps us show you the most relevant features. Your selections don't affect scheduling.
      </p>
    </div>,

    // Step 3: Ready
    <div key={3} className="space-y-5 animate-fade-in text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto shadow">
        <Check size={30} className="text-emerald-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {data.displayName ? `You're all set, ${data.displayName}!` : "You're all set!"}
        </h2>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-sm mx-auto">
          Next, add your subjects and tasks, set your study availability, and generate your first schedule.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: Target, label: 'Add tasks', color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { icon: Calendar, label: 'Set availability', color: 'text-teal-500', bg: 'bg-teal-50' },
          { icon: Zap, label: 'Generate schedule', color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map((s, i) => (
          <div key={i} className="sf-card p-3">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mx-auto mb-1.5`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className="text-xs font-medium text-slate-600">{s.label}</p>
          </div>
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(79,110,247,0.08), transparent 50%), var(--page)' }}
    >
      <div className="w-full max-w-md">
        <div className="sf-surface-raised p-6 sm:p-8 rounded-2xl">
          {/* Progress */}
          <div className="flex items-center justify-between mb-6">
            <ProgressDots step={step} total={total} />
            <span className="text-xs text-slate-400">{step + 1} / {total}</span>
          </div>

          {/* Step content */}
          {steps[step]}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-6">
            {step > 0 && (
              <button className="sf-btn sf-btn-ghost text-sm" onClick={prev}>
                <ChevronLeft size={15} /> Back
              </button>
            )}
            <div className="flex-1" />
            {step < total - 1 ? (
              <button className="sf-btn sf-btn-primary text-sm" onClick={next}>
                Continue <ChevronRight size={15} />
              </button>
            ) : (
              <button className="sf-btn sf-btn-primary text-sm px-6" onClick={handleComplete}>
                Get Started <ChevronRight size={15} />
              </button>
            )}
          </div>

          {/* Skip */}
          {step < total - 1 && (
            <button
              className="block mx-auto mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              onClick={handleComplete}
            >
              Skip setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
