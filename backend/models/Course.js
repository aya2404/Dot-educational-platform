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

  },
  {
    //createdAt & updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model('Course', courseSchema);
