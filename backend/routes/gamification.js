const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMyBadges,
  getAvailableBadges,
  getCourseLeaderboard,
} = require('../controllers/gamificationController');

// All gamification routes require authentication. `getMyBadges` / `getAvailableBadges`
// are scoped to req.user + tenant; the leaderboard additionally enforces per-course
// access (enrolled students, owning teacher, managers) inside the controller.
router.use(protect);

router.get('/badges', getMyBadges);
router.get('/available', getAvailableBadges);
router.get('/leaderboard/course/:courseId', getCourseLeaderboard);

module.exports = router;
