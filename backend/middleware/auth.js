const jwt  = require('jsonwebtoken');
const User = require('../models/User'); 

//protect ==========================================================================

const protect = async (req, res, next) => {
  let token; 
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح لك بالوصول - الرجاء تسجيل الدخول',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'الحساب معطل - الرجاء التواصل مع الدعم الفني',
      });
    }

    //checks passed
    next();
  } catch (error) {
    //invalid/expired token
    return res.status(401).json({
      success: false,
      message: 'رمز التحقق غير صالح أو منتهي الصلاحية',
    });
  }
};

//authorize ==========================================================================
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `دور ${req.user.role} لا يملك صلاحية الوصول إلى هذا المورد`,
      });
    }
    next();
  };
};


module.exports = { protect, authorize };
