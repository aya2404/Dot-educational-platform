const mongoose = require('mongoose');
const Note = require('../models/Note');
const Enrollment = require('../models/Enrollment');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// All handlers are strictly scoped to the authenticated student (req.user). A
// student can only ever see or mutate their own notes — the owner is never taken
// from the client. Reads/writes are additionally tenant-scoped (Super Admin
// excepted). Missing req.tenantId falls back to 'default' with a warning.
const scopedFilter = (req, extra = {}) => {
  if (!req.tenantId) {
    console.warn('noteController: req.tenantId missing — defaulting to "default" tenant');
  }
  const filter = { student: req.user._id, ...extra };
  if (req.user?.role !== 'superadmin') {
    filter.tenantId = req.tenantId || 'default';
  }
  return filter;
};

// Resolve a client-supplied course id to one the student is actually enrolled in
// (within their tenant). Returns undefined for "no course", null for an invalid
// / not-owned course so the caller can reject it.
const resolveCourseId = async (req, courseId) => {
  if (courseId === undefined || courseId === null || courseId === '') {
    return undefined;
  }
  if (!isValidObjectId(courseId)) {
    return null;
  }
  const enrollmentFilter = { student: req.user._id, course: courseId };
  if (req.user?.role !== 'superadmin') {
    enrollmentFilter.tenantId = req.tenantId || 'default';
  }
  const enrollment = await Enrollment.findOne(enrollmentFilter).select('_id');
  return enrollment ? courseId : null;
};

const listNotes = async (req, res) => {
  try {
    // Pinned first, then manual order, then newest — matches the board layout.
    const notes = await Note.find(scopedFilter(req))
      .sort({ pinned: -1, order: 1, createdAt: -1 })
      .populate('course', 'name');
    return res.json({ success: true, count: notes.length, data: notes });
  } catch (error) {
    console.error('listNotes error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

const createNote = async (req, res) => {
  try {
    const { title, content, color, pinned, order, course } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: 'محتوى الملاحظة مطلوب' });
    }

    const resolvedCourse = await resolveCourseId(req, course);
    if (resolvedCourse === null) {
      return res.status(400).json({ success: false, message: 'الكورس المحدد غير صالح' });
    }

    const note = await Note.create({
      student: req.user._id,
      tenantId: req.tenantId || 'default',
      title: title || '',
      content: String(content).trim(),
      color: color || undefined,
      pinned: Boolean(pinned),
      order: Number.isFinite(order) ? order : 0,
      course: resolvedCourse,
    });

    const populated = await note.populate('course', 'name');
    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('createNote error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

const updateNote = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف الملاحظة غير صالح' });
    }

    // Owner- and tenant-scoped: a note belonging to another student or tenant is
    // simply not found (404), so it can never be mutated across a boundary.
    const note = await Note.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!note) {
      return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    }

    const { title, content, color, pinned, order, course } = req.body;

    if (title !== undefined) note.title = title;
    if (content !== undefined) {
      if (!String(content).trim()) {
        return res.status(400).json({ success: false, message: 'محتوى الملاحظة مطلوب' });
      }
      note.content = String(content).trim();
    }
    if (color !== undefined) note.color = color;
    if (pinned !== undefined) note.pinned = Boolean(pinned);
    if (order !== undefined && Number.isFinite(Number(order))) note.order = Number(order);
    if (course !== undefined) {
      const resolvedCourse = await resolveCourseId(req, course);
      if (resolvedCourse === null) {
        return res.status(400).json({ success: false, message: 'الكورس المحدد غير صالح' });
      }
      note.course = resolvedCourse || undefined;
    }

    await note.save();
    const populated = await note.populate('course', 'name');
    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error('updateNote error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

const deleteNote = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف الملاحظة غير صالح' });
    }

    // Owner- and tenant-scoped delete: another student's/tenant's note is not
    // found (404) and can never be deleted cross-boundary.
    const note = await Note.findOneAndDelete(scopedFilter(req, { _id: req.params.id }));
    if (!note) {
      return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    }

    return res.json({ success: true, message: 'تم حذف الملاحظة' });
  } catch (error) {
    console.error('deleteNote error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

module.exports = { listNotes, createNote, updateNote, deleteNote };
