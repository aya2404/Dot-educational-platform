const Enrollment = require('../models/Enrollment');
const Content = require('../models/Content');
const Submission = require('../models/Submission');

// Aggregates a unified event feed for the logged-in student's calendar from
// existing data (no dedicated Event model): task deadlines, lecture dates, and
// the student's own submissions.
//
// Multi-tenancy: Content and Submission carry no tenantId of their own, so tenant
// isolation is enforced transitively through the student's Enrollment records —
// which ARE tenant-scoped. We resolve the set of enrolled course ids for this
// student within their tenant, then only ever read Content in those courses and
// Submissions authored by this student. Nothing outside the student's tenant and
// enrolments can reach the response.
const getStudentEvents = async (req, res) => {
  try {
    if (!req.tenantId) {
      console.warn('calendarController: req.tenantId missing — defaulting to "default" tenant');
    }

    // Owner + tenant scoped enrolments. Super Admin is not tenant-restricted, but
    // this endpoint is student self-service so the owner filter still applies.
    const enrollmentFilter = { student: req.user._id, isActive: true };
    if (req.user?.role !== 'superadmin') {
      enrollmentFilter.tenantId = req.tenantId || 'default';
    }

    const enrollments = await Enrollment.find(enrollmentFilter)
      .populate('course', 'name')
      .lean();

    // Map of the student's in-scope course ids -> course name for labelling.
    const courseNameById = new Map();
    enrollments.forEach((enrollment) => {
      if (enrollment.course?._id) {
        courseNameById.set(String(enrollment.course._id), enrollment.course.name || 'كورس');
      }
    });

    const courseIds = [...courseNameById.keys()];

    // No enrolments -> no events (and no unnecessary content/submission queries).
    if (courseIds.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // Published content only (drafts, i.e. isPublished === false, stay hidden).
    const [taskContent, lectureContent, submissions] = await Promise.all([
      Content.find({
        course: { $in: courseIds },
        type: 'task',
        dueDate: { $ne: null },
        isPublished: { $ne: false },
      })
        .select('title dueDate course')
        .lean(),
      Content.find({
        course: { $in: courseIds },
        type: 'lecture',
        contentDate: { $ne: null },
        isPublished: { $ne: false },
      })
        .select('title contentDate course')
        .lean(),
      Submission.find({ student: req.user._id })
        .populate('task', 'title course')
        .lean(),
    ]);

    const events = [];

    taskContent.forEach((task) => {
      const courseId = String(task.course);
      events.push({
        id: `task-${task._id}`,
        title: task.title,
        date: task.dueDate,
        type: 'task',
        courseName: courseNameById.get(courseId) || '',
        link: `/student/course/${courseId}`,
      });
    });

    lectureContent.forEach((lecture) => {
      const courseId = String(lecture.course);
      events.push({
        id: `lecture-${lecture._id}`,
        title: lecture.title,
        date: lecture.contentDate,
        type: 'lecture',
        courseName: courseNameById.get(courseId) || '',
        link: `/student/course/${courseId}`,
      });
    });

    submissions.forEach((submission) => {
      const courseId = submission.task?.course ? String(submission.task.course) : null;

      // Guard: only surface submissions whose task belongs to a currently-enrolled
      // (in-tenant) course — never leak a submission tied to an out-of-scope course.
      if (!courseId || !courseNameById.has(courseId)) {
        return;
      }

      events.push({
        id: `submission-${submission._id}`,
        title: `تسليم: ${submission.task?.title || 'مهمة'}`,
        date: submission.createdAt,
        type: 'submission',
        courseName: courseNameById.get(courseId) || '',
        link: `/student/course/${courseId}`,
      });
    });

    return res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    console.error('getStudentEvents error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

module.exports = { getStudentEvents };
