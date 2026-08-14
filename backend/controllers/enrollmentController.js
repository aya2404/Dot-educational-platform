const mongoose = require('mongoose');

const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Course = require('../models/Course');
const Content = require('../models/Content');
const Submission = require('../models/Submission');
const { isSubmissionWindowOpen } = require('../utils/permissions');
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const enrollStudent = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الطالب والكورس مطلوبان',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف الطالب أو الكورس غير صالح',
      });
    }

    const student = await User.findById(studentId);

    if (!student) {
      return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ success: false, message: 'المستخدم المحدد ليس طالباً' });
    }

    if (!student.isActive) {
      return res.status(400).json({ success: false, message: 'حساب الطالب معطل' });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: 'الكورس غير موجود' });
    }

    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
    });

    return res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'الطالب مسجل بالفعل في هذا الكورس',
      });
    }

    console.error('enrollStudent error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const unenrollStudent = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف التسجيل غير صالح' });
    }

    const enrollment = await Enrollment.findByIdAndDelete(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });
    }

    return res.json({ success: true, message: 'تم إلغاء تسجيل الطالب' });
  } catch (error) {
    console.error('unenrollStudent error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.user._id,
      isActive: true,
    }).populate({
      path: 'course',
      populate: { path: 'teacher', select: 'name' },
    });

    const activeEnrollments = enrollments.filter((enrollment) => enrollment.course);

    return res.json({
      success: true,
      count: activeEnrollments.length,
      data: activeEnrollments,
    });
  } catch (error) {
    console.error('getMyEnrollments error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

const markLectureComplete = async (req, res) => {
  try {
    const { courseId, lectureId } = req.body;

    if (!courseId || !lectureId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الكورس والمحاضرة مطلوبان',
      });
    }

    if (!isValidObjectId(courseId) || !isValidObjectId(lectureId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف الكورس أو المحاضرة غير صالح',
      });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      isActive: true,
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });
    }

    const lecture = await Content.findOne({
      _id: lectureId,
      course: courseId,
      type: 'lecture',
      isPublished: { $ne: false }, // a student cannot complete a draft lecture
    }).select('_id');

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'المحاضرة غير موجودة',
      });
    }

    const lectureKey = lecture._id.toString();
    const alreadyCompleted = enrollment.completedLectures.some(
      (id) => id.toString() === lectureKey
    );

    if (alreadyCompleted) {
      enrollment.completedLectures = enrollment.completedLectures.filter(
        (id) => id.toString() !== lectureKey
      );
    } else {
      enrollment.completedLectures.push(lecture._id);
    }

    await enrollment.save();

    return res.json({
      success: true,
      completed: !alreadyCompleted,
      data: enrollment,
    });
  } catch (error) {
    console.error('markLectureComplete error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

const getStudentProgress = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.courseId)) {
      return res.status(400).json({ success: false, message: 'معرف الكورس غير صالح' });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId,
      isActive: true,
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });
    }

    return res.json({
      success: true,
      completedLectures: enrollment.completedLectures.map((id) => id.toString()),
    });
  } catch (error) {
    console.error('getStudentProgress error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// Parameter-free upcoming-deadlines feed for the authenticated student. Derives
// the accessible courses ONLY from the student's own active enrollments and
// returns published, dated tasks — no courseId/studentId is ever accepted, so
// there is no IDOR surface. Overdue is derived from the authoritative
// isSubmissionWindowOpen (same rule that enforces submission), never a competing
// calculation. Presentation-only grouping (today/tomorrow/…) is left to the UI.
const getMyDeadlines = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.user._id,
      isActive: true,
    }).populate('course', 'name');

    const activeCourses = enrollments.filter((enrollment) => enrollment.course);
    const courseIds = activeCourses.map((enrollment) => enrollment.course._id);
    const courseNameById = new Map(
      activeCourses.map((enrollment) => [enrollment.course._id.toString(), enrollment.course.name])
    );

    if (courseIds.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // Published, dated tasks in the student's enrolled courses. `{ $ne: null }`
    // excludes tasks with a missing/null dueDate; `{ $ne: false }` keeps
    // published and legacy (no field) content while hiding drafts.
    const tasks = await Content.find({
      course: { $in: courseIds },
      type: 'task',
      isPublished: { $ne: false },
      dueDate: { $ne: null },
    })
      .select('title course dueDate maxScore')
      .sort({ dueDate: 1 });

    // The current student's submission status for these tasks (single query).
    const submissions = await Submission.find({
      task: { $in: tasks.map((task) => task._id) },
      student: req.user._id,
    }).select('task status');
    const statusByTask = new Map(
      submissions.map((submission) => [submission.task.toString(), submission.status])
    );

    const data = tasks.map((task) => ({
      taskId: task._id,
      courseId: task.course,
      courseName: courseNameById.get(task.course.toString()) || '',
      title: task.title,
      dueDate: task.dueDate,
      maxScore: task.maxScore,
      submissionStatus: statusByTask.get(task._id.toString()) || 'not_submitted',
      isPastDeadline: !isSubmissionWindowOpen(task),
    }));

    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('getMyDeadlines error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

module.exports = {
  enrollStudent,
  getMyDeadlines,
  getMyEnrollments,
  getStudentProgress,
  markLectureComplete,
  unenrollStudent,
};
