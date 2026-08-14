const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  enrollStudent,
  unenrollStudent,
  getMyEnrollments,
  markLectureComplete,
  getStudentProgress,
  getMyDeadlines,
} = require('../controllers/enrollmentController');

router.use(protect);


router.post('/', authorize('teacher', 'admin', 'superadmin'), enrollStudent);
router.get('/my', authorize('student'), getMyEnrollments);
router.get('/my-deadlines', authorize('student'), getMyDeadlines);
router.post('/complete', authorize('student'), markLectureComplete);
router.get('/progress/:courseId', authorize('student'), getStudentProgress);
router.delete('/:id', authorize('teacher', 'admin', 'superadmin'), unenrollStudent);

module.exports = router;
