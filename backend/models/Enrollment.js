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
  },
  {
    timestamps: true,
  }
);

//constraint======================================================================
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
