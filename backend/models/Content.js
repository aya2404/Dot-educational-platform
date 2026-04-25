const mongoose = require('mongoose');
const contentSchema = new mongoose.Schema
(
  {
    course: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Course',
      required: [true, 'الكورس مطلوب'],
    },

    //teacher who created the content
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'المنشئ مطلوب'],
    },

    type: {
      type:     String,
      enum:     ['lecture', 'material', 'task', 'announcement'],
      required: [true, 'نوع المحتوى مطلوب'],
    },

    title: {
      type:     String,
      required: [true, 'العنوان مطلوب'],
      trim:     true,
    },

    body: {
      type:    String,
      default: '',
    },

    //attachment URLs
    attachments: {
      type:[mongoose.Schema.Types.Mixed],
      default: [],
    },

    contentDate: {
      type:    Date,
      default: Date.now, 
    },

    order: {
      type:    Number,
      default: 1,
    },

    dueDate: {
      type: Date,
    },

    maxScore: {
      type:    Number,
      default: 100,
    },
  },
  {
    timestamps: true, 
  }
);

//Index============================================================================

contentSchema.index({ course: 1, contentDate: 1, order: 1 });

module.exports = mongoose.model('Content', contentSchema);
