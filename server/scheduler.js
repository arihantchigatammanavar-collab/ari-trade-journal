/**
 * StudyFlow AI — Deterministic Scheduling Engine
 * 
 * This module converts student tasks + availability windows into
 * concrete, realistic study sessions. It works entirely without AI.
 * All logic is transparent, explainable, and independently testable.
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITY_SCORE = { critical: 4, high: 3, medium: 2, low: 1 };
const DEFAULT_SESSION_MINUTES = 45;
const DEFAULT_BREAK_MINUTES = 10;
const DEFAULT_MAX_DAILY_HOURS = 6;
const MAX_SCHEDULE_DAYS = 60; // look ahead up to 60 days

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse "HH:MM" into { h, m } */
function parseTime(timeStr) {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

/** Set time on a Date object, returning a new Date */
function setTime(date, timeStr) {
  const d = new Date(date);
  const { h, m } = parseTime(timeStr);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Add minutes to a Date */
function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

/** Check if date A < date B */
function isBefore(a, b) { return a.getTime() < b.getTime(); }

/** Days between two dates (positive if deadline in future) */
function daysUntil(deadline, now) {
  return (new Date(deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
}

/** Remaining hours for a task based on progress */
function remainingHours(task) {
  const pct = Math.min(100, Math.max(0, task.progressPercent || 0));
  return task.estimatedHours * (1 - pct / 100);
}

/** Calculate urgency score (higher = more urgent) */
function urgencyScore(task, now) {
  const days = daysUntil(task.deadline, now);
  const remaining = remainingHours(task);
  const priority = PRIORITY_SCORE[task.priority] || 2;

  if (days <= 0) return 1000 + priority; // Overdue: highest urgency
  if (days <= 1) return 100 + priority * 10 + (remaining / days);
  if (days <= 3) return 50 + priority * 5 + (remaining / days);
  return priority * 3 + (remaining / Math.max(days, 0.1));
}

// ── Slot Expansion ─────────────────────────────────────────────────────────────

/**
 * Expand weekly availability windows into concrete time slots for the next N days.
 * Returns array of { start: Date, end: Date, dayOfWeek, date }.
 */
function expandAvailability(availability, now, maxDays) {
  if (!availability || availability.length === 0) return [];

  const slots = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let d = 0; d < maxDays; d++) {
    const day = new Date(today);
    day.setDate(today.getDate() + d);
    const dow = day.getDay(); // 0 = Sunday

    const dayWindows = availability.filter(w => w.dayOfWeek === dow);
    for (const window of dayWindows) {
      const start = setTime(day, window.startTime);
      const end   = setTime(day, window.endTime);
      if (end <= start) continue; // skip invalid windows
      if (end <= now) continue;   // skip windows fully in the past
      const effectiveStart = isBefore(start, now) ? now : start;
      if (effectiveStart >= end) continue;
      slots.push({ start: effectiveStart, end, dayOfWeek: dow, date: day.toISOString().slice(0, 10) });
    }
  }

  return slots.sort((a, b) => a.start - b.start);
}

// ── Session Assignment ─────────────────────────────────────────────────────────

/**
 * Main scheduling function.
 * 
 * @param {object} options
 * @param {Array}  options.tasks
 * @param {Array}  options.availability
 * @param {object} options.preferences
 * @param {Array}  options.existingSessions - already-completed sessions to skip
 * @param {string} options.currentDateTime
 * @returns {object} Schedule result
 */
export function createSchedule({ tasks, availability, preferences, existingSessions = [], currentDateTime }) {
  const now = new Date(currentDateTime || new Date());
  const prefs = {
    maxDailyHours:         preferences?.maxDailyHours         ?? DEFAULT_MAX_DAILY_HOURS,
    sessionDurationMinutes: preferences?.sessionDurationMinutes ?? DEFAULT_SESSION_MINUTES,
    breakDurationMinutes:   preferences?.breakDurationMinutes   ?? DEFAULT_BREAK_MINUTES,
  };

  // Filter incomplete tasks with remaining work
  const activeTasks = tasks
    .filter(t => !t.completed && remainingHours(t) > 0.01)
    .map(t => ({ ...t, _remaining: remainingHours(t), _urgency: urgencyScore(t, now) }))
    .sort((a, b) => b._urgency - a._urgency);

  if (activeTasks.length === 0) {
    return {
      sessions: [],
      unscheduledTasks: [],
      workloadWarnings: [],
      conflicts: [],
      summary: { totalScheduledHours: 0, totalRequiredHours: 0, feasible: true, warningCount: 0 },
    };
  }

  // Expand availability into concrete slots
  const slots = expandAvailability(availability, now, MAX_SCHEDULE_DAYS);
  if (slots.length === 0) {
    return {
      sessions: [],
      unscheduledTasks: activeTasks.map(t => ({ taskId: t.id, taskTitle: t.title, reason: 'No availability windows configured' })),
      workloadWarnings: [{ type: 'no_availability', message: 'No study availability is configured. Add your available study times to generate a schedule.', severity: 'high', suggestions: ['Go to Availability settings and add your study windows'] }],
      conflicts: [],
      summary: { totalScheduledHours: 0, totalRequiredHours: activeTasks.reduce((s, t) => s + t._remaining, 0), feasible: false, warningCount: 1 },
    };
  }

  // Track usage per day
  const dailyUsedMinutes = {};
  const maxDailyMinutes = prefs.maxDailyHours * 60;
  const sessionMins = prefs.sessionDurationMinutes;
  const breakMins   = prefs.breakDurationMinutes;

  // Slot cursor for each slot's consumed time
  const slotCursors = slots.map(s => ({ ...s, cursor: new Date(s.start) }));

  const sessions = [];
  const unscheduledTasks = [];
  const workloadWarnings = [];
  const conflicts = [];

  // Assign sessions to tasks
  for (const task of activeTasks) {
    let hoursLeft = task._remaining;
    const taskDeadline = new Date(task.deadline);
    const isOverdue = taskDeadline <= now;

    let taskScheduled = false;
    let taskSessions = 0;

    for (const slot of slotCursors) {
      if (hoursLeft <= 0.01) break;

      // Don't schedule sessions after the deadline
      if (!isOverdue && slot.cursor >= taskDeadline) {
        continue;
      }

      const dateKey = slot.date;
      const usedMins = dailyUsedMinutes[dateKey] || 0;
      if (usedMins >= maxDailyMinutes) continue;

      const remainingDayMins = maxDailyMinutes - usedMins;
      const remainingSlotMins = Math.floor((slot.end.getTime() - slot.cursor.getTime()) / 60000);
      const availableMins = Math.min(remainingDayMins, remainingSlotMins);

      if (availableMins < 15) continue; // Skip tiny slots

      const sessionLengthMins = Math.min(sessionMins, availableMins, Math.ceil(hoursLeft * 60));
      if (sessionLengthMins < 15) continue;

      const sessionStart = new Date(slot.cursor);
      const sessionEnd   = addMinutes(sessionStart, sessionLengthMins);

      // Don't schedule past deadline (for non-overdue tasks)
      if (!isOverdue && sessionEnd > taskDeadline) {
        const adjustedLen = Math.floor((taskDeadline.getTime() - sessionStart.getTime()) / 60000);
        if (adjustedLen < 15) continue;
      }

      const sid = crypto.randomUUID();
      sessions.push({
        id: sid,
        taskId: task.id,
        taskTitle: task.title,
        subjectId: task.subjectId,
        type: task.type,
        startTime: sessionStart.toISOString(),
        endTime: sessionEnd.toISOString(),
        durationMinutes: sessionLengthMins,
        breakAfterMinutes: breakMins,
        date: dateKey,
        priority: task.priority,
      });

      // Advance slot cursor (session + break)
      slot.cursor = addMinutes(sessionEnd, breakMins);
      dailyUsedMinutes[dateKey] = (dailyUsedMinutes[dateKey] || 0) + sessionLengthMins + breakMins;

      hoursLeft -= sessionLengthMins / 60;
      taskSessions++;
      taskScheduled = true;
    }

    if (hoursLeft > 0.01) {
      const reason = isOverdue
        ? `Deadline has passed (${new Date(task.deadline).toLocaleDateString()}). ${hoursLeft.toFixed(1)}h still unscheduled.`
        : `Not enough available study time before the deadline. ${hoursLeft.toFixed(1)}h could not be scheduled.`;

      if (taskScheduled) {
        // Partially scheduled — warn but don't mark as fully unscheduled
        workloadWarnings.push({
          type: 'partial_schedule',
          taskId: task.id,
          message: `"${task.title}" is partially scheduled: ${hoursLeft.toFixed(1)}h could not fit before the deadline.`,
          severity: 'high',
          suggestions: [
            'Add more availability windows',
            'Reduce session duration for other tasks',
            `Consider requesting a deadline extension for "${task.title}"`,
          ],
        });
      } else {
        unscheduledTasks.push({ taskId: task.id, taskTitle: task.title, reason });
      }
    }
  }

  // ── Overload Detection ──────────────────────────────────────────────────────
  const overloadedDays = Object.entries(dailyUsedMinutes)
    .filter(([, mins]) => mins > maxDailyMinutes * 0.9)
    .map(([date, mins]) => ({ date, hours: (mins / 60).toFixed(1) }));

  if (overloadedDays.length > 0) {
    workloadWarnings.push({
      type: 'daily_overload',
      message: `${overloadedDays.length} day(s) are at or near your maximum daily study limit (${prefs.maxDailyHours}h). This plan may be tiring.`,
      severity: overloadedDays.length > 2 ? 'high' : 'medium',
      affectedDays: overloadedDays,
      suggestions: [
        'Increase your maximum daily study hours if realistic',
        'Spread sessions across more days',
        'Prioritize the most critical tasks and defer lower-priority ones',
      ],
    });
  }

  // Deadline clustering warning
  const deadlinesByDate = {};
  activeTasks.forEach(t => {
    const d = new Date(t.deadline).toISOString().slice(0, 10);
    deadlinesByDate[d] = (deadlinesByDate[d] || 0) + 1;
  });
  const clusteredDates = Object.entries(deadlinesByDate).filter(([, c]) => c >= 2);
  if (clusteredDates.length > 0) {
    workloadWarnings.push({
      type: 'deadline_cluster',
      message: `Multiple deadlines are close together: ${clusteredDates.map(([d, c]) => `${c} tasks on ${d}`).join(', ')}.`,
      severity: 'medium',
      suggestions: [
        'Start the most important task early',
        'Check if any deadlines are flexible',
        'Focus sessions on the highest-priority task first',
      ],
    });
  }

  // Overdue tasks warning
  const overdueTasks = activeTasks.filter(t => new Date(t.deadline) <= now);
  if (overdueTasks.length > 0) {
    workloadWarnings.push({
      type: 'overdue_tasks',
      message: `${overdueTasks.length} task(s) have passed their deadline: ${overdueTasks.map(t => `"${t.title}"`).join(', ')}.`,
      severity: 'high',
      suggestions: [
        'Contact your instructor about an extension',
        'Complete these tasks as soon as possible',
        'Mark tasks as complete if already submitted',
      ],
    });
  }

  const totalRequired  = activeTasks.reduce((s, t) => s + t._remaining, 0);
  const totalScheduled = sessions.reduce((s, s2) => s + s2.durationMinutes / 60, 0);

  return {
    sessions,
    unscheduledTasks,
    workloadWarnings,
    conflicts,
    summary: {
      totalScheduledHours:  parseFloat(totalScheduled.toFixed(2)),
      totalRequiredHours:   parseFloat(totalRequired.toFixed(2)),
      feasible:             unscheduledTasks.length === 0 && workloadWarnings.filter(w => w.severity === 'high').length === 0,
      warningCount:         workloadWarnings.length,
      sessionsCount:        sessions.length,
      tasksScheduled:       activeTasks.length - unscheduledTasks.length,
      tasksUnscheduled:     unscheduledTasks.length,
    },
  };
}

// ── Replanning ─────────────────────────────────────────────────────────────────

/**
 * Replan after missed sessions. Preserves completed work and hard deadlines.
 * 
 * @param {object} options
 * @returns {object} New schedule with changes summary
 */
export function replanSchedule({ tasks, availability, preferences, completedSessions = [], activeSessions = [], missedTaskIds = [], currentDateTime }) {
  const now = new Date(currentDateTime || new Date());

  // Calculate hours already completed per task from completed sessions
  const completedHoursPerTask = {};
  completedSessions.forEach(s => {
    if (s.taskId && s.actualDurationMinutes) {
      completedHoursPerTask[s.taskId] = (completedHoursPerTask[s.taskId] || 0) + s.actualDurationMinutes / 60;
    }
  });

  // Adjust task estimates based on what's been completed
  const adjustedTasks = tasks
    .filter(t => !t.completed)
    .map(t => {
      const completedHours = completedHoursPerTask[t.id] || 0;
      const adjustedRemaining = Math.max(0, remainingHours(t) - completedHours);
      return { ...t, estimatedHours: adjustedRemaining + completedHours, progressPercent: t.progressPercent, _adjustedRemaining: adjustedRemaining };
    })
    .filter(t => t._adjustedRemaining > 0.01);

  // Generate new schedule from now
  const result = createSchedule({
    tasks: adjustedTasks.map(t => ({ ...t, estimatedHours: t._adjustedRemaining, progressPercent: 0 })),
    availability,
    preferences,
    existingSessions: completedSessions,
    currentDateTime: now.toISOString(),
  });

  // Summarize changes
  const changes = [];
  if (missedTaskIds.length > 0) {
    const missedTasks = tasks.filter(t => missedTaskIds.includes(t.id));
    changes.push(`${missedTaskIds.length} missed session(s) rescheduled for: ${missedTasks.map(t => `"${t.title}"`).join(', ')}`);
  }
  if (completedSessions.length > 0) {
    changes.push(`${completedSessions.length} completed session(s) preserved`);
  }
  if (result.unscheduledTasks.length > 0) {
    changes.push(`${result.unscheduledTasks.length} task(s) could not be rescheduled before their deadlines`);
  }

  return { ...result, changes };
}
