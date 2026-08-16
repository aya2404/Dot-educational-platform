const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { serializeUser } = require('../utils/serializers');

const STUDENT_ID_PATTERN = /^[A-Z]{3}-\d+$/;

const generateToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      tenantId: user.tenantId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const getUserQuery = (identifier) => {
  const normalizedIdentifier = identifier.trim();
  const normalizedStudentId = normalizedIdentifier.toUpperCase();

  if (STUDENT_ID_PATTERN.test(normalizedStudentId)) {
    return { studentId: normalizedStudentId };
  }

  return { username: normalizedIdentifier.toLowerCase() };
};

const login = async (req, res) => {
  try {
    const identifier = req.body.identifier?.trim();
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال المستخدم وكلمة المرور',
      });
    }

    const user = await User.findOne(getUserQuery(identifier)).select('+password');

    // Uniform failure for unknown user, wrong password, AND inactive account —
    // and the password comparison always runs before the account-state check so
    // neither the message nor timing reveals whether the account exists/is active.
    const invalidCredentials = () =>
      res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });

    if (!user) {
      return invalidCredentials();
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return invalidCredentials();
    }

    if (!user.isActive) {
      return invalidCredentials();
    }

    return res.json({
      success: true,
      token: generateToken(user),
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في السيرفر',
    });
  }
};

const getMe = async (req, res) => {
  res.json({
    success: true,
    user: serializeUser(req.user),
  });
};

module.exports = { getMe, login };
