const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadFiles } = require('../controllers/uploadController');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'عدد محاولات الرفع كبير، حاول لاحقاً' },
});

router.use(protect);

router.post(
  '/',
  uploadLimiter,
  authorize('student', 'teacher', 'admin', 'superadmin'),
  upload.array('files', 5),
  uploadFiles
);

router.use((error, req, res, next) => {
  if (!error) {
    return next();
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'حجم الملف كبير جداً (الحد الأقصى 10MB)' });
  }

  return res.status(400).json({ success: false, message: error.message || 'خطأ في رفع الملفات' });
});

module.exports = router;
