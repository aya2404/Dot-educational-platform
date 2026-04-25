const mongoose = require('mongoose');

const Content = require('../models/Content');
const Submission = require('../models/Submission');
const { normalizeAttachmentArray } = require('../utils/attachments');
const { resolveCourseAccess } = require('../utils/courseAccess');
const { getContentPermissions } = require('../utils/permissions');
const { serializeContent } = require('../utils/serializers');

const TYPE_ORDER = { lecture: 1, material: 2, task: 3, announcement: 4 };
const VALID_TYPES = new Set(Object.keys(TYPE_ORDER));
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getCourseContent = async (req, res) => {
  try {
    const access = await resolveCourseAccess({
      courseId: req.params.courseId,
      user: req.user,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    const content = await Content.find({ course: access.course._id })
      .populate('createdBy', 'name role')
      .sort({ contentDate: 1, order: 1, createdAt: 1 });
    const serializedContent = content.map((item) =>
      serializeContent(item, req, { course: access.course })
    );

    const timeline = serializedContent.reduce((result, item) => {
      const dateKey = new Date(item.contentDate).toISOString().split('T')[0];

      if (!result[dateKey]) {
        result[dateKey] = [];
      }

      result[dateKey].push(item);
      return result;
    }, {});

    return res.json({ success: true, data: serializedContent, timeline });
  } catch (error) {
    console.error('getCourseContent error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const getContentById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف المحتوى غير صالح' });
    }

    const content = await Content.findById(req.params.id)
      .populate('createdBy', 'name role')
      .populate('course', 'name');

    if (!content) {
      return res.status(404).json({ success: false, message: 'المحتوى غير موجود' });
    }

    const access = await resolveCourseAccess({
      courseId: content.course?._id || content.course,
      user: req.user,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    return res.json({
      success: true,
      data: serializeContent(content, req, { course: access.course }),
    });
  } catch (error) {
    console.error('getContentById error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const createContent = async (req, res) => {
  try {
    const { course, type, title, body, attachments, contentDate, dueDate, maxScore } = req.body;

    if (!course || !type || !title) {
      return res.status(400).json({
        success: false,
        message: 'الكورس والنوع والعنوان مطلوبة',
      });
    }

    if (!isValidObjectId(course)) {
      return res.status(400).json({
        success: false,
        message: 'معرف الكورس غير صالح',
      });
    }

    if (typeof attachments !== 'undefined' && !Array.isArray(attachments)) {
      return res.status(400).json({
        success: false,
        message: 'صيغة المرفقات غير صحيحة',
      });
    }

    if (!VALID_TYPES.has(type)) {
      return res.status(400).json({
        success: false,
        message: 'نوع المحتوى غير مدعوم',
      });
    }

    const access = await resolveCourseAccess({
      courseId: course,
      user: req.user,
      allowStudent: false,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    const content = await Content.create({
      course,
      type,
      title: title.trim(),
      body: body || '',
      attachments: normalizeAttachmentArray(attachments),
      contentDate: contentDate || new Date(),
      order: TYPE_ORDER[type] || 1,
      dueDate: type === 'task' ? dueDate || null : null,
      maxScore: type === 'task' ? Number(maxScore) || 100 : 100,
      createdBy: req.user._id,
    });

    await content.populate('createdBy', 'name role');

    return res.status(201).json({
      success: true,
      data: serializeContent(content, req, { course: access.course }),
    });
  } catch (error) {
    console.error('createContent error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const updateContent = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف المحتوى غير صالح' });
    }

    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ success: false, message: 'المحتوى غير موجود' });
    }

    const access = await resolveCourseAccess({
      courseId: content.course,
      user: req.user,
      allowStudent: false,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    if (!getContentPermissions({ user: req.user, content, course: access.course }).canEdit) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل هذا المحتوى',
      });
    }

    if (typeof req.body.attachments !== 'undefined' && !Array.isArray(req.body.attachments)) {
      return res.status(400).json({
        success: false,
        message: 'صيغة المرفقات غير صحيحة',
      });
    }

    if (typeof req.body.course !== 'undefined' && req.body.course.toString() !== content.course.toString()) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تغيير الكورس بعد إنشاء المحتوى',
      });
    }

    if (typeof req.body.type === 'string') {
      if (!VALID_TYPES.has(req.body.type)) {
        return res.status(400).json({
          success: false,
          message: 'نوع المحتوى غير مدعوم',
        });
      }

      content.type = req.body.type;
    }

    if (typeof req.body.title === 'string') {
      const nextTitle = req.body.title.trim();

      if (!nextTitle) {
        return res.status(400).json({
          success: false,
          message: 'العنوان مطلوب',
        });
      }

      content.title = nextTitle;
    }

    if (typeof req.body.body === 'string') content.body = req.body.body;
    if (typeof req.body.contentDate !== 'undefined') content.contentDate = req.body.contentDate;
    if (typeof req.body.dueDate !== 'undefined') content.dueDate = req.body.dueDate || null;
    if (typeof req.body.maxScore !== 'undefined') content.maxScore = Number(req.body.maxScore) || 100;
    if (typeof req.body.attachments !== 'undefined') {
      content.attachments = normalizeAttachmentArray(req.body.attachments);
    }

    content.order = TYPE_ORDER[content.type] || 1;

    if (content.type !== 'task') {
      content.dueDate = null;
      content.maxScore = 100;
    }

    await content.save();
    await content.populate('createdBy', 'name role');

    return res.json({
      success: true,
      data: serializeContent(content, req, { course: access.course }),
    });
  } catch (error) {
    console.error('updateContent error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const deleteContent = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف المحتوى غير صالح' });
    }

    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ success: false, message: 'المحتوى غير موجود' });
    }

    const access = await resolveCourseAccess({
      courseId: content.course,
      user: req.user,
      allowStudent: false,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    if (!getContentPermissions({ user: req.user, content, course: access.course }).canDelete) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا المحتوى',
      });
    }

    if (content.type === 'task') {
      await Submission.deleteMany({ task: content._id });
    }

    await content.deleteOne();

    return res.json({ success: true, message: 'تم حذف المحتوى بنجاح' });
  } catch (error) {
    console.error('deleteContent error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

module.exports = {
  createContent,
  deleteContent,
  getContentById,
  getCourseContent,
  updateContent,
};
