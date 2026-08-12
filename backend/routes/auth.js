const express = require('express');
const rateLimit = require('express-rate-limit');
const router  = express.Router();
const { login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Throttle login attempts to slow down credential brute-force attacks.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'عدد محاولات تسجيل الدخول كبير، حاول لاحقاً' },
});

// POST /api/auth/login
router.post('/login', loginLimiter, login);

// GET /api/auth/me
router.get('/me', protect, getMe);

module.exports = router;
