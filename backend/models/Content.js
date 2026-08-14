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
      enum:     ['lecture', 'video', 'material', 'link', 'task', 'announcement'],
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

    // Publication state. Defaults to true so newly created content is live and,
    // combined with a `{ $ne: false }` student read filter, pre-existing records
    // (which have no field) remain published — no migration required. Only an
    // explicit `false` marks a draft that students must never see.
    isPublished: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true, 
  }
);

//Index============================================================================

contentSchema.index({ course: 1, contentDate: 1, order: 1 });

module.exports = mongoose.model('Content', contentSchema);
