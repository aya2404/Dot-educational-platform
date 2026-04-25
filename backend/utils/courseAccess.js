const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const MANAGER_ROLES = new Set(['admin', 'superadmin']);

const getTeacherId = (course) => {
  if (!course?.teacher) {
    return '';
  }

  if (typeof course.teacher.toString === 'function' && !course.teacher._id) {
    return course.teacher.toString();
  }

  return course.teacher._id?.toString() || '';
};

const userCanManageCourse = (user, course) =>
  MANAGER_ROLES.has(user.role) ||
  (user.role === 'teacher' && getTeacherId(course) === user._id.toString());

const resolveCourseAccess = async ({
  courseId,
  user,
  allowStudent = true,
  populateTeacher = false,
}) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return {
      statusCode: 400,
      message: 'معرف الكورس غير صالح',
    };
  }

  const courseQuery = Course.findById(courseId);

  if (populateTeacher) {
    courseQuery.populate('teacher', 'name studentId username');
  }

  const course = await courseQuery;

  if (!course) {
    return {
      statusCode: 404,
      message: 'الكورس غير موجود',
    };
  }

  if (userCanManageCourse(user, course)) {
    return { course };
  }

  if (allowStudent && user.role === 'student') {
    const enrollment = await Enrollment.findOne({
      student: user._id,
      course: course._id,
      isActive: true,
    });

    if (enrollment) {
      return { course, enrollment };
    }

    return {
      statusCode: 403,
      message: 'أنت غير مسجل في هذا الكورس',
    };
  }

  return {
    statusCode: 403,
    message: 'غير مصرح لك بالوصول إلى هذا الكورس',
  };
};

module.exports = {
  MANAGER_ROLES,
  getTeacherId,
  resolveCourseAccess,
  userCanManageCourse,
};
