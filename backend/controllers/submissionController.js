const mongoose = require('mongoose');

const Submission = require('../models/Submission');
const Content = require('../models/Content');
const Enrollment = require('../models/Enrollment');
const { normalizeAttachmentArray } = require('../utils/attachments');
const { resolveCourseAccess } = require('../utils/courseAccess');
const { getSubmissionPermissions, isSubmissionWindowOpen, userHasManagerPrivileges } = require('../utils/permissions');
const { serializeSubmission } = require('../utils/serializers');

const getSafeAnswer = (answer) => (typeof answer === 'string' ? answer.trim() : '');
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const submitTask = async (req, res) => {
  try {
    const { taskId, answer, attachments } = req.body;

    if (!taskId) {
      return res.status(400).json({ success: false, message: 'معرف التاسك مطلوب' });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: 'معرف المهمة غير صالح' });
    }

    const task = await Content.findById(taskId);

    if (!task || task.type !== 'task') {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: task.course,
      isActive: true,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'يجب أن تكون مسجلاً في الكورس لتسليم التاسك',
      });
    }

    if (typeof attachments !== 'undefined' && !Array.isArray(attachments)) {
      return res.status(400).json({
        success: false,
        message: 'صيغة المرفقات غير صحيحة',
      });
    }

    if (!isSubmissionWindowOpen(task)) {
      return res.status(403).json({
        success: false,
        message: 'انتهى موعد التسليم ولا يمكنك تعديل الإجابة الآن',
      });
    }

    const safeAnswer = getSafeAnswer(answer);
    const safeAttachments = normalizeAttachmentArray(attachments);

    if (!safeAnswer && safeAttachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'أضف إجابة نصية أو ملفاً واحداً على الأقل',
      });
    }

    let submission = await Submission.findOne({
      task: taskId,
      student: req.user._id,
    });

    if (!submission) {
      submission = new Submission({
        task: taskId,
        student: req.user._id,
      });
    }

    submission.answer = safeAnswer;
    submission.attachments = safeAttachments;
    submission.status = 'submitted';
    submission.feedback = '';
    submission.grade = undefined;

    await submission.save();

    return res.status(201).json({
      success: true,
      data: serializeSubmission(submission, req, { task }),
    });
  } catch (error) {
    console.error('submitTask error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('task', 'title type contentDate course dueDate')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: submissions.length,
      data: submissions.map((submission) =>
        serializeSubmission(submission, req, { task: submission.task })
      ),
    });
  } catch (error) {
    console.error('getMySubmissions error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const getTaskSubmissions = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.taskId)) {
      return res.status(400).json({ success: false, message: 'معرف المهمة غير صالح' });
    }

    const task = await Content.findById(req.params.taskId).select('course type');

    if (!task || task.type !== 'task') {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    const access = await resolveCourseAccess({
      courseId: task.course,
      user: req.user,
      allowStudent: false,
    });

    if (!access.course) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      });
    }

    const submissions = await Submission.find({ task: req.params.taskId })
      .populate('student', 'name username studentId')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: submissions.length,
      data: submissions.map((submission) => serializeSubmission(submission, req, { task })),
    });
  } catch (error) {
    console.error('getTaskSubmissions error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const deleteSubmission = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف التسليم غير صالح' });
    }

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ success: false, message: 'التسليم غير موجود' });
    }

    const task = await Content.findById(submission.task).select('course dueDate type');

    if (!task || task.type !== 'task') {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    if (userHasManagerPrivileges(req.user)) {
      const access = await resolveCourseAccess({
        courseId: task.course,
        user: req.user,
        allowStudent: false,
      });

      if (!access.course) {
        return res.status(access.statusCode).json({
          success: false,
          message: access.message,
        });
      }
    }

    if (!getSubmissionPermissions({ user: req.user, submission, task }).canDelete) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بالحذف' });
    }

    await submission.deleteOne();

    return res.json({ success: true, message: 'تم حذف التسليم بنجاح' });
  } catch (error) {
    console.error('deleteSubmission error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const getStudentTaskStatus = async (req, res) => {
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

    const tasks = await Content.find({
      course: access.course._id,
      type: 'task',
    }).select('_id dueDate');

    const submissions = await Submission.find({
      task: { $in: tasks.map((task) => task._id) },
      student: req.user._id,
    });

    const statusMap = {};

    submissions.forEach((submission) => {
      const task = tasks.find((item) => item._id.toString() === submission.task.toString());
      statusMap[submission.task.toString()] = serializeSubmission(submission, req, { task });
    });

    return res.json({ success: true, data: statusMap });
  } catch (error) {
    console.error('getStudentTaskStatus error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

module.exports = {
  deleteSubmission,
  getMySubmissions,
  getStudentTaskStatus,
  getTaskSubmissions,
  submitTask,
};
