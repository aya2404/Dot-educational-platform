const mongoose = require('mongoose');

const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const Content = require('../models/Content');
const Submission = require('../models/Submission');
const { generateCertificatePdf } = require('../utils/certificateGenerator');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getTenantId = (req) => {
  if (!req.tenantId) {
    console.warn('certificateController: req.tenantId missing — defaulting to "default" tenant');
  }
  return req.tenantId || 'default';
};

// Public frontend URL used to build the QR verification link.
const getVerifyUrl = (certificateId) => {
  const origin = (process.env.CLIENT_ORIGIN || '').split(',')[0].trim() || 'http://localhost:3000';
  return `${origin.replace(/\/+$/, '')}/certificates/verify/${certificateId}`;
};

// Has the student completed every published lecture and task in the course?
const hasCompletedCourse = async (studentId, courseId, enrollment) => {
  const [lectures, tasks] = await Promise.all([
    Content.find({ course: courseId, type: 'lecture', isPublished: { $ne: false } }).select('_id'),
    Content.find({ course: courseId, type: 'task', isPublished: { $ne: false } }).select('_id'),
  ]);

  const completed = new Set((enrollment.completedLectures || []).map((id) => id.toString()));
  const allLecturesDone = lectures.every((lecture) => completed.has(lecture._id.toString()));

  const submissions = tasks.length
    ? await Submission.find({ student: studentId, task: { $in: tasks.map((t) => t._id) } }).select('task')
    : [];
  const submitted = new Set(submissions.map((s) => s.task.toString()));
  const allTasksDone = tasks.every((task) => submitted.has(task._id.toString()));

  return allLecturesDone && allTasksDone;
};

// POST /api/certificates — generate (or return the existing) certificate for a
// course the student has fully completed. Idempotent.
const generateCertificate = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { courseId } = req.body;

    if (!courseId || !isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: 'معرف الكورس غير صالح' });
    }

    // The student must be actively enrolled (tenant-scoped).
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      isActive: true,
      tenantId,
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'أنت غير مسجل في هذا الكورس' });
    }

    // Return the existing certificate if it was already issued.
    const existing = await Certificate.findOne({ student: req.user._id, course: courseId, tenantId });
    if (existing) {
      return res.status(200).json({ success: true, data: existing });
    }

    const completed = await hasCompletedCourse(req.user._id, courseId, enrollment);
    if (!completed) {
      return res.status(400).json({
        success: false,
        message: 'لم تُكمل جميع متطلبات الكورس (المحاضرات والمهام) بعد',
      });
    }

    const certificate = new Certificate({ student: req.user._id, course: courseId, tenantId });
    certificate.qrCodeData = getVerifyUrl(certificate.certificateId);
    await certificate.save();

    return res.status(201).json({ success: true, data: certificate });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Certificate.findOne({ student: req.user._id, course: req.body.courseId });
      if (existing) return res.status(200).json({ success: true, data: existing });
    }
    console.error('generateCertificate error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/certificates — the student's certificates (tenant-scoped).
const getMyCertificates = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const filter = { student: req.user._id };
    if (req.user.role !== 'superadmin') filter.tenantId = tenantId;

    const certificates = await Certificate.find(filter)
      .populate('course', 'name')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: certificates.length, data: certificates });
  } catch (error) {
    console.error('getMyCertificates error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/certificates/:id/pdf — regenerate and download the certificate PDF.
const getCertificatePdf = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف الشهادة غير صالح' });
    }

    const tenantId = getTenantId(req);
    const filter = { _id: req.params.id, student: req.user._id };
    if (req.user.role !== 'superadmin') filter.tenantId = tenantId;

    const certificate = await Certificate.findOne(filter)
      .populate('student', 'name')
      .populate('course', 'name');

    if (!certificate || certificate.isRevoked) {
      return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    }

    const pdf = await generateCertificatePdf({
      studentName: certificate.student?.name || 'Student',
      courseName: certificate.course?.name || 'Course',
      issueDate: certificate.issueDate,
      certificateId: certificate.certificateId,
      verifyUrl: certificate.qrCodeData || getVerifyUrl(certificate.certificateId),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateId}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error('getCertificatePdf error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/certificates/verify/:certificateId — PUBLIC, intentionally NOT
// tenant-scoped: anyone may verify any certificate by its public id.
const verifyCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId })
      .populate('student', 'name')
      .populate('course', 'name');

    if (!certificate || certificate.isRevoked) {
      return res.json({ valid: false });
    }

    return res.json({
      valid: true,
      studentName: certificate.student?.name || '',
      courseName: certificate.course?.name || '',
      issueDate: certificate.issueDate,
      certificateId: certificate.certificateId,
    });
  } catch (error) {
    console.error('verifyCertificate error:', error);
    return res.status(500).json({ valid: false, message: 'خطأ في الخادم' });
  }
};

module.exports = {
  generateCertificate,
  getMyCertificates,
  getCertificatePdf,
  verifyCertificate,
};
