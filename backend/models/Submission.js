const mongoose = require('mongoose');
const submissionSchema = new mongoose.Schema
(
  {
    task: {
      type:mongoose.Schema.Types.ObjectId,
      ref:'Content',
      required: [true, 'المهمة مطلوبة'],
    },

    student: {
      type:mongoose.Schema.Types.ObjectId,
      ref:'User',
      required: [true, 'الطالب مطلوب'],
    },

    answer: {
      type:String,
      default: '',
    },

    //URLs to any files the stu attached 
    attachments: {
      type:[mongoose.Schema.Types.Mixed],
      default: [],
    },

    grade: {
      type: Number,
      min:  0,
    },

    feedback: {
      type:String,
      default: '',
    },

    status: {
      type:String,
      enum:['submitted', 'graded'],
      default: 'submitted',
    },
  },
  {
    timestamps: true,
  }
);
//submit once per task
submissionSchema.index({ task: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
