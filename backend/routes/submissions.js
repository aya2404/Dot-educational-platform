const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  submitTask,
  getMySubmissions,
  getTaskSubmissions,
  gradeSubmission,
  deleteSubmission,
  getStudentTaskStatus,
} = require('../controllers/submissionController');

router.use(protect);

router.post('/', authorize('student'), submitTask);
router.get('/my', authorize('student'), getMySubmissions);

router.get('/status/:courseId', authorize('student'), getStudentTaskStatus);
router.get('/task/:taskId', authorize('teacher', 'admin', 'superadmin'), getTaskSubmissions);
router.patch('/:id/grade', authorize('teacher', 'admin', 'superadmin'), gradeSubmission);
router.delete('/:id', deleteSubmission);

module.exports = router;
