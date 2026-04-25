const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  enrollStudent,
  unenrollStudent,
  getMyEnrollments,
  markLectureComplete,
  getStudentProgress,
} = require('../controllers/enrollmentController');

router.use(protect);


router.post('/', authorize('superadmin'), enrollStudent);
router.get('/my', authorize('student'), getMyEnrollments);
router.post('/complete', authorize('student'), markLectureComplete);
router.get('/progress/:courseId', authorize('student'), getStudentProgress);
router.delete('/:id', authorize('superadmin'), unenrollStudent);

module.exports = router;
