const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Content = require('../models/Content');
const Submission = require('../models/Submission');

// Resolve the caller's tenant. Missing req.tenantId falls back to 'default'.
const getTenantId = (req) => {
  if (!req.tenantId) {
    console.warn('analyticsController: req.tenantId missing — defaulting to "default" tenant');
  }
  return req.tenantId || 'default';
};

// GET /api/analytics/student — aggregate stats for the logged-in student only.
// Scope is derived from the student's own tenant-scoped enrollments, so all
// downstream content/submissions stay within the student's tenant and courses.
const getStudentStats = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const studentId = req.user._id;

    const enrollmentFilter = { student: studentId, isActive: true };
    if (req.user.role !== 'superadmin') {
      enrollmentFilter.tenantId = tenantId;
    }

    const enrollments = await Enrollment.find(enrollmentFilter).populate('course', 'name');
    const activeEnrollments = enrollments.filter((enrollment) => enrollment.course);

    const enrolledCourses = activeEnrollments.length;
    const completedLectures = activeEnrollments.reduce(
      (sum, enrollment) => sum + (enrollment.completedLectures?.length || 0),
      0
    );
    const courseIds = activeEnrollments.map((enrollment) => enrollment.course._id);
    const courseNameById = new Map(
      activeEnrollments.map((enrollment) => [enrollment.course._id.toString(), enrollment.course.name])
    );

    // Published lectures across the student's enrolled courses.
    const totalLectures = courseIds.length
      ? await Content.countDocuments({
          course: { $in: courseIds },
          type: 'lecture',
          isPublished: { $ne: false },
        })
      : 0;

    // Tasks in those courses, then this student's submissions for them.
    const tasks = courseIds.length
      ? await Content.find({ course: { $in: courseIds }, type: 'task' }).select('course maxScore')
      : [];
    const taskById = new Map(tasks.map((task) => [task._id.toString(), task]));
    const submissions = tasks.length
      ? await Submission.find({ student: studentId, task: { $in: tasks.map((t) => t._id) } })
          .select('grade status createdAt task')
      : [];

    const submissionsCount = submissions.length;
    const graded = submissions.filter((s) => s.status === 'graded' && typeof s.grade === 'number');
    const gradedSubmissions = graded.length;

    // Grade % of maxScore, overall and per course.
    const perCourse = new Map(); // courseId -> { sum, count }
    let pctSum = 0;
    graded.forEach((submission) => {
      const task = taskById.get(submission.task.toString());
      if (!task) return;
      const max = typeof task.maxScore === 'number' && task.maxScore > 0 ? task.maxScore : 100;
      const pct = (submission.grade / max) * 100;
      pctSum += pct;
      const courseKey = task.course.toString();
      const bucket = perCourse.get(courseKey) || { sum: 0, count: 0 };
      bucket.sum += pct;
      bucket.count += 1;
      perCourse.set(courseKey, bucket);
    });
    const averageGrade = gradedSubmissions ? Math.round(pctSum / gradedSubmissions) : 0;
    const gradeByCourse = [...perCourse.entries()].map(([courseKey, bucket]) => ({
      course: courseNameById.get(courseKey) || 'كورس',
      average: Math.round(bucket.sum / bucket.count),
    }));

    // Submission activity over the last 7 days.
    const now = new Date();
    const activity = new Map();
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      activity.set(day.toISOString().split('T')[0], 0);
    }
    submissions.forEach((submission) => {
      const key = new Date(submission.createdAt).toISOString().split('T')[0];
      if (activity.has(key)) activity.set(key, activity.get(key) + 1);
    });
    const recentActivity = [...activity.entries()].map(([date, count]) => ({ date, count }));

    return res.json({
      success: true,
      data: {
        enrolledCourses,
        completedLectures,
        totalLectures,
        averageGrade,
        submissionsCount,
        gradedSubmissions,
        gradeByCourse,
        recentActivity,
      },
    });
  } catch (error) {
    console.error('getStudentStats error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/analytics/executive — organization-wide BI for admins/superadmins.
// Tenant-scoped for admins; a superadmin sees every tenant. Uses aggregation for
// the count/group work and lean reads for the join-heavy submission metrics
// (Content/Submission carry no tenantId, so they are scoped via the tenant's
// courses).
const getExecutiveDashboard = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const isSuper = req.user.role === 'superadmin';
    const tenantMatch = isSuper ? {} : { tenantId };

    // Users by role.
    const roleCounts = await User.aggregate([
      { $match: tenantMatch },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const byRole = Object.fromEntries(roleCounts.map((r) => [r._id, r.count]));
    const totalUsers = {
      students: byRole.student || 0,
      teachers: byRole.teacher || 0,
      admins: (byRole.admin || 0) + (byRole.superadmin || 0),
      total: roleCounts.reduce((sum, r) => sum + r.count, 0),
    };

    // Courses in scope.
    const courses = await Course.find(tenantMatch).select('_id name teacher').lean();
    const totalCourses = courses.length;
    const courseName = new Map(courses.map((c) => [c._id.toString(), c.name]));
    const courseIds = courses.map((c) => c._id);

    // Active enrollments grouped by course.
    const enrollAgg = await Enrollment.aggregate([
      { $match: { ...tenantMatch, isActive: true } },
      { $group: { _id: '$course', students: { $sum: 1 } } },
    ]);
    const studentsByCourse = new Map(enrollAgg.map((e) => [e._id ? e._id.toString() : '', e.students]));
    const activeCourses = enrollAgg.filter(
      (e) => e.students > 0 && courseName.has(e._id?.toString())
    ).length;
    const topCourses = enrollAgg
      .filter((e) => courseName.has(e._id?.toString()))
      .sort((a, b) => b.students - a.students)
      .slice(0, 5)
      .map((e) => ({ course: courseName.get(e._id.toString()), students: e.students }));

    // Submissions (scoped via the tenant's course tasks).
    const tasks = courseIds.length
      ? await Content.find({ course: { $in: courseIds }, type: 'task' })
          .select('_id course maxScore')
          .lean()
      : [];
    const taskById = new Map(tasks.map((t) => [t._id.toString(), t]));
    const submissions = tasks.length
      ? await Submission.find({ task: { $in: tasks.map((t) => t._id) } })
          .select('grade status createdAt task')
          .lean()
      : [];
    const totalSubmissions = submissions.length;
    const graded = submissions.filter((s) => s.status === 'graded' && typeof s.grade === 'number');
    const gradedSubmissions = graded.length;
    let pctSum = 0;
    graded.forEach((s) => {
      const task = taskById.get(s.task.toString());
      const max = task && typeof task.maxScore === 'number' && task.maxScore > 0 ? task.maxScore : 100;
      pctSum += (s.grade / max) * 100;
    });
    const averageGrade = gradedSubmissions ? Math.round(pctSum / gradedSubmissions) : 0;

    // Last-7-day activity.
    const now = new Date();
    const dayKeys = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dayKeys.push(d.toISOString().split('T')[0]);
    }
    const subByDay = new Map(dayKeys.map((k) => [k, 0]));
    submissions.forEach((s) => {
      const key = new Date(s.createdAt).toISOString().split('T')[0];
      if (subByDay.has(key)) subByDay.set(key, subByDay.get(key) + 1);
    });
    const dailySubmissions = dayKeys.map((k) => ({ date: k, count: subByDay.get(k) }));
    // Login events are not tracked in this platform, so this series is always
    // zero — kept in the response for API-contract completeness.
    const dailyLogins = dayKeys.map((k) => ({ date: k, count: 0 }));

    // Teacher performance: students + submissions across each teacher's courses.
    const teacherIds = [...new Set(courses.map((c) => c.teacher?.toString()).filter(Boolean))];
    const teacherUsers = teacherIds.length
      ? await User.find({ _id: { $in: teacherIds } }).select('_id name').lean()
      : [];
    const teacherName = new Map(teacherUsers.map((u) => [u._id.toString(), u.name]));
    const submissionsByCourse = new Map();
    submissions.forEach((s) => {
      const task = taskById.get(s.task.toString());
      if (!task) return;
      const key = task.course.toString();
      submissionsByCourse.set(key, (submissionsByCourse.get(key) || 0) + 1);
    });
    const perTeacher = new Map();
    courses.forEach((c) => {
      const tid = c.teacher?.toString();
      if (!tid) return;
      const bucket = perTeacher.get(tid) || { students: 0, submissions: 0, courses: 0 };
      bucket.students += studentsByCourse.get(c._id.toString()) || 0;
      bucket.submissions += submissionsByCourse.get(c._id.toString()) || 0;
      bucket.courses += 1;
      perTeacher.set(tid, bucket);
    });
    const teacherPerformance = [...perTeacher.entries()]
      .map(([tid, v]) => ({
        teacher: teacherName.get(tid) || 'مدرس',
        students: v.students,
        submissions: v.submissions,
        courses: v.courses,
      }))
      .sort((a, b) => b.students - a.students || b.submissions - a.submissions)
      .slice(0, 10);

    // New users per month for the last 6 months.
    const growthAgg = await User.aggregate([
      { $match: tenantMatch },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
    ]);
    const growthMap = new Map(
      growthAgg.map((g) => [`${g._id.y}-${String(g._id.m).padStart(2, '0')}`, g.count])
    );
    const userGrowth = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      userGrowth.push({ month: key, count: growthMap.get(key) || 0 });
    }

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalCourses,
        activeCourses,
        totalSubmissions,
        gradedSubmissions,
        averageGrade,
        recentActivity: { dailyLogins, dailySubmissions },
        topCourses,
        teacherPerformance,
        userGrowth,
      },
    });
  } catch (error) {
    console.error('getExecutiveDashboard error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

module.exports = { getStudentStats, getExecutiveDashboard };
