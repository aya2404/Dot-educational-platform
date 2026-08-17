const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getStudentEvents } = require('../controllers/calendarController');

// The unified calendar is a student self-service feature: authenticate, then
// restrict to the student role (staff roles do not inherit the student
// privilege, so they are rejected). Events are scoped to req.user's enrolments.
router.use(protect);

router.get('/events', authorize('student'), getStudentEvents);

module.exports = router;
