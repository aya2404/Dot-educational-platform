const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStudents,
  getCourseGradebook,
  getMyGradebook,
} = require('../controllers/courseController');

//all course routes require auth
router.use(protect);

router.route('/')
  .get(getAllCourses)
  .post(authorize('teacher', 'admin', 'superadmin'), createCourse);

router.route('/:id')
  .get(getCourseById)
  .put(authorize('teacher', 'admin', 'superadmin'), updateCourse)
  .delete(authorize('teacher', 'admin', 'superadmin'), deleteCourse);

router.get('/:id/students', authorize('teacher', 'admin', 'superadmin'), getCourseStudents);

router.get('/:id/gradebook', authorize('teacher', 'admin', 'superadmin'), getCourseGradebook);
router.get('/:id/my-gradebook', authorize('student'), getMyGradebook);

module.exports = router;
