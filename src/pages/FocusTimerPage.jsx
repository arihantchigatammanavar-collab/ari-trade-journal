import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Coffee, CheckCircle, Clock, Target, Zap } from 'lucide-react';

function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }

function formatElapsed(seconds) {
  if (seconds < 3600) return `${pad(seconds / 60)}:${pad(seconds % 60)}`;
  return `${pad(seconds / 3600)}:${pad((seconds % 3600) / 60)}:${pad(seconds % 60)}`;
}

// Circular progress ring component
function TimerRing({ progress, size = 200, strokeWidth = 10, active }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, progress));

  return (
    <svg
      width={size}
      height={size}
      className={active ? 'animate-timer-pulse' : ''}
      role="img"
      aria-label="Timer progress"
    >
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="rgba(79, 110, 247, 0.1)"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={progress >= 1 ? '#16a34a' : '#4f6ef7'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
      />
    </svg>
  );
}

export default function FocusTimerPage({ sessions, activeSessionId, onStartSession, onPauseSession, onResumeSession, onCompleteSession, onCancelSession, onNavigateToBreak }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionNote, setSessionNote] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Find the currently active or most recent scheduled session
  const activeSession = sessions?.find(s => s.id === activeSessionId && (s.state === 'active' || s.state === 'paused'));
  const nextSession = sessions?.find(s => s.state === 'scheduled' && new Date(s.startTime) <= new Date(Date.now() + 30 * 60000))
    || sessions?.find(s => s.state === 'scheduled');

  const currentSession = activeSession || nextSession;
  const isRunning = activeSession?.state === 'active';
  const isPaused  = activeSession?.state === 'paused';

  const targetSeconds = (currentSession?.durationMinutes || 45) * 60;
  const progress = Math.min(1, elapsedSeconds / targetSeconds);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      if (!startTimeRef.current) startTimeRef.current = Date.now() - elapsedSeconds * 1000;
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      if (isPaused) {
        startTimeRef.current = null;
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isPaused]);

  // Reset when session changes
  useEffect(() => {
    setElapsedSeconds(0);
    startTimeRef.current = null;
  }, [activeSessionId]);

  const handleStart = async () => {
    if (!currentSession) return;
    await onStartSession(currentSession.id);
    startTimeRef.current = Date.now();
  };

  const handlePause = async () => {
    clearInterval(intervalRef.current);
    await onPauseSession(activeSession.id);
  };

  const handleResume = async () => {
    startTimeRef.current = Date.now() - elapsedSeconds * 1000;
    await onResumeSession(activeSession.id);
  };

  const handleComplete = async () => {
    clearInterval(intervalRef.current);
    await onCompleteSession(activeSession?.id || currentSession?.id, sessionNote);
    setElapsedSeconds(0);
    startTimeRef.current = null;
    setShowCompleteModal(false);
    setSessionNote('');
  };

  const handleCancel = async () => {
    clearInterval(intervalRef.current);
    await onCancelSession(activeSession?.id || currentSession?.id);
    setElapsedSeconds(0);
    startTimeRef.current = null;
  };

  if (!currentSession) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
          <Clock size={32} className="text-indigo-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">No session ready</h2>
        <p className="text-slate-500 text-sm text-center max-w-sm">
          Generate a study schedule first, then come back here to start a focus session.
        </p>
      </div>
    );
  }

  const remaining = Math.max(0, targetSeconds - elapsedSeconds);
  const isComplete = progress >= 1;

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Focus Session</h2>
        <p className="text-sm text-slate-500 mt-1">
          Stay with the work. You can do this.
        </p>
      </div>

      {/* Session info */}
      <div className="sf-card p-4 mb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Target size={16} className="text-indigo-500" />
          <span className="text-sm font-bold text-slate-800">{currentSession.taskTitle}</span>
        </div>
        <span className="sf-badge sf-badge-accent">{currentSession.durationMinutes} min session</span>
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <TimerRing progress={progress} size={220} strokeWidth={12} active={isRunning} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-bold text-slate-900 tabular-nums">
              {formatElapsed(isComplete ? elapsedSeconds : remaining)}
            </span>
            <span className="text-xs text-slate-400 mt-1">
              {isComplete ? 'Session complete!' : isRunning ? 'remaining' : isPaused ? 'paused' : 'ready'}
            </span>
          </div>
        </div>

        {/* Elapsed */}
        {(isRunning || isPaused) && (
          <p className="text-xs text-slate-400 mt-2">
            {formatElapsed(elapsedSeconds)} elapsed
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {!isRunning && !isPaused && !isComplete && (
          <button
            className="sf-btn sf-btn-primary px-8 py-3 text-base"
            onClick={handleStart}
          >
            <Play size={20} /> Start Session
          </button>
        )}

        {isRunning && (
          <>
            <button
              className="sf-btn sf-btn-ghost px-6 py-2.5"
              onClick={handlePause}
            >
              <Pause size={18} /> Pause
            </button>
            <button
              className="sf-btn sf-btn-success px-6 py-2.5"
              onClick={() => setShowCompleteModal(true)}
            >
              <CheckCircle size={18} /> Complete
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              className="sf-btn sf-btn-primary px-6 py-2.5"
              onClick={handleResume}
            >
              <Play size={18} /> Resume
            </button>
            <button
              className="sf-btn sf-btn-success px-6 py-2.5"
              onClick={() => setShowCompleteModal(true)}
            >
              <CheckCircle size={18} /> Complete Early
            </button>
          </>
        )}

        {isComplete && (
          <button
            className="sf-btn sf-btn-success px-8 py-3 text-base"
            onClick={() => setShowCompleteModal(true)}
          >
            <CheckCircle size={20} /> Mark Complete
          </button>
        )}

        {(isRunning || isPaused) && (
          <button
            className="sf-btn sf-btn-danger px-4 py-2.5 text-sm"
            onClick={handleCancel}
            title="Cancel session"
          >
            <Square size={16} />
          </button>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          className="sf-card p-3 flex items-center gap-2.5 hover:border-indigo-200 transition-all text-left group cursor-pointer border border-transparent"
          onClick={onNavigateToBreak}
        >
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <Coffee size={16} className="text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 group-hover:text-teal-700">Take a break</p>
            <p className="text-[11px] text-slate-400">Guided exercises</p>
          </div>
        </button>
        <div className="sf-card p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Zap size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Today's goal</p>
            <p className="text-[11px] text-slate-400">
              {sessions?.filter(s => s.state === 'completed' && s.startTime?.startsWith(new Date().toISOString().slice(0, 10))).length || 0} sessions done
            </p>
          </div>
        </div>
      </div>

      {/* Complete modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm sf-surface-raised p-6 rounded-2xl animate-slide-down">
            <h3 className="font-bold text-slate-900 mb-1">Complete this session?</h3>
            <p className="text-sm text-slate-500 mb-4">
              You've been studying for {formatElapsed(elapsedSeconds)}. Great work!
            </p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Optional note (what did you accomplish?)
              </label>
              <textarea
                rows={2}
                value={sessionNote}
                onChange={e => setSessionNote(e.target.value)}
                placeholder="e.g. Finished reading Chapter 4, summarised key points"
                className="w-full text-sm px-3 py-2 rounded-lg resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button className="sf-btn sf-btn-ghost flex-1 text-sm" onClick={() => setShowCompleteModal(false)}>
                Keep Going
              </button>
              <button className="sf-btn sf-btn-success flex-1 text-sm" onClick={handleComplete}>
                <CheckCircle size={15} /> Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
