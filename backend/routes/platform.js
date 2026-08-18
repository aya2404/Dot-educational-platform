const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPlatformSettings,
  updatePlatformSettings,
} = require('../controllers/platformSettingsController');

// GET is PUBLIC: the login page (pre-auth) needs the global logo/favicon/name.
// It returns only public branding fields.
router.get('/settings', getPlatformSettings);

// PUT is Super-Admin only. Global branding is not tenant-scoped.
router.put('/settings', protect, authorize('superadmin'), updatePlatformSettings);

module.exports = router;
