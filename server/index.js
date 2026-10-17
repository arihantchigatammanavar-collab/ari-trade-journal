import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSchedule, replanSchedule } from './scheduler.js';
import { analyzeWorkload } from './workloadAnalyzer.js';
import { createAiRouter } from './studyFlowAiAssistant.js';
import { createAriRouter } from './ariRoutes.js';
import { createAiAssistantRouter } from './aiAssistant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 5001;

// ── Data directory paths ─────────────────────────────────────────────────────
const dataDir = path.join(rootDir, 'data');
const files = {
  subjects:     path.join(dataDir, 'subjects.json'),
  tasks:        path.join(dataDir, 'tasks.json'),
  availability: path.join(dataDir, 'availability.json'),
  sessions:     path.join(dataDir, 'sessions.json'),
  checkins:     path.join(dataDir, 'checkins.json'),
  schedule:     path.join(dataDir, 'schedule.json'),
  onboarding:   path.join(dataDir, 'onboarding.json'),
  preferences:  path.join(dataDir, 'preferences.json'),
};

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────────────────
function readJson(file, defaultVal) {
  try {
    if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(defaultVal, null, 2), 'utf-8'); return defaultVal; }
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch { return defaultVal; }
}
function writeJson(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8'); return true; } catch { return false; }
}
function uid() { return crypto.randomUUID(); }

// ── Defaults ─────────────────────────────────────────────────────────────────
readJson(files.subjects,     []);
readJson(files.tasks,        []);
readJson(files.availability, []);
readJson(files.sessions,     []);
readJson(files.checkins,     []);
readJson(files.schedule,     { sessions: [], generatedAt: null, version: 0 });
readJson(files.onboarding,   { completed: false, step: 0 });
readJson(files.preferences,  {
  maxDailyHours: 6,
  sessionDurationMinutes: 45,
  breakDurationMinutes: 10,
  preferredDays: [1, 2, 3, 4, 5],
  academicLevel: 'undergraduate',
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json({ limit: '4mb' }));

// Ari Trading Journal routes use the existing JSON-backed records. Keep the
// StudyFlow endpoints below intact for any previously stored StudyFlow data.
app.use('/api/ari', createAriRouter({ rootDir }));
app.use('/api/ai', createAiAssistantRouter({
  getTrades: () => readJson(path.join(dataDir, 'trades.json'), []),
}));

// AI router (server-side NVIDIA calls only)
app.use('/api/ai', createAiRouter({
  getTasks:    () => readJson(files.tasks, []),
  getSchedule: () => readJson(files.schedule, { sessions: [] }),
  getCheckins: () => readJson(files.checkins, []),
}));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'online', product: 'Ari Trading Journal', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════
//  ONBOARDING
// ══════════════════════════════════════════════════════
app.get('/api/onboarding', (_req, res) => res.json(readJson(files.onboarding, {})));

app.post('/api/onboarding', (req, res) => {
  const current = readJson(files.onboarding, {});
  const updated = { ...current, ...req.body, updatedAt: new Date().toISOString() };
  writeJson(files.onboarding, updated);
  res.json(updated);
});

// ══════════════════════════════════════════════════════
//  PREFERENCES
// ══════════════════════════════════════════════════════
app.get('/api/preferences', (_req, res) => res.json(readJson(files.preferences, {})));

app.put('/api/preferences', (req, res) => {
  const { maxDailyHours, sessionDurationMinutes, breakDurationMinutes, preferredDays, academicLevel, displayName } = req.body;
  const current = readJson(files.preferences, {});
  const updated = {
    ...current,
    ...(maxDailyHours !== undefined && { maxDailyHours: Math.min(16, Math.max(1, Number(maxDailyHours))) }),
    ...(sessionDurationMinutes !== undefined && { sessionDurationMinutes: Math.min(180, Math.max(15, Number(sessionDurationMinutes))) }),
    ...(breakDurationMinutes !== undefined && { breakDurationMinutes: Math.min(60, Math.max(5, Number(breakDurationMinutes))) }),
    ...(preferredDays !== undefined && { preferredDays }),
    ...(academicLevel !== undefined && { academicLevel }),
    ...(displayName !== undefined && { displayName }),
    updatedAt: new Date().toISOString(),
  };
  writeJson(files.preferences, updated);
  res.json(updated);
});

// ══════════════════════════════════════════════════════
//  SUBJECTS
// ══════════════════════════════════════════════════════
app.get('/api/subjects', (_req, res) => res.json(readJson(files.subjects, [])));

app.post('/api/subjects', (req, res) => {
  const { name, color, icon } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Subject name is required' });
  const subjects = readJson(files.subjects, []);
  const subject = { id: uid(), name: name.trim(), color: color || 0, icon: icon || 'BookOpen', createdAt: new Date().toISOString() };
  subjects.push(subject);
  writeJson(files.subjects, subjects);
  res.status(201).json(subject);
});

app.put('/api/subjects/:id', (req, res) => {
  const subjects = readJson(files.subjects, []);
  const idx = subjects.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Subject not found' });
  subjects[idx] = { ...subjects[idx], ...req.body, id: subjects[idx].id, updatedAt: new Date().toISOString() };
  writeJson(files.subjects, subjects);
  res.json(subjects[idx]);
});

app.delete('/api/subjects/:id', (req, res) => {
  const subjects = readJson(files.subjects, []);
  const filtered = subjects.filter(s => s.id !== req.params.id);
  if (filtered.length === subjects.length) return res.status(404).json({ error: 'Subject not found' });
  writeJson(files.subjects, filtered);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════
//  TASKS
// ══════════════════════════════════════════════════════
const VALID_TASK_TYPES = ['assignment', 'exam', 'reading', 'revision', 'project', 'practice', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

app.get('/api/tasks', (_req, res) => {
  const tasks = readJson(files.tasks, []);
  res.json(tasks.sort((a, b) => {
    const pd = { critical: 0, high: 1, medium: 2, low: 3 };
    return (pd[a.priority] ?? 2) - (pd[b.priority] ?? 2) || new Date(a.deadline) - new Date(b.deadline);
  }));
});

app.post('/api/tasks', (req, res) => {
  const { title, subjectId, type, deadline, estimatedHours, priority, notes, progressPercent } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Task title is required' });
  if (!deadline)       return res.status(400).json({ error: 'Deadline is required' });
  if (estimatedHours !== undefined && (isNaN(estimatedHours) || estimatedHours <= 0))
    return res.status(400).json({ error: 'Estimated hours must be a positive number' });

  const tasks = readJson(files.tasks, []);
  const task = {
    id: uid(),
    title: title.trim(),
    subjectId: subjectId || null,
    type: VALID_TASK_TYPES.includes(type) ? type : 'assignment',
    deadline,
    estimatedHours: parseFloat(estimatedHours) || 2,
    priority: VALID_PRIORITIES.includes(priority) ? priority : 'medium',
    completed: false,
    completedAt: null,
    notes: notes || '',
    progressPercent: Math.min(100, Math.max(0, Number(progressPercent) || 0)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(task);
  writeJson(files.tasks, tasks);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const tasks = readJson(files.tasks, []);
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  const update = { ...req.body };
  if (update.type && !VALID_TASK_TYPES.includes(update.type)) delete update.type;
  if (update.priority && !VALID_PRIORITIES.includes(update.priority)) delete update.priority;
  if (update.progressPercent !== undefined) update.progressPercent = Math.min(100, Math.max(0, Number(update.progressPercent)));
  if (update.estimatedHours !== undefined) update.estimatedHours = Math.max(0.25, parseFloat(update.estimatedHours));
  if (update.completed === true && !tasks[idx].completedAt) update.completedAt = new Date().toISOString();
  if (update.completed === false) update.completedAt = null;

  tasks[idx] = { ...tasks[idx], ...update, id: tasks[idx].id, updatedAt: new Date().toISOString() };
  writeJson(files.tasks, tasks);
  res.json(tasks[idx]);
});

app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readJson(files.tasks, []);
  const filtered = tasks.filter(t => t.id !== req.params.id);
  if (filtered.length === tasks.length) return res.status(404).json({ error: 'Task not found' });
  writeJson(files.tasks, filtered);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════
//  AVAILABILITY
// ══════════════════════════════════════════════════════
app.get('/api/availability', (_req, res) => res.json(readJson(files.availability, [])));

app.put('/api/availability', (req, res) => {
  const windows = req.body;
  if (!Array.isArray(windows)) return res.status(400).json({ error: 'Availability must be an array of windows' });
  const validated = windows.map(w => ({
    id: w.id || uid(),
    dayOfWeek: Math.min(6, Math.max(0, Number(w.dayOfWeek))),
    startTime: w.startTime || '09:00',
    endTime:   w.endTime   || '11:00',
    label:     w.label     || '',
  }));
  writeJson(files.availability, validated);
  res.json(validated);
});

// ══════════════════════════════════════════════════════
//  SCHEDULE — Generate
// ══════════════════════════════════════════════════════
app.post('/api/schedule/generate', (req, res) => {
  const tasks        = readJson(files.tasks, []);
  const availability = readJson(files.availability, []);
  const prefs        = readJson(files.preferences, {});
  const existing     = readJson(files.sessions, []);

  const options = {
    tasks,
    availability,
    preferences: { ...prefs, ...req.body },
    existingSessions: existing.filter(s => s.state === 'completed'),
    currentDateTime: new Date().toISOString(),
  };

  const result = createSchedule(options);

  // Persist generated sessions (replacing unstarted ones)
  const completedSessions = existing.filter(s => s.state === 'completed' || s.state === 'active');
  const newSessions = result.sessions.map(s => ({
    ...s,
    state: 'scheduled',
    actualStartTime: null,
    actualEndTime: null,
    pausedAt: null,
    totalPausedMs: 0,
    taskTitle: tasks.find(t => t.id === s.taskId)?.title || '',
  }));
  const allSessions = [...completedSessions, ...newSessions];
  writeJson(files.sessions, allSessions);

  const schedule = {
    sessions: result.sessions,
    unscheduledTasks: result.unscheduledTasks,
    workloadWarnings: result.workloadWarnings,
    conflicts: result.conflicts,
    summary: result.summary,
    generatedAt: new Date().toISOString(),
    version: (readJson(files.schedule, { version: 0 }).version || 0) + 1,
  };
  writeJson(files.schedule, schedule);

  res.json(schedule);
});

// ══════════════════════════════════════════════════════
//  SCHEDULE — Current
// ══════════════════════════════════════════════════════
app.get('/api/schedule', (_req, res) => {
  const schedule = readJson(files.schedule, { sessions: [], generatedAt: null, version: 0 });
  const sessions = readJson(files.sessions, []);
  res.json({ ...schedule, liveSessionStates: sessions });
});

// ══════════════════════════════════════════════════════
//  SCHEDULE — Replan
// ══════════════════════════════════════════════════════
app.post('/api/schedule/replan', (req, res) => {
  const tasks        = readJson(files.tasks, []);
  const availability = readJson(files.availability, []);
  const prefs        = readJson(files.preferences, {});
  const existing     = readJson(files.sessions, []);

  const completed   = existing.filter(s => s.state === 'completed');
  const active      = existing.filter(s => s.state === 'active');
  const missedIds   = existing.filter(s => s.state === 'scheduled' && new Date(s.endTime) < new Date()).map(s => s.taskId);

  const result = replanSchedule({
    tasks,
    availability,
    preferences: prefs,
    completedSessions: completed,
    activeSessions: active,
    missedTaskIds: [...new Set(missedIds)],
    currentDateTime: new Date().toISOString(),
    ...req.body,
  });

  const preserved = [...completed, ...active];
  const newSessions = result.sessions.map(s => ({
    ...s,
    state: 'scheduled',
    actualStartTime: null,
    actualEndTime: null,
    pausedAt: null,
    totalPausedMs: 0,
    taskTitle: tasks.find(t => t.id === s.taskId)?.title || '',
  }));
  writeJson(files.sessions, [...preserved, ...newSessions]);

  const schedule = {
    sessions: result.sessions,
    unscheduledTasks: result.unscheduledTasks,
    workloadWarnings: result.workloadWarnings,
    conflicts: result.conflicts,
    summary: result.summary,
    changes: result.changes,
    generatedAt: new Date().toISOString(),
    version: (readJson(files.schedule, { version: 0 }).version || 0) + 1,
    replanned: true,
  };
  writeJson(files.schedule, schedule);
  res.json(schedule);
});

// ══════════════════════════════════════════════════════
//  FOCUS SESSIONS — CRUD + state transitions
// ══════════════════════════════════════════════════════
app.get('/api/sessions', (_req, res) => {
  const sessions = readJson(files.sessions, []);
  res.json(sessions.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
});

// Start a session
app.post('/api/sessions/:id/start', (req, res) => {
  const sessions = readJson(files.sessions, []);
  const idx = sessions.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Session not found' });
  if (sessions[idx].state === 'active') return res.json(sessions[idx]);

  sessions[idx] = {
    ...sessions[idx],
    state: 'active',
    actualStartTime: new Date().toISOString(),
    pausedAt: null,
    totalPausedMs: 0,
  };
  writeJson(files.sessions, sessions);
  res.json(sessions[idx]);
});

// Pause a session
app.post('/api/sessions/:id/pause', (req, res) => {
  const sessions = readJson(files.sessions, []);
  const idx = sessions.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Session not found' });
  if (sessions[idx].state !== 'active') return res.status(400).json({ error: 'Session is not active' });

  sessions[idx] = { ...sessions[idx], state: 'paused', pausedAt: new Date().toISOString() };
  writeJson(files.sessions, sessions);
  res.json(sessions[idx]);
});

// Resume a session
app.post('/api/sessions/:id/resume', (req, res) => {
  const sessions = readJson(files.sessions, []);
  const idx = sessions.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Session not found' });
  if (sessions[idx].state !== 'paused') return res.status(400).json({ error: 'Session is not paused' });

  const pausedMs = sessions[idx].pausedAt
    ? Date.now() - new Date(sessions[idx].pausedAt).getTime()
    : 0;

  sessions[idx] = {
    ...sessions[idx],
    state: 'active',
    pausedAt: null,
    totalPausedMs: (sessions[idx].totalPausedMs || 0) + pausedMs,
  };
  writeJson(files.sessions, sessions);
  res.json(sessions[idx]);
});

// Complete a session
app.post('/api/sessions/:id/complete', (req, res) => {
  const sessions = readJson(files.sessions, []);
  const idx = sessions.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Session not found' });

  const now = new Date().toISOString();
  const startMs = sessions[idx].actualStartTime ? new Date(sessions[idx].actualStartTime).getTime() : Date.now();
  const pausedMs = sessions[idx].pausedAt
    ? (sessions[idx].totalPausedMs || 0) + (Date.now() - new Date(sessions[idx].pausedAt).getTime())
    : (sessions[idx].totalPausedMs || 0);
  const actualMinutes = Math.round((Date.now() - startMs - pausedMs) / 60000);

  sessions[idx] = {
    ...sessions[idx],
    state: 'completed',
    actualEndTime: now,
    actualDurationMinutes: Math.max(1, actualMinutes),
    completionNote: req.body?.note || '',
  };
  writeJson(files.sessions, sessions);

  // Auto-update task progress
  if (req.body?.updateProgress !== false && sessions[idx].taskId) {
    const tasks = readJson(files.tasks, []);
    const taskIdx = tasks.findIndex(t => t.id === sessions[idx].taskId);
    if (taskIdx !== -1 && !tasks[taskIdx].completed) {
      const hoursCompleted = actualMinutes / 60;
      const totalHours = tasks[taskIdx].estimatedHours || 1;
      const allTaskSessions = sessions.filter(s => s.taskId === sessions[idx].taskId && s.state === 'completed');
      const totalCompletedHours = allTaskSessions.reduce((sum, s) => sum + (s.actualDurationMinutes || 0) / 60, 0);
      const newProgress = Math.min(100, Math.round((totalCompletedHours / totalHours) * 100));
      tasks[taskIdx].progressPercent = newProgress;
      tasks[taskIdx].updatedAt = now;
      writeJson(files.tasks, tasks);
    }
  }

  res.json(sessions[idx]);
});

// Cancel a session
app.post('/api/sessions/:id/cancel', (req, res) => {
  const sessions = readJson(files.sessions, []);
  const idx = sessions.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Session not found' });
  sessions[idx] = { ...sessions[idx], state: 'cancelled', cancelledAt: new Date().toISOString() };
  writeJson(files.sessions, sessions);
  res.json(sessions[idx]);
});

// ══════════════════════════════════════════════════════
//  CHECK-INS (stress & focus)
// ══════════════════════════════════════════════════════
app.get('/api/checkins', (_req, res) => {
  const checkins = readJson(files.checkins, []);
  res.json(checkins.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

app.post('/api/checkins', (req, res) => {
  const { stressLevel, focusLevel, note } = req.body;
  if (!stressLevel || stressLevel < 1 || stressLevel > 5)
    return res.status(400).json({ error: 'stressLevel must be 1–5' });
  if (!focusLevel || focusLevel < 1 || focusLevel > 5)
    return res.status(400).json({ error: 'focusLevel must be 1–5' });

  const checkins = readJson(files.checkins, []);
  const checkin = {
    id: uid(),
    stressLevel: Number(stressLevel),
    focusLevel: Number(focusLevel),
    note: (note || '').slice(0, 500), // limit note length
    timestamp: new Date().toISOString(),
  };
  checkins.push(checkin);
  writeJson(files.checkins, checkins);
  res.status(201).json(checkin);
});

// ══════════════════════════════════════════════════════
//  WORKLOAD ANALYSIS
// ══════════════════════════════════════════════════════
app.get('/api/workload', (_req, res) => {
  const tasks        = readJson(files.tasks, []);
  const availability = readJson(files.availability, []);
  const sessions     = readJson(files.sessions, []);
  const checkins     = readJson(files.checkins, []);
  const result = analyzeWorkload(tasks, availability, sessions, checkins);
  res.json(result);
});

// ══════════════════════════════════════════════════════
//  PROGRESS SUMMARY
// ══════════════════════════════════════════════════════
app.get('/api/progress', (_req, res) => {
  const tasks    = readJson(files.tasks, []);
  const sessions = readJson(files.sessions, []);
  const checkins = readJson(files.checkins, []);

  const completedSessions = sessions.filter(s => s.state === 'completed');
  const totalFocusMinutes = completedSessions.reduce((sum, s) => sum + (s.actualDurationMinutes || 0), 0);
  const tasksCompleted    = tasks.filter(t => t.completed).length;
  const tasksTotal        = tasks.length;
  const plannedSessions   = sessions.filter(s => s.state !== 'cancelled').length;

  // Last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = completedSessions.filter(s => new Date(s.actualEndTime) > sevenDaysAgo);
  const dailyFocus = {};
  recentSessions.forEach(s => {
    const day = s.actualEndTime?.slice(0, 10);
    if (day) dailyFocus[day] = (dailyFocus[day] || 0) + (s.actualDurationMinutes || 0);
  });

  // Upcoming deadlines (next 7 days)
  const sevenDaysAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = tasks
    .filter(t => !t.completed && new Date(t.deadline) <= sevenDaysAhead)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  // Recent check-ins
  const recentCheckins = checkins.slice(0, 10);

  res.json({
    tasksCompleted,
    tasksTotal,
    tasksRemaining: tasksTotal - tasksCompleted,
    totalFocusMinutes,
    completedSessions: completedSessions.length,
    plannedSessions,
    plannedVsCompleted: plannedSessions ? Math.round((completedSessions.length / plannedSessions) * 100) : 0,
    dailyFocusMinutes: dailyFocus,
    upcomingDeadlines,
    recentCheckins,
  });
});

// ══════════════════════════════════════════════════════
//  BREAK EXERCISES
// ══════════════════════════════════════════════════════
const BREAK_EXERCISES = [
  {
    id: 'breathing-478',
    title: '4-7-8 Breathing',
    description: 'A calming breathing rhythm: inhale for 4 counts, hold for 7, exhale for 8.',
    durationMinutes: 3,
    type: 'breathing',
    steps: [
      { text: 'Find a comfortable position and relax your shoulders.', durationSeconds: 5 },
      { text: 'Inhale slowly through your nose for 4 counts.', durationSeconds: 4 },
      { text: 'Hold your breath for 7 counts.', durationSeconds: 7 },
      { text: 'Exhale completely through your mouth for 8 counts.', durationSeconds: 8 },
      { text: 'Repeat this cycle 3 more times at your own pace.', durationSeconds: 60 },
    ],
  },
  {
    id: 'grounding-54321',
    title: '5-4-3-2-1 Grounding',
    description: 'A grounding exercise to bring your attention back to the present moment.',
    durationMinutes: 3,
    type: 'grounding',
    steps: [
      { text: 'Name 5 things you can see around you right now.', durationSeconds: 20 },
      { text: 'Name 4 things you can physically feel (floor under your feet, chair beneath you).', durationSeconds: 20 },
      { text: 'Name 3 things you can hear.', durationSeconds: 15 },
      { text: 'Name 2 things you can smell.', durationSeconds: 15 },
      { text: 'Name 1 thing you can taste.', durationSeconds: 10 },
    ],
  },
  {
    id: 'movement-break',
    title: 'Gentle Movement Break',
    description: 'Simple movements to refresh your body and mind after sitting for a study session.',
    durationMinutes: 5,
    type: 'movement',
    steps: [
      { text: 'Stand up and roll your shoulders back 5 times, then forward 5 times.', durationSeconds: 20 },
      { text: 'Gently tilt your head side to side, holding for a count of 3 each side.', durationSeconds: 15 },
      { text: 'Shake out your hands and fingers.', durationSeconds: 10 },
      { text: 'Take 10 slow, deep breaths while standing.', durationSeconds: 30 },
      { text: 'Walk around the room or stretch your legs for a few minutes.', durationSeconds: 120 },
    ],
  },
  {
    id: 'screen-break',
    title: '20-20-20 Eye Break',
    description: 'Relieve eye strain with this simple technique: every 20 minutes, look at something 20 feet away for 20 seconds.',
    durationMinutes: 1,
    type: 'screen',
    steps: [
      { text: 'Look away from your screen completely.', durationSeconds: 5 },
      { text: 'Find something at least 20 feet (6 metres) away and focus on it.', durationSeconds: 20 },
      { text: 'Blink slowly a few times to re-moisture your eyes.', durationSeconds: 10 },
      { text: 'Close your eyes briefly and breathe.', durationSeconds: 10 },
    ],
  },
  {
    id: 'task-decompose',
    title: 'Task Decomposition',
    description: 'When feeling overwhelmed, break your biggest task into the smallest possible next action.',
    durationMinutes: 5,
    type: 'reflection',
    steps: [
      { text: 'Write down the task or assignment that feels most overwhelming.', durationSeconds: 30 },
      { text: 'Ask: What is the very first physical action I need to take? (e.g., "open the document", not "write the essay")', durationSeconds: 30 },
      { text: 'Write down that single next action.', durationSeconds: 20 },
      { text: 'Ask: What comes right after that? Write it down too.', durationSeconds: 20 },
      { text: 'Pick just one of these micro-steps to start when your break ends.', durationSeconds: 20 },
    ],
  },
  {
    id: 'reflection-prompt',
    title: 'Short Reflection',
    description: 'A brief moment to acknowledge your progress and reset before continuing.',
    durationMinutes: 2,
    type: 'reflection',
    steps: [
      { text: 'What is one thing you actually accomplished in your last study session?', durationSeconds: 30 },
      { text: 'What made that easier or harder than expected?', durationSeconds: 30 },
      { text: 'What is one thing you want to focus on in the next session?', durationSeconds: 30 },
    ],
  },
];

app.get('/api/breaks/exercises', (_req, res) => res.json(BREAK_EXERCISES));

// ══════════════════════════════════════════════════════
//  BACKUP & RESTORE
// ══════════════════════════════════════════════════════
app.get('/api/backup', (_req, res) => {
  const backup = {
    appName: 'StudyFlow AI',
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    subjects:     readJson(files.subjects, []),
    tasks:        readJson(files.tasks, []),
    availability: readJson(files.availability, []),
    sessions:     readJson(files.sessions, []),
    checkins:     readJson(files.checkins, []),
    schedule:     readJson(files.schedule, {}),
    preferences:  readJson(files.preferences, {}),
    onboarding:   readJson(files.onboarding, {}),
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="studyflow-backup.json"');
  res.json(backup);
});

app.post('/api/restore', (req, res) => {
  const { subjects, tasks, availability, sessions, checkins, schedule, preferences } = req.body;
  if (!Array.isArray(tasks)) return res.status(400).json({ error: 'Invalid backup: missing tasks array' });
  if (subjects)     writeJson(files.subjects, subjects);
  if (tasks)        writeJson(files.tasks, tasks);
  if (availability) writeJson(files.availability, availability);
  if (sessions)     writeJson(files.sessions, sessions);
  if (checkins)     writeJson(files.checkins, checkins);
  if (schedule)     writeJson(files.schedule, schedule);
  if (preferences)  writeJson(files.preferences, preferences);
  res.json({ success: true, restoredTasks: tasks.length });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[StudyFlow Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`StudyFlow AI server running → http://localhost:${PORT}`);
});
