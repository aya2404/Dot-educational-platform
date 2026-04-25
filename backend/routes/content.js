const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getCourseContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
} = require('../controllers/contentController');
router.use(protect);

//course timeline 
router.get('/course/:courseId', getCourseContent);

//create content
router.post('/', authorize('teacher', 'admin', 'superadmin'), createContent);

router.route('/:id')
  .get(getContentById)
  .put(authorize('teacher', 'admin', 'superadmin'), updateContent)
  .delete(authorize('teacher', 'admin', 'superadmin'), deleteContent);

module.exports = router;
