/**
 * StudyFlow AI — Workload Analyzer
 * Detects overload signals from tasks, availability, sessions, and check-ins.
 * Uses explainable thresholds — no black-box AI scoring.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────
function remainingHours(task) {
  const pct = Math.min(100, Math.max(0, task.progressPercent || 0));
  return task.estimatedHours * (1 - pct / 100);
}

function totalAvailableHoursPerWeek(availability) {
  if (!availability || availability.length === 0) return 0;
  return availability.reduce((total, w) => {
    const [sh, sm] = (w.startTime || '09:00').split(':').map(Number);
    const [eh, em] = (w.endTime   || '11:00').split(':').map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    return total + Math.max(0, hours);
  }, 0);
}

function daysUntil(deadline) {
  return (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

// ── Main Analysis ─────────────────────────────────────────────────────────────
export function analyzeWorkload(tasks, availability, sessions, checkIns = []) {
  const activeTasks = (tasks || []).filter(t => !t.completed);
  const totalRequired = activeTasks.reduce((s, t) => s + remainingHours(t), 0);
  const weeklyAvailable = totalAvailableHoursPerWeek(availability);

  const signals = [];
  let overallSeverity = 'low'; // low | medium | high

  // ── Signal 1: Required hours exceed near-term availability ─────────────────
  if (weeklyAvailable === 0 && activeTasks.length > 0) {
    signals.push({
      type: 'no_availability',
      severity: 'high',
      title: 'No study time configured',
      message: `You have ${activeTasks.length} active task(s) but no study availability is set.`,
      suggestions: ['Add your available study windows in Settings → Availability'],
    });
    overallSeverity = 'high';
  } else if (weeklyAvailable > 0 && totalRequired > weeklyAvailable * 2) {
    signals.push({
      type: 'workload_excess',
      severity: 'high',
      title: 'Workload may be unrealistic',
      message: `Your tasks require approximately ${totalRequired.toFixed(1)} study hours, but you have about ${weeklyAvailable.toFixed(1)} hours available per week. At this rate, some tasks may not be completable on time.`,
      suggestions: [
        'Review which tasks are most critical and focus on those first',
        'Check if any deadlines can be adjusted',
        'Increase your available study time if possible',
        'Break large tasks into smaller milestones',
      ],
    });
    overallSeverity = 'high';
  } else if (weeklyAvailable > 0 && totalRequired > weeklyAvailable * 1.2) {
    signals.push({
      type: 'workload_tight',
      severity: 'medium',
      title: 'Schedule is tight',
      message: `Required study time (${totalRequired.toFixed(1)}h) slightly exceeds available time (${weeklyAvailable.toFixed(1)}h/week). Prioritise carefully.`,
      suggestions: [
        'Focus on high-priority tasks first',
        'Consider requesting extensions for lower-priority work',
      ],
    });
    if (overallSeverity === 'low') overallSeverity = 'medium';
  }

  // ── Signal 2: Upcoming deadline clustering ─────────────────────────────────
  const urgentTasks = activeTasks.filter(t => daysUntil(t.deadline) <= 3 && daysUntil(t.deadline) >= 0);
  if (urgentTasks.length >= 3) {
    signals.push({
      type: 'deadline_cluster',
      severity: 'high',
      title: 'Multiple deadlines in 3 days',
      message: `${urgentTasks.length} tasks are due within 3 days: ${urgentTasks.map(t => `"${t.title}"`).join(', ')}.`,
      suggestions: [
        'Prioritize by importance and difficulty',
        'Start with the task that has the least remaining work',
        'Contact instructors about any that cannot realistically be completed',
      ],
    });
    if (overallSeverity !== 'high') overallSeverity = 'high';
  } else if (urgentTasks.length === 2) {
    signals.push({
      type: 'deadline_cluster',
      severity: 'medium',
      title: '2 deadlines within 3 days',
      message: `"${urgentTasks[0].title}" and "${urgentTasks[1].title}" are both due within 3 days.`,
      suggestions: ['Plan which to tackle first', 'Protect your study time today'],
    });
    if (overallSeverity === 'low') overallSeverity = 'medium';
  }

  // ── Signal 3: Overdue tasks ────────────────────────────────────────────────
  const overdueTasks = activeTasks.filter(t => daysUntil(t.deadline) < 0);
  if (overdueTasks.length > 0) {
    signals.push({
      type: 'overdue',
      severity: 'high',
      title: `${overdueTasks.length} overdue task(s)`,
      message: `The following tasks are past their deadline: ${overdueTasks.map(t => `"${t.title}"`).join(', ')}.`,
      suggestions: [
        'Contact your instructor as soon as possible',
        'Mark tasks as complete if already submitted',
        'Update deadlines if extensions were granted',
      ],
    });
    if (overallSeverity !== 'high') overallSeverity = 'high';
  }

  // ── Signal 4: Rising stress from check-ins ────────────────────────────────
  const recentCheckins = (checkIns || [])
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  if (recentCheckins.length >= 3) {
    const avgStress = recentCheckins.reduce((s, c) => s + c.stressLevel, 0) / recentCheckins.length;
    if (avgStress >= 4) {
      signals.push({
        type: 'high_stress',
        severity: 'medium',
        title: 'Elevated stress trend',
        message: `Your recent check-ins show an average stress level of ${avgStress.toFixed(1)}/5. This is worth paying attention to.`,
        suggestions: [
          'Take a short break before your next session',
          'Try a guided breathing or grounding exercise',
          'Consider whether your current plan is realistic',
          'Talk to someone you trust if the stress feels overwhelming',
        ],
      });
      if (overallSeverity === 'low') overallSeverity = 'medium';
    }
  }

  // ── Signal 5: Missed sessions accumulating ─────────────────────────────────
  const now = new Date();
  const missedSessions = (sessions || []).filter(
    s => s.state === 'scheduled' && new Date(s.endTime) < now
  );
  if (missedSessions.length >= 3) {
    signals.push({
      type: 'missed_sessions',
      severity: 'medium',
      title: `${missedSessions.length} unstarted past sessions`,
      message: `${missedSessions.length} sessions have passed without being started. Consider replanning your schedule.`,
      suggestions: [
        'Use "Replan my day" to redistribute missed work',
        'Check if your schedule is too ambitious',
        'Start with a shorter session today to get back on track',
      ],
    });
    if (overallSeverity === 'low') overallSeverity = 'medium';
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const upcomingDeadlines = activeTasks
    .filter(t => daysUntil(t.deadline) >= 0 && daysUntil(t.deadline) <= 14)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  return {
    overallSeverity,
    signals,
    stats: {
      activeTasks: activeTasks.length,
      overdueTasks: overdueTasks.length,
      urgentTasks: urgentTasks.length,
      totalRequiredHours: parseFloat(totalRequired.toFixed(2)),
      weeklyAvailableHours: parseFloat(weeklyAvailable.toFixed(2)),
      missedSessions: missedSessions.length,
      upcomingDeadlines: upcomingDeadlines.slice(0, 5),
    },
  };
}
