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
} = require('../controllers/courseController');

//all course routes require auth
router.use(protect);

router.route('/')
  .get(getAllCourses) 
  .post(authorize('superadmin'), createCourse);

router.route('/:id')
  .get(getCourseById)
  .put(authorize('superadmin'), updateCourse)
  .delete(authorize('superadmin'), deleteCourse);

router.get('/:id/students', authorize('teacher', 'admin', 'superadmin'), getCourseStudents);

module.exports = router;
