const mongoose = require('mongoose');

const Course = require('../models/Course');
const Content = require('../models/Content');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { resolveCourseAccess } = require('../utils/courseAccess');
const { buildGradebook } = require('../utils/gradebook');

// Shared loader: fetch a course's gradable tasks + the given students' submissions.
// `publishedOnly` restricts to student-visible (published) tasks; the teacher
// gradebook passes false so staff keep seeing draft tasks.
const loadCourseTasksAndSubmissions = async (courseId, studentIds, { publishedOnly = false } = {}) => {
  const taskFilter = { course: courseId, type: 'task' };
  if (publishedOnly) taskFilter.isPublished = { $ne: false };
  const tasks = await Content.find(taskFilter).sort({
    order: 1,
    contentDate: 1,
    createdAt: 1,
  });
  const submissions = await Submission.find({
    task: { $in: tasks.map((task) => task._id) },
    student: { $in: studentIds },
  });
  return { tasks, submissions };
};

const validateTeacher = async (teacherId) => {
  if (!teacherId) {
    return { teacher: null };
  }

  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return {
      statusCode: 400,
      message: 'معرف المدرس غير صالح',
    };
  }

  const teacher = await User.findById(teacherId);

  if (!teacher || teacher.role !== 'teacher') {
    return {
      statusCode: 400,
      message: 'المدرس المحدد غير موجود أو لا يحمل صلاحية التدريس',
    };
  }

  return { teacher };
};

const getAllCourses = async (req, res) => {
  try {
    const query = {};

    // Multi-tenancy read isolation: scope to the caller's tenant unless Super Admin.
    if (!req.tenantId) {
      console.warn('getAllCourses: req.tenantId missing — defaulting to "default" tenant');
    }
    if (req.user?.role !== 'superadmin') {
      query.tenantId = req.tenantId || 'default';
    }

    if (req.user.role === 'teacher') {
      query.teacher = req.user._id;
    } else if (req.user.role === 'student') {
      const enrollments = await Enrollment.find({
        student: req.user._id,
        isActive: true,
      }).select('course');

      query._id = { $in: enrollments.map((enrollment) => enrollment.course) };
    }

    const courses = await Course.find(query)
      .populate('teacher', 'name studentId username')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    console.error('getAllCourses error:', error);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const getCourseById = async (req, res) => {
  try {
    const access = await resolveCourseAccess({
      courseId: req.params.id,
      user: req.user,
      populateTeacher: true,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    // Multi-tenancy read isolation: a non-superadmin may only read a course in
    // their own tenant. Respond as not-found to avoid cross-tenant disclosure.
    if (!req.tenantId) {
      console.warn('getCourseById: req.tenantId missing — defaulting to "default" tenant');
    }
    if (req.user?.role !== 'superadmin' && access.course.tenantId !== (req.tenantId || 'default')) {
      return res.status(404).json({ success: false, message: 'الكورس غير موجود' });
    }

    return res.json({ success: true, data: access.course });
  } catch (error) {
    console.error('getCourseById error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const createCourse = async (req, res) => {
  try {
    const { name, description, teacher, group, time, days, startDate } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'اسم الكورس مطلوب' });
    }

    // A teacher always owns the course they create — the body `teacher` is
    // ignored so a teacher can never create a course owned by someone else.
    // Managers (admin/superadmin) keep the existing assign-and-validate flow.
    let ownerTeacherId = req.user._id;
    if (req.user.role !== 'teacher') {
      const teacherValidation = await validateTeacher(teacher);

      if (!teacherValidation.teacher && teacherValidation.message) {
        return res.status(teacherValidation.statusCode).json({
          success: false,
          message: teacherValidation.message,
        });
      }

      ownerTeacherId = teacher;
    }

    // Multi-tenancy: a course inherits the creator's tenant. `protect` sets
    // req.tenantId; fall back to 'default' (and warn) only if it is absent.
    if (!req.tenantId) {
      console.warn('createCourse: req.tenantId missing — defaulting to "default" tenant');
    }
    const tenantId = req.tenantId || 'default';

    const course = await Course.create({
      name: name.trim(),
      description: description?.trim() || '',
      teacher: ownerTeacherId,
      group: group?.trim() || '',
      time: time?.trim() || '',
      days: Array.isArray(days) ? days : [],
      startDate: startDate || null,
      tenantId,
    });

    await course.populate('teacher', 'name studentId username');

    return res.status(201).json({ success: true, data: course });
  } catch (error) {
    console.error('createCourse error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const updateCourse = async (req, res) => {
  try {
    const access = await resolveCourseAccess({
      courseId: req.params.id,
      user: req.user,
      allowStudent: false,
      populateTeacher: true,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    // Multi-tenancy: an Organization Admin may only modify a course in their own
    // tenant. Super Admin is unrestricted; teachers are already ownership-scoped.
    if (!req.tenantId) {
      console.warn('updateCourse: req.tenantId missing — defaulting to "default" tenant');
    }
    if (req.user.role === 'admin' && access.course.tenantId !== (req.tenantId || 'default')) {
      return res.status(404).json({ success: false, message: 'الكورس غير موجود' });
    }

    const { name, description, teacher, group, time, days, startDate } = req.body;

    const course = access.course;

    // A teacher may never transfer ownership. Reject any attempt to set the
    // owner to anyone other than the current owner (their own account).
    if (req.user.role === 'teacher' && typeof teacher !== 'undefined') {
      const currentOwnerId = course.teacher?._id?.toString() || course.teacher?.toString() || '';
      if (String(teacher) !== currentOwnerId) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكنك نقل ملكية الكورس إلى مدرس آخر',
        });
      }
    }

    if (teacher) {
      const teacherValidation = await validateTeacher(teacher);

      if (!teacherValidation.teacher) {
        return res.status(teacherValidation.statusCode).json({
          success: false,
          message: teacherValidation.message,
        });
      }
    }

    if (name) course.name = name.trim();
    if (typeof description === 'string') course.description = description.trim();
    if (teacher) course.teacher = teacher;
    if (typeof group === 'string') course.group = group.trim();
    if (typeof time === 'string') course.time = time.trim();
    if (Array.isArray(days)) course.days = days;
    if (typeof startDate !== 'undefined') course.startDate = startDate || null;

    await course.save();
    await course.populate('teacher', 'name studentId username');

    return res.json({ success: true, data: course });
  } catch (error) {
    console.error('updateCourse error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const access = await resolveCourseAccess({
      courseId: req.params.id,
      user: req.user,
      allowStudent: false,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    // Multi-tenancy: an Organization Admin may only delete a course in their own
    // tenant. Super Admin is unrestricted; teachers are already ownership-scoped.
    if (!req.tenantId) {
      console.warn('deleteCourse: req.tenantId missing — defaulting to "default" tenant');
    }
    if (req.user.role === 'admin' && access.course.tenantId !== (req.tenantId || 'default')) {
      return res.status(404).json({ success: false, message: 'الكورس غير موجود' });
    }

    const contentItems = await Content.find({ course: access.course._id }).select('_id');
    const contentIds = contentItems.map((item) => item._id);

    if (contentIds.length > 0) {
      await Submission.deleteMany({ task: { $in: contentIds } });
    }

    await Content.deleteMany({ course: access.course._id });
    await Enrollment.deleteMany({ course: access.course._id });
    await Course.findByIdAndDelete(access.course._id);

    return res.json({ success: true, message: 'تم حذف الكورس وجميع محتوياته' });
  } catch (error) {
    console.error('deleteCourse error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const getCourseStudents = async (req, res) => {
  try {
    const access = await resolveCourseAccess({
      courseId: req.params.id,
      user: req.user,
      allowStudent: false,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    const enrollments = await Enrollment.find({
      course: access.course._id,
      isActive: true,
    }).populate('student', 'name username studentId avatar');

    const students = enrollments
      .filter((enrollment) => enrollment.student)
      .map((enrollment) => ({
        ...enrollment.student.toObject(),
        completedLectures: enrollment.completedLectures.length,
        enrollmentId: enrollment._id,
      }));

    return res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('getCourseStudents error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// Teacher/admin/superadmin course gradebook — every active student × task.
const getCourseGradebook = async (req, res) => {
  try {
    const access = await resolveCourseAccess({
      courseId: req.params.id,
      user: req.user,
      allowStudent: false,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    const enrollments = await Enrollment.find({
      course: access.course._id,
      isActive: true,
    }).populate('student', 'name username studentId');

    const students = enrollments
      .filter((enrollment) => enrollment.student)
      .map((enrollment) => enrollment.student);

    const { tasks, submissions } = await loadCourseTasksAndSubmissions(
      access.course._id,
      students.map((student) => student._id)
    );

    const gradebook = buildGradebook({ tasks, submissions, students });

    return res.json({
      success: true,
      course: { id: access.course._id, name: access.course.name },
      tasks: gradebook.tasks,
      students: gradebook.rows,
    });
  } catch (error) {
    console.error('getCourseGradebook error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// Student's own gradebook for a course they are actively enrolled in.
const getMyGradebook = async (req, res) => {
  try {
    const access = await resolveCourseAccess({
      courseId: req.params.id,
      user: req.user,
      allowStudent: true,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    const { tasks, submissions } = await loadCourseTasksAndSubmissions(
      access.course._id,
      [req.user._id],
      { publishedOnly: true } // students never see draft tasks in their gradebook
    );

    const gradebook = buildGradebook({
      tasks,
      submissions,
      students: [{ _id: req.user._id, name: req.user.name, studentId: req.user.studentId }],
    });

    const row = gradebook.rows[0] || {
      earnedPoints: 0,
      possiblePoints: gradebook.possiblePoints,
      percentage: gradebook.possiblePoints === 0 ? null : 0,
      hasInvalidGrade: false,
      tasks: [],
    };

    const defById = new Map(gradebook.tasks.map((def) => [def.id, def]));
    const tasksMerged = row.tasks.map((cell) => {
      const def = defById.get(cell.taskId) || {};
      return {
        taskId: cell.taskId,
        title: def.title,
        maxScore: def.maxScore,
        dueDate: def.dueDate || null,
        status: cell.status,
        grade: cell.grade,
        feedback: cell.feedback,
      };
    });

    return res.json({
      success: true,
      course: { id: access.course._id, name: access.course.name },
      earnedPoints: row.earnedPoints,
      possiblePoints: row.possiblePoints,
      percentage: row.percentage,
      hasInvalidGrade: row.hasInvalidGrade || false,
      tasks: tasksMerged,
    });
  } catch (error) {
    console.error('getMyGradebook error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

module.exports = {
  createCourse,
  deleteCourse,
  getAllCourses,
  getCourseById,
  getCourseGradebook,
  getCourseStudents,
  getMyGradebook,
  updateCourse,
};
