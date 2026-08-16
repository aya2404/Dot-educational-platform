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

    // Multi-tenancy: expose the caller's tenant for downstream handlers.
    // Attach to both req.user and req.tenantId (legacy users -> 'default').
    const tenantId = req.user.tenantId || 'default';
    req.user.tenantId = tenantId;
    req.tenantId = tenantId;

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
// Role privilege hierarchy. An Organization Admin ('admin') inherits teacher
// privileges (Admin = teacher + admin), and Super Admin inherits admin+teacher
// (full management access) — but staff roles never inherit the student's
// self-service privilege, so student-only endpoints still reject them. Tenant
// scoping is enforced per-resource in the controllers, not here.
const ROLE_PRIVILEGES = {
  superadmin: ['superadmin', 'admin', 'teacher'],
  admin: ['admin', 'teacher'],
  teacher: ['teacher'],
  student: ['student'],
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const granted = ROLE_PRIVILEGES[req.user.role] || [req.user.role];

    if (!roles.some((role) => granted.includes(role))) {
      return res.status(403).json({
        success: false,
        message: `دور ${req.user.role} لا يملك صلاحية الوصول إلى هذا المورد`,
      });
    }
    next();
  };
};


module.exports = { protect, authorize };
