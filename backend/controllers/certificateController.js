const mongoose = require('mongoose');

const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const Enrollment = require('../models/Enrollment');
const Content = require('../models/Content');
const Submission = require('../models/Submission');
const Course = require('../models/Course');
const Organization = require('../models/Organization');
const PlatformSettings = require('../models/PlatformSettings');
const { generateCertificatePdf } = require('../utils/certificateGenerator');
const { resolveCourseAccess } = require('../utils/courseAccess');
const { notify } = require('../utils/notifications');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const isSafeUrl = (value) => /^(https?:\/\/|\/)/.test(value);

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

// Find-or-create this tenant's certificate template (idempotent, concurrency-safe).
const ensureTemplate = async (tenantId) => {
  const existing = await CertificateTemplate.findOne({ tenantId });
  if (existing) return existing;
  try {
    return await CertificateTemplate.create({ tenantId });
  } catch (error) {
    if (error.code === 11000) return CertificateTemplate.findOne({ tenantId });
    throw error;
  }
};

// Effective logo for the PDF: template -> organization -> global platform logo.
const resolveTemplateWithLogo = async (tenantId) => {
  const template = await ensureTemplate(tenantId);
  if (template.logoUrl) return template;

  const [org, global] = await Promise.all([
    Organization.findOne({ tenantId }).select('logoUrl'),
    PlatformSettings.findOne({ key: 'global' }).select('logoUrl'),
  ]);
  const fallbackLogo = org?.logoUrl || global?.logoUrl || '';
  return { ...template.toObject(), logoUrl: fallbackLogo };
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

// POST /api/certificates — REQUEST a certificate for a fully-completed course.
// Creates a `pending` record only; NO PDF is generated until admin approval.
const generateCertificate = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { courseId } = req.body;

    if (!courseId || !isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: 'معرف الكورس غير صالح' });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      isActive: true,
      tenantId,
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'أنت غير مسجل في هذا الكورس' });
    }

    // Return the existing request/certificate if one already exists (idempotent).
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

    const certificate = new Certificate({
      student: req.user._id,
      course: courseId,
      tenantId,
      status: 'pending', // awaits teacher then admin approval before issuance
    });
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

// GET /api/certificates — the student's certificates (tenant-scoped), incl. status.
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

// GET /api/certificates/:id/pdf — download the PDF. Only issued (admin-approved)
// certificates can be downloaded.
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

    if (certificate.status !== 'admin_approved') {
      return res.status(403).json({
        success: false,
        message: 'الشهادة قيد المراجعة ولم تُعتمد بعد',
      });
    }

    const template = await resolveTemplateWithLogo(certificate.tenantId);

    const pdf = await generateCertificatePdf({
      studentName: certificate.student?.name || 'Student',
      courseName: certificate.course?.name || 'Course',
      issueDate: certificate.issuedAt || certificate.issueDate,
      certificateId: certificate.certificateId,
      verifyUrl: certificate.qrCodeData || getVerifyUrl(certificate.certificateId),
      template,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateId}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error('getCertificatePdf error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/certificates/pending — approval queue for the caller's role:
//   teacher -> 'pending' certificates for courses they teach (tenant-scoped)
//   admin/superadmin -> 'teacher_approved' certificates awaiting final approval
const getPendingCertificates = async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (req.user.role === 'teacher') {
      const courses = await Course.find({ teacher: req.user._id, tenantId }).select('_id');
      const courseIds = courses.map((c) => c._id);
      if (courseIds.length === 0) return res.json({ success: true, count: 0, data: [] });

      const certificates = await Certificate.find({
        course: { $in: courseIds },
        status: 'pending',
        tenantId,
      })
        .populate('student', 'name studentId')
        .populate('course', 'name')
        .sort({ createdAt: 1 });

      return res.json({ success: true, count: certificates.length, data: certificates });
    }

    // admin / superadmin: final-approval queue.
    const filter = { status: 'teacher_approved' };
    if (req.user.role !== 'superadmin') filter.tenantId = tenantId;

    const certificates = await Certificate.find(filter)
      .populate('student', 'name studentId')
      .populate('course', 'name')
      .sort({ createdAt: 1 });

    return res.json({ success: true, count: certificates.length, data: certificates });
  } catch (error) {
    console.error('getPendingCertificates error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// PATCH /api/certificates/:id/teacher-approve — the course teacher (or a manager)
// approves or rejects a pending certificate. Body: { action, feedback }.
const teacherApprove = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف الشهادة غير صالح' });
    }

    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    }

    // Authorization: must own the course (teacher) or be a manager for it.
    const access = await resolveCourseAccess({
      courseId: certificate.course,
      user: req.user,
      allowStudent: false,
    });
    if (!access.course) {
      return res.status(access.statusCode).json({ success: false, message: access.message });
    }

    if (certificate.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'الشهادة ليست بانتظار مراجعة المدرس' });
    }

    const { action, feedback } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'إجراء غير صالح' });
    }

    certificate.teacherReview = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      feedback: typeof feedback === 'string' ? feedback.trim() : '',
    };
    certificate.status = action === 'approve' ? 'teacher_approved' : 'rejected';
    await certificate.save();

    if (action === 'reject') {
      await notify(certificate.student, {
        type: 'CERTIFICATE_ISSUED',
        title: 'تحديث بخصوص شهادتك',
        message: `تم رفض طلب الشهادة${certificate.teacherReview.feedback ? `: ${certificate.teacherReview.feedback}` : ''}`,
        course: certificate.course,
        link: '/student',
        tenantId: certificate.tenantId,
      });
    }

    return res.json({ success: true, data: certificate });
  } catch (error) {
    console.error('teacherApprove error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// PATCH /api/certificates/:id/admin-approve — Organization Admin gives the final
// decision. On approval the certificate is issued (downloadable/verifiable).
const adminApprove = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف الشهادة غير صالح' });
    }

    const tenantId = getTenantId(req);
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    }

    // Tenant scope: an admin may only act within their own tenant (superadmin is
    // unrestricted). Respond as not-found to avoid cross-tenant disclosure.
    if (req.user.role !== 'superadmin' && certificate.tenantId !== tenantId) {
      return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    }

    if (certificate.status !== 'teacher_approved') {
      return res.status(400).json({ success: false, message: 'الشهادة ليست بانتظار اعتماد الإدارة' });
    }

    const { action, feedback } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'إجراء غير صالح' });
    }

    certificate.adminReview = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      feedback: typeof feedback === 'string' ? feedback.trim() : '',
    };

    if (action === 'approve') {
      certificate.status = 'admin_approved';
      certificate.issuedAt = new Date();
      await certificate.save();

      await notify(certificate.student, {
        type: 'CERTIFICATE_ISSUED',
        title: '🎓 تم إصدار شهادتك',
        message: 'تمت الموافقة على شهادتك ويمكنك تنزيلها الآن من لوحة التحكم.',
        course: certificate.course,
        link: '/student',
        tenantId: certificate.tenantId,
      });
    } else {
      certificate.status = 'rejected';
      await certificate.save();

      await notify(certificate.student, {
        type: 'CERTIFICATE_ISSUED',
        title: 'تحديث بخصوص شهادتك',
        message: `تم رفض الشهادة من الإدارة${certificate.adminReview.feedback ? `: ${certificate.adminReview.feedback}` : ''}`,
        course: certificate.course,
        link: '/student',
        tenantId: certificate.tenantId,
      });
    }

    return res.json({ success: true, data: certificate });
  } catch (error) {
    console.error('adminApprove error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/certificates/template — the tenant's certificate template.
const getTemplate = async (req, res) => {
  try {
    const template = await ensureTemplate(getTenantId(req));
    return res.json({ success: true, data: template });
  } catch (error) {
    console.error('getTemplate error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// PUT /api/certificates/template — update the tenant's template (admin/superadmin).
const updateTemplate = async (req, res) => {
  try {
    const template = await ensureTemplate(getTenantId(req));
    const body = req.body || {};

    const textFields = [
      'name', 'titleText', 'bodyText', 'signature1', 'signature1Name',
      'signature2', 'signature2Name', 'fontFamily', 'footerText', 'issueDateText',
    ];
    textFields.forEach((field) => {
      if (typeof body[field] === 'string') template[field] = body[field];
    });

    if (typeof body.primaryColor === 'string' && HEX_COLOR.test(body.primaryColor.trim())) {
      template.primaryColor = body.primaryColor.trim();
    }
    if (typeof body.logoUrl === 'string') {
      const clean = body.logoUrl.trim();
      template.logoUrl = clean === '' || isSafeUrl(clean) ? clean : template.logoUrl;
    }

    await template.save();
    return res.json({ success: true, data: template });
  } catch (error) {
    console.error('updateTemplate error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/certificates/verify/:certificateId — PUBLIC. Only issued
// (admin-approved) certificates verify as valid; others report their status.
const verifyCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId })
      .populate('student', 'name')
      .populate('course', 'name');

    if (!certificate || certificate.isRevoked) {
      return res.json({ valid: false });
    }

    if (certificate.status !== 'admin_approved') {
      // Exists but not yet issued — tell the page why (no personal data leaked).
      return res.json({ valid: false, status: certificate.status });
    }

    return res.json({
      valid: true,
      studentName: certificate.student?.name || '',
      courseName: certificate.course?.name || '',
      issueDate: certificate.issuedAt || certificate.issueDate,
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
  getPendingCertificates,
  teacherApprove,
  adminApprove,
  getTemplate,
  updateTemplate,
  verifyCertificate,
};
