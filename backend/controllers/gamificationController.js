const mongoose = require('mongoose');

const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const UserStat = require('../models/UserStat');
const Enrollment = require('../models/Enrollment');
const { resolveCourseAccess } = require('../utils/courseAccess');

// Resolve the caller's tenant. Missing req.tenantId (should not happen after
// protect) falls back to the shared 'default' tenant with a warning.
const getTenantId = (req) => {
  if (!req.tenantId) {
    console.warn('gamificationController: req.tenantId missing — defaulting to "default" tenant');
  }
  return req.tenantId || 'default';
};

// GET /api/gamification/badges — the caller's awarded badges + their total XP.
const getMyBadges = async (req, res) => {
  try {
    const [awarded, stat] = await Promise.all([
      UserBadge.find({ student: req.user._id })
        .populate('badge')
        .sort({ awardedAt: -1 }),
      UserStat.findOne({ student: req.user._id }),
    ]);

    // Drop any award whose badge definition was removed (populate -> null).
    const badges = awarded
      .filter((entry) => entry.badge)
      .map((entry) => ({
        _id: entry.badge._id,
        name: entry.badge.name,
        description: entry.badge.description,
        icon: entry.badge.icon,
        color: entry.badge.color,
        criteria: entry.badge.criteria,
        criteriaType: entry.badge.criteriaType,
        criteriaValue: entry.badge.criteriaValue,
        awardedAt: entry.awardedAt,
      }));

    return res.json({
      success: true,
      totalXp: stat?.totalXp || 0,
      stats: stat
        ? {
            submissionCount: stat.submissionCount,
            perfectScores: stat.perfectScores,
            streakDays: stat.streakDays,
            lecturesCompleted: stat.lecturesCompleted,
            coursesCompleted: stat.coursesCompleted,
            chatMessagesSent: stat.chatMessagesSent,
          }
        : null,
      count: badges.length,
      data: badges,
    });
  } catch (error) {
    console.error('getMyBadges error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/gamification/available — every badge defined in the caller's tenant
// (so the UI can render locked badges with their criteria).
const getAvailableBadges = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const filter = {};
    if (req.user?.role !== 'superadmin') {
      filter.tenantId = tenantId;
    }

    const badges = await Badge.find(filter).sort({ criteriaType: 1, criteriaValue: 1 });
    return res.json({ success: true, count: badges.length, data: badges });
  } catch (error) {
    console.error('getAvailableBadges error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/gamification/leaderboard/course/:courseId — students enrolled in the
// course ranked by total XP. Access is gated by resolveCourseAccess (enrolled
// students, the owning teacher, and managers) and is tenant-scoped throughout.
const getCourseLeaderboard = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) {
      return res.status(400).json({ success: false, message: 'معرف الكورس غير صالح' });
    }

    // Authorization: a student must be enrolled; teacher must own; managers pass.
    const access = await resolveCourseAccess({
      courseId: req.params.courseId,
      user: req.user,
      allowStudent: true,
    });
    if (!access.course) {
      return res.status(access.statusCode).json({ success: false, message: access.message });
    }

    // Tenant-scoped roster of active enrolments for this course.
    const enrollmentFilter = { course: access.course._id, isActive: true };
    if (req.user?.role !== 'superadmin') {
      enrollmentFilter.tenantId = getTenantId(req);
    }

    const enrollments = await Enrollment.find(enrollmentFilter).populate('student', 'name studentId');
    const students = enrollments.filter((entry) => entry.student);
    const studentIds = students.map((entry) => entry.student._id);

    if (studentIds.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // Batch-load stats and badge counts for the roster (two grouped queries).
    const [stats, badgeCounts] = await Promise.all([
      UserStat.find({ student: { $in: studentIds } }).select('student totalXp'),
      UserBadge.aggregate([
        { $match: { student: { $in: studentIds } } },
        { $group: { _id: '$student', count: { $sum: 1 } } },
      ]),
    ]);

    const xpByStudent = new Map(stats.map((s) => [s.student.toString(), s.totalXp || 0]));
    const badgesByStudent = new Map(badgeCounts.map((b) => [b._id.toString(), b.count]));
    const myId = req.user._id.toString();

    const leaderboard = students
      .map((entry) => {
        const id = entry.student._id.toString();
        return {
          studentId: id,
          name: entry.student.name,
          xp: xpByStudent.get(id) || 0,
          badges: badgesByStudent.get(id) || 0,
          isCurrentUser: id === myId,
        };
      })
      .sort((a, b) => b.xp - a.xp)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return res.json({ success: true, count: leaderboard.length, data: leaderboard });
  } catch (error) {
    console.error('getCourseLeaderboard error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

module.exports = { getMyBadges, getAvailableBadges, getCourseLeaderboard };
