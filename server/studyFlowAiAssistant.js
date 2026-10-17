/**
 * StudyFlow AI — NVIDIA AI Assistant
 * Server-side only. API key never leaves the server.
 * Provides study planning guidance using NVIDIA hosted LLM.
 * Falls back gracefully when AI is unavailable.
 */

import { Router } from 'express';

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map(); // IP → { count, resetAt }
const RATE_LIMIT = 10; // requests per minute

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Prompt Builder ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are StudyFlow AI, a helpful study planning assistant for students. Your purpose is to help students:
- Break large assignments into manageable steps
- Understand why their study schedule may be unrealistic
- Suggest practical adjustments to study plans
- Recover after procrastination or missed study sessions
- Structure study sessions effectively
- Manage competing deadlines and priorities

Important guidelines:
- Use warm, encouraging, non-judgmental language
- Be concise and practical — give actionable advice
- Reference the student's actual tasks and schedule data when provided
- Do NOT diagnose mental health conditions or make clinical claims
- Do NOT modify databases or claim to execute actions directly
- Do NOT invent tasks, deadlines, or statistics not in the provided data
- Do NOT promise that AI can accurately measure psychological state
- If you suggest changes to the schedule, describe them clearly so the student can confirm
- Encourage realistic planning over perfect planning

You may discuss: study techniques, time management, breaking down tasks, managing procrastination, stress management strategies (non-clinical), schedule adjustments, and prioritization.`;
}

function buildUserContext(tasks, schedule, checkIns) {
  const activeTasks = (tasks || []).filter(t => !t.completed).slice(0, 10);
  const todaySessions = (schedule?.sessions || [])
    .filter(s => {
      const today = new Date().toISOString().slice(0, 10);
      return s.startTime?.startsWith(today);
    })
    .slice(0, 5);
  const recentCheckins = (checkIns || []).slice(0, 3);

  const parts = [];

  if (activeTasks.length > 0) {
    parts.push('## Current Tasks');
    activeTasks.forEach(t => {
      const remaining = t.estimatedHours * (1 - (t.progressPercent || 0) / 100);
      const deadlineDays = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      parts.push(`- "${t.title}" | Type: ${t.type} | Priority: ${t.priority} | Deadline: ${deadlineDays}d | ~${remaining.toFixed(1)}h remaining`);
    });
  } else {
    parts.push('## Current Tasks\nNo active tasks.');
  }

  if (todaySessions.length > 0) {
    parts.push('\n## Today\'s Scheduled Sessions');
    todaySessions.forEach(s => {
      const start = new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      parts.push(`- ${start}: "${s.taskTitle}" (${s.durationMinutes}min)`);
    });
  }

  if (recentCheckins.length > 0) {
    const avg = c => recentCheckins.reduce((s, r) => s + r[c], 0) / recentCheckins.length;
    parts.push(`\n## Recent Check-ins\nAverage stress: ${avg('stressLevel').toFixed(1)}/5 | Average focus: ${avg('focusLevel').toFixed(1)}/5`);
  }

  return parts.join('\n');
}

// ── NVIDIA API Call ────────────────────────────────────────────────────────────
async function callNvidiaApi(messages) {
  const apiKey  = process.env.NVIDIA_API_KEY;
  const baseUrl = process.env.NVIDIA_BASE_URL  || 'https://integrate.api.nvidia.com/v1';
  const model   = process.env.NVIDIA_MODEL     || 'nvidia/llama-3.1-nemotron-70b-instruct';
  const timeout = parseInt(process.env.NVIDIA_TIMEOUT_SECONDS || '30') * 1000;

  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not configured. Set it in your .env file.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: 512,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`NVIDIA API error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from NVIDIA API');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

// ── Router Factory ─────────────────────────────────────────────────────────────
export function createAiRouter({ getTasks, getSchedule, getCheckins }) {
  const router = Router();

  router.post('/assist', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many AI requests. Please wait a minute before trying again.' });
    }

    const { message, conversationHistory = [] } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message is too long. Please keep it under 1000 characters.' });
    }
    if (conversationHistory.length > 20) {
      return res.status(400).json({ error: 'Conversation is too long. Start a new conversation.' });
    }

    // Gather student context (only non-sensitive scheduling data)
    const tasks    = getTasks();
    const schedule = getSchedule();
    const checkins = getCheckins();
    const context  = buildUserContext(tasks, schedule, checkins);

    const systemPrompt = buildSystemPrompt();
    const contextMessage = context
      ? `\n\nStudent context (for reference):\n${context}`
      : '';

    const messages = [
      { role: 'system', content: systemPrompt + contextMessage },
      ...conversationHistory.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message.trim() },
    ];

    try {
      const aiResponse = await callNvidiaApi(messages);

      // Basic validation: ensure non-empty, reasonable length
      if (!aiResponse || aiResponse.length < 5) {
        throw new Error('AI returned an empty or invalid response');
      }

      res.json({
        message: aiResponse,
        model: process.env.NVIDIA_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[AI Assistant Error]', err.message);

      if (err.name === 'AbortError') {
        return res.status(504).json({
          error: 'The AI assistant took too long to respond. Please try again.',
          fallback: true,
        });
      }

      if (err.message.includes('NVIDIA_API_KEY')) {
        return res.status(503).json({
          error: 'AI assistant is not configured. Add your NVIDIA_API_KEY to the .env file.',
          fallback: true,
        });
      }

      return res.status(503).json({
        error: 'AI assistant is temporarily unavailable. Your study schedule and tasks still work normally.',
        fallback: true,
      });
    }
  });

  return router;
}
