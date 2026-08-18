const User = require('../models/User');
const UserStat = require('../models/UserStat');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const { notify } = require('./notifications');

// ============================================================================
// Gamification engine (event-driven, tenant-scoped, fail-safe).
//
// Controllers call the fire-and-forget `triggerActivity(...)` after a primary
// operation succeeds. It schedules the work off the request path (setImmediate)
// and NEVER throws — a gamification failure must never affect the main flow.
// ============================================================================

// XP awarded per activity type.
const XP = {
  submission: 10,
  perfect_score: 20,
  lecture_complete: 5,
  course_complete: 50,
  chat_message: 1,
  daily_login: 2,
};

// Maps a badge's criteriaType to the UserStat field it is evaluated against.
const CRITERIA_FIELD = {
  submission_count: 'submissionCount',
  streak_days: 'streakDays',
  lecture_completion: 'lecturesCompleted',
  course_completion: 'coursesCompleted',
  chat_messages: 'chatMessagesSent',
  perfect_score: 'perfectScores',
};

// Midnight-aligned day index (local) for streak comparisons.
const dayNumber = (date) => Math.floor(new Date(date).setHours(0, 0, 0, 0) / 86400000);

const resolveTenantId = async (studentId) => {
  try {
    const user = await User.findById(studentId).select('tenantId');
    return user?.tenantId || 'default';
  } catch {
    return 'default';
  }
};

// Fetch (or lazily create) the student's single stat document.
const getOrCreateStat = async (studentId, tenantId) => {
  let stat = await UserStat.findOne({ student: studentId });
  if (!stat) {
    stat = await UserStat.create({ student: studentId, tenantId });
  }
  return stat;
};

// Apply the effect of one activity onto the stat doc (in memory). Returns false
// when the activity was a no-op (e.g. a second login on the same day) so the
// caller can skip an unnecessary save/badge pass.
const applyActivity = (stat, activityType) => {
  switch (activityType) {
    case 'submission':
      stat.submissionCount += 1;
      stat.totalXp += XP.submission;
      return true;
    case 'perfect_score':
      stat.perfectScores += 1;
      stat.totalXp += XP.perfect_score;
      return true;
    case 'lecture_complete':
      stat.lecturesCompleted += 1;
      stat.totalXp += XP.lecture_complete;
      return true;
    case 'course_complete':
      stat.coursesCompleted += 1;
      stat.totalXp += XP.course_complete;
      return true;
    case 'chat_message':
      stat.chatMessagesSent += 1;
      stat.totalXp += XP.chat_message;
      return true;
    case 'daily_login': {
      const today = dayNumber(Date.now());
      if (stat.lastActivityDate) {
        const last = dayNumber(stat.lastActivityDate);
        if (last === today) {
          return false; // already counted today — no farming, no extra XP
        }
        stat.streakDays = last === today - 1 ? (stat.streakDays || 0) + 1 : 1;
      } else {
        stat.streakDays = 1;
      }
      stat.lastActivityDate = new Date();
      stat.totalXp += XP.daily_login;
      return true;
    }
    default:
      return false;
  }
};

// Evaluate every badge in the student's tenant against their current stats and
// award any newly-earned badge they do not already hold. Sends an in-app
// notification per new award (reusing the shared, fail-safe `notify` helper).
const checkAndAwardBadges = async (studentId, stat, tenantId) => {
  const currentStat = stat || (await UserStat.findOne({ student: studentId }));
  if (!currentStat) return;
  const scope = tenantId || currentStat.tenantId || 'default';

  const [badges, owned] = await Promise.all([
    Badge.find({ tenantId: scope }),
    UserBadge.find({ student: studentId }).select('badge'),
  ]);

  const ownedIds = new Set(owned.map((entry) => entry.badge.toString()));

  for (const badge of badges) {
    if (ownedIds.has(badge._id.toString())) continue;

    const field = CRITERIA_FIELD[badge.criteriaType];
    const value = field ? currentStat[field] || 0 : 0;
    if (value < badge.criteriaValue) continue;

    try {
      await UserBadge.create({ student: studentId, badge: badge._id, tenantId: scope });
    } catch (error) {
      // Unique {student, badge} index -> a concurrent award already exists; skip.
      if (error.code === 11000) continue;
      throw error;
    }

    // Fire-and-forget in-app notification (never blocks / breaks the award).
    await notify(studentId, {
      type: 'BADGE_AWARDED',
      title: '🎉 مبروك! حصلت على شارة جديدة',
      message: `لقد حصلت على شارة «${badge.name}»`,
      link: '/student/achievements',
      tenantId: scope,
    });
  }
};

// Core worker: update stats for one activity, then re-evaluate badges.
const processStudentActivity = async (studentId, activityType, metadata = {}) => {
  if (!studentId || !activityType) return;

  const tenantId = await resolveTenantId(studentId);
  const stat = await getOrCreateStat(studentId, tenantId);

  const changed = applyActivity(stat, activityType);
  if (!changed) return; // no-op activity (e.g. same-day login) — nothing to do

  await stat.save();
  await checkAndAwardBadges(studentId, stat, tenantId);
};

// Fire-and-forget entry point for controllers. Non-blocking (runs after the
// current request tick) and swallows every error — the caller never awaits it.
const triggerActivity = (studentId, activityType, metadata = {}) => {
  setImmediate(() => {
    processStudentActivity(studentId, activityType, metadata).catch((error) => {
      console.error(`gamification[${activityType}] error:`, error.message);
    });
  });
};

module.exports = {
  XP,
  processStudentActivity,
  checkAndAwardBadges,
  triggerActivity,
};
