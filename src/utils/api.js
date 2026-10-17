/**
 * Ari and legacy API clients. All requests stay same-origin under /api.
 */

const BASE = '/api';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try { const d = await res.json(); errMsg = d.error || errMsg; } catch { /* noop */ }
    throw new Error(errMsg);
  }
  return res.json();
}

const get  = (path)        => request('GET',    path);
const post = (path, body)  => request('POST',   path, body);
const put  = (path, body)  => request('PUT',    path, body);
const del  = (path)        => request('DELETE', path);

export const api = {
  // Ari Trading Journal
  checkHealth:   ()             => get('/ari/health'),
  getTrades:     ()             => get('/ari/trades'),
  createTrade:   (data)         => post('/ari/trades', data),
  updateTrade:   (id, data)     => put(`/ari/trades/${encodeURIComponent(id)}`, data),
  deleteTrade:   (id)           => del(`/ari/trades/${encodeURIComponent(id)}`),
  getStrategies: ()             => get('/ari/strategies'),
  saveStrategy:  (data)         => post('/ari/strategies', data),
  getReviews:    ()             => get('/ari/reviews'),
  saveReview:    (data)         => post('/ari/reviews', data),
  getSettings:   ()             => get('/ari/settings'),
  saveSettings:  (data)         => put('/ari/settings', data),
  restoreBackup: (data)         => post('/ari/restore', data),
  downloadBackup:()             => window.open(`${BASE}/ari/backup`, '_blank'),
  downloadCsv:   ()             => window.open(`${BASE}/ari/trades.csv`, '_blank'),
  askJournalAI:  (prompt, history) => post('/ai/chat', { prompt, conversationHistory: history || [] }),
  getAiStatus:   ()             => get('/ai/status'),
  uploadScreenshot: async (file) => {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${BASE}/ari/screenshots`, { method: 'POST', body });
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try { message = (await response.json()).error || message; } catch { /* noop */ }
      throw new Error(message);
    }
    return response.json();
  },

  // Health
  health: () => get('/health'),

  // Onboarding
  getOnboarding:  ()     => get('/onboarding'),
  saveOnboarding: (data) => post('/onboarding', data),

  // Preferences
  getPreferences:  ()     => get('/preferences'),
  savePreferences: (data) => put('/preferences', data),

  // Subjects
  getSubjects:   ()           => get('/subjects'),
  createSubject: (data)       => post('/subjects', data),
  updateSubject: (id, data)   => put(`/subjects/${id}`, data),
  deleteSubject: (id)         => del(`/subjects/${id}`),

  // Tasks
  getTasks:   ()           => get('/tasks'),
  createTask: (data)       => post('/tasks', data),
  updateTask: (id, data)   => put(`/tasks/${id}`, data),
  deleteTask: (id)         => del(`/tasks/${id}`),
  completeTask: (id)       => put(`/tasks/${id}`, { completed: true }),

  // Availability
  getAvailability:  ()     => get('/availability'),
  saveAvailability: (data) => put('/availability', data),

  // Schedule
  generateSchedule: (opts) => post('/schedule/generate', opts || {}),
  getSchedule:      ()     => get('/schedule'),
  replanSchedule:   (opts) => post('/schedule/replan', opts || {}),

  // Focus Sessions
  getSessions:     ()     => get('/sessions'),
  startSession:    (id)   => post(`/sessions/${id}/start`),
  pauseSession:    (id)   => post(`/sessions/${id}/pause`),
  resumeSession:   (id)   => post(`/sessions/${id}/resume`),
  completeSession: (id, note) => post(`/sessions/${id}/complete`, { note }),
  cancelSession:   (id)   => post(`/sessions/${id}/cancel`),

  // Check-ins
  getCheckins:   ()     => get('/checkins'),
  saveCheckin:   (data) => post('/checkins', data),

  // Workload
  getWorkload: () => get('/workload'),

  // Progress
  getProgress: () => get('/progress'),

  // Break exercises
  getExercises: () => get('/breaks/exercises'),

  // AI Assistant
  askAI: (message, history) => post('/ai/assist', { message, conversationHistory: history || [] }),

  // Backup
  downloadBackup: () => window.open(`${BASE}/backup`, '_blank'),
  restoreBackup:  (data) => post('/restore', data),
};
