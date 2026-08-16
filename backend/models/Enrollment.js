const mongoose = require('mongoose');
const enrollmentSchema = new mongoose.Schema
(
  {
    // الطالب المسجل
    student: {
      type:mongoose.Schema.Types.ObjectId,
      ref:'User',
      required: [true, 'الطالب مطلوب'],
    },

    //course they r enrolled in
    course: {
      type:mongoose.Schema.Types.ObjectId,
      ref:'Course',
      required: [true, 'الكورس مطلوب'],
    },

    completedLectures: {
      type:[mongoose.Schema.Types.ObjectId],
      ref:'Content',     
      default: [],
    },

    isActive: {
      type:Boolean,
      default: true,
    },

    // Multi-tenancy isolation key. Every enrollment belongs to exactly one
    // tenant; legacy/unspecified records fall back to the shared 'default' tenant.
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

//constraint======================================================================
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
