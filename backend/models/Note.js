const mongoose = require('mongoose');

// Personal sticky note for a student's digital notepad. A note always belongs
// to exactly one student (owner) and may optionally be linked to one of their
// courses. Ownership is derived server-side from req.user — never from client
// input — so a student can only ever read or mutate their own notes.
const noteSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الطالب مطلوب'],
      index: true,
    },

    // Optional link to one of the student's courses.
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },

    title: {
      type: String,
      default: '',
      trim: true,
    },

    content: {
      type: String,
      required: [true, 'محتوى الملاحظة مطلوب'],
      trim: true,
    },

    // Sticky-note background colour (hex). Defaults to a soft yellow.
    color: {
      type: String,
      default: '#fef08a',
    },

    pinned: {
      type: Boolean,
      default: false,
    },

    // Manual sort position within the board (lower = earlier).
    order: {
      type: Number,
      default: 0,
    },

    // Multi-tenancy isolation key. Every note belongs to exactly one tenant;
    // legacy/unspecified records fall back to the shared 'default' tenant.
    tenantId: {
      type: String,
      required: true,
      default: 'default',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Efficient per-owner board listing: pinned first, then manual order, newest last.
noteSchema.index({ student: 1, pinned: -1, order: 1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
