const express= require('express');
const router= express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

router.use(protect);

router.route('/')
  .get(authorize('admin', 'superadmin'), getAllUsers)
  .post(authorize('admin', 'superadmin'), createUser);

router.route('/:id')
  .get(authorize('admin', 'superadmin'), getUserById)
  .put(authorize('admin', 'superadmin'), updateUser)
  .delete(authorize('superadmin'), deleteUser); 

module.exports = router;
