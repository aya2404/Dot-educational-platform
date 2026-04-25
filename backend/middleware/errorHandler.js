const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار المطلوب غير موجود',
  });
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, error);

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'المعرف المرسل غير صالح',
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'القيمة المدخلة مستخدمة بالفعل',
    });
  }

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? 'حدث خطأ غير متوقع في الخادم'
        : error.message || 'تعذر تنفيذ الطلب',
  });
};

module.exports = { errorHandler, notFound };
