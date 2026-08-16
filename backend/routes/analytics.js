const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getStudentStats, getExecutiveDashboard } = require('../controllers/analyticsController');

router.use(protect);

// The dashboard analytics belong to the authenticated student only.
router.get('/student', authorize('student'), getStudentStats);

// Organization-wide BI for admins/superadmins (tenant-scoped for admins).
router.get('/executive', authorize('admin', 'superadmin'), getExecutiveDashboard);

module.exports = router;
