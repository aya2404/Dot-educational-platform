const mongoose = require('mongoose');

const User = require('../models/User');
const { serializeUser } = require('../utils/serializers');

const PRIVILEGED_ROLES = new Set(['admin', 'superadmin']);
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const generateUsername = async (role) => {
  const prefix = role === 'teacher'
    ? 'teacher'
    : role === 'admin'
      ? 'admin'
      : role === 'superadmin'
        ? 'super'
        : 'student';

  const suffix = Date.now().toString().slice(-4);
  const baseUsername = `${prefix}_${suffix}`;

  let username = baseUsername;
  let counter = 1;

  while (await User.findOne({ username })) {
    username = `${baseUsername}_${counter}`;
    counter += 1;
  }

  return username;
};

const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users.map(serializeUser),
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const getUserById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    return res.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    console.error('getUserById error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, role, password, username: customUsername } = req.body;
    const allowedRoles =
      req.user.role === 'superadmin'
        ? ['student', 'teacher', 'admin']
        : ['student', 'teacher'];

    if (!name || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والدور وكلمة المرور مطلوبة',
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'لا تملك صلاحية إنشاء هذا النوع من الحسابات',
      });
    }

    const username = customUsername
      ? customUsername.trim().toLowerCase()
      : await generateUsername(role);

    const user = await User.create({
      name: name.trim(),
      username,
      studentId: await User.generateStudentId(role),
      password,
      role,
    });

    return res.status(201).json({
      success: true,
      data: serializeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} مستخدم بالفعل`,
      });
    }

    console.error('createUser error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const updateUser = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
    }

    const { name, username, password, isActive, avatar } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    if (PRIVILEGED_ROLES.has(user.role) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'فقط المشرف الرئيسي يمكنه تعديل حسابات الإدارة',
      });
    }

    if (name) user.name = name.trim();
    if (username) user.username = username.trim().toLowerCase();
    if (password) user.password = password;
    if (typeof isActive !== 'undefined') user.isActive = Boolean(isActive);
    if (typeof avatar === 'string') user.avatar = avatar.trim();

    await user.save();

    return res.json({
      success: true,
      data: serializeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم مستخدم بالفعل' });
    }

    console.error('updateUser error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك حذف حسابك الحالي',
      });
    }

    if (PRIVILEGED_ROLES.has(user.role) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'فقط المشرف الرئيسي يمكنه حذف حسابات الإدارة',
      });
    }

    await user.deleteOne();

    return res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

module.exports = {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
};
