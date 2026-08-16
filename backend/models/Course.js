const mongoose = require('mongoose');
const courseSchema = new mongoose.Schema
(
  {
    name: {
      type:     String,
      required: [true, 'اسم الكورس مطلوب'],
      trim:     true,
    },

    description: {
      type:    String,
      default: '',
      trim:    true,
    },
//ref to teacher !!!!!
    teacher: {
      type: mongoose.Schema.Types.ObjectId, 
      ref:'User',   
    },

    //AM-FS-4-26-YGA
    group: {
      type:  String,
      trim:  true,
    },

    //6 PM - 9 PM
    time: {
      type:String,
      trim:true,
    },

    //Sunday,Tuesday,Thursday
    days: {
      type:[String],
      default: [],
    },

    startDate: {
      type: Date,
    },

    // Multi-tenancy isolation key. Every course belongs to exactly one tenant;
    // legacy/unspecified records fall back to the shared 'default' tenant.
    tenantId: {
      type: String,
      required: true,
      default: 'default',
      index: true,
    },

  },
  {
    //createdAt & updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model('Course', courseSchema);
