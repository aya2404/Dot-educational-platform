const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../controllers/organizationController');

router.use(protect);

// Any authenticated user may read their tenant's branding (to apply the theme);
// only admins/superadmins may change it.
router.get('/settings', getSettings);
router.put('/settings', authorize('admin', 'superadmin'), updateSettings);

module.exports = router;
