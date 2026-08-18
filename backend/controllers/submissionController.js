const mongoose = require('mongoose');

const Submission = require('../models/Submission');
const Content = require('../models/Content');
const Enrollment = require('../models/Enrollment');
const { normalizeAttachmentArray } = require('../utils/attachments');
const { resolveCourseAccess } = require('../utils/courseAccess');
const { getSubmissionPermissions, isSubmissionWindowOpen, userHasManagerPrivileges } = require('../utils/permissions');
const { serializeSubmission } = require('../utils/serializers');
const { notify } = require('../utils/notifications');
const { triggerActivity } = require('../utils/gamification');

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

    // A draft task must be invisible to students — treat it as non-existent so a
    // student cannot submit against unpublished work by sending its ID directly.
    if (!task || task.type !== 'task' || task.isPublished === false) {
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

    // Late submissions are ACCEPTED (not rejected) and flagged server-side.
    // Authority is the existing isSubmissionWindowOpen — no second calculation.
    const submittedLate = !isSubmissionWindowOpen(task);

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
    // Recomputed on every mutation from the authoritative deadline. Any client
    // `req.body.isLate` is ignored — the server value always wins.
    submission.isLate = submittedLate;

    await submission.save();

    // Gamification: count the submission (+XP) and re-evaluate badges. Fire-and-
    // forget — never blocks or fails the submission that was just saved.
    triggerActivity(req.user._id, 'submission', { maxScore: task.maxScore });

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
      data: submissions.map((submission) =>
        serializeSubmission(submission, req, { task, course: access.course })
      ),
    });
  } catch (error) {
    console.error('getTaskSubmissions error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

const gradeSubmission = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف التسليم غير صالح' });
    }

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ success: false, message: 'التسليم غير موجود' });
    }

    const task = await Content.findById(submission.task).select('course type maxScore dueDate title');

    if (!task || task.type !== 'task') {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    // Server-side authorization: only an admin/superadmin or the assigned course
    // teacher may grade. resolveCourseAccess with allowStudent:false is the same
    // gate used to view a task's submissions, so students can never reach here.
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

    // Multi-tenancy: an Organization Admin may only grade submissions in their
    // own tenant (a submission's tenant is its course's tenant). Super Admin is
    // unrestricted; teachers are already ownership-scoped. Respond as not-found
    // to avoid cross-tenant disclosure. Missing tenant -> 'default' (with a warning).
    if (!req.tenantId) {
      console.warn('gradeSubmission: req.tenantId missing — defaulting to "default" tenant');
    }
    if (req.user.role === 'admin' && access.course.tenantId !== (req.tenantId || 'default')) {
      return res.status(404).json({ success: false, message: 'التسليم غير موجود' });
    }

    const maxScore = typeof task.maxScore === 'number' ? task.maxScore : 100;
    const rawGrade = req.body.grade;
    const grade = Number(rawGrade);

    if (rawGrade === '' || rawGrade === null || typeof rawGrade === 'undefined' || Number.isNaN(grade)) {
      return res.status(400).json({ success: false, message: 'الدرجة مطلوبة ويجب أن تكون رقماً' });
    }

    if (grade < 0 || grade > maxScore) {
      return res.status(400).json({
        success: false,
        message: `الدرجة يجب أن تكون بين 0 و ${maxScore}`,
      });
    }

    submission.grade = grade;
    submission.feedback = typeof req.body.feedback === 'string' ? req.body.feedback.trim() : '';
    submission.status = 'graded';

    await submission.save();
    await submission.populate('student', 'name username studentId');

    // Notify the student that their submission was graded (non-blocking — a
    // notification failure never affects the grade that was just saved).
    await notify(submission.student?._id || submission.student, {
      type: 'SUBMISSION_GRADED',
      title: 'تم تقييم تسليمك',
      message: `«${task.title}»: ${grade} من ${maxScore}`,
      course: task.course,
      link: `/student/course/${task.course}`,
    });

    // Gamification: a full-marks grade earns a perfect score (+XP, Perfectionist
    // badge). Grading time is the only point the grade exists. Fire-and-forget.
    if (maxScore > 0 && grade >= maxScore) {
      triggerActivity(submission.student?._id || submission.student, 'perfect_score');
    }

    return res.json({
      success: true,
      data: serializeSubmission(submission, req, { task, course: access.course }),
    });
  } catch (error) {
    console.error('gradeSubmission error:', error);
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

    // Student-facing: exclude draft tasks so their statuses/IDs never surface
    // (published or legacy records only; explicit drafts filtered out).
    const tasks = await Content.find({
      course: access.course._id,
      type: 'task',
      isPublished: { $ne: false },
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
  gradeSubmission,
  submitTask,
};
