const mongoose = require('mongoose');
const bcrypt= require('bcryptjs');
//student, teacher, admin, superadmin

//schema 

// def=========================================================================
// Each key is a field; the value describes its type and rules.
const userSchema = new mongoose.Schema(
  {

    name: {
      type:String,
      required: [true, 'الاسم مطلوب'],
      trim:true,
    },

    //uique username
    username: {
      type:     String,
      required: [true, 'اسم المستخدم مطلوب'],
      unique:true,
      trim:true,
      lowercase: true,
    },

    //STU-XXXX
    studentId: {
      type:String,
      unique: true,
      sparse: true,
    },

    password: {
      type:String,
      required: [true, 'كلمة المرور مطلوبة'],
      minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'],
    },

    // User role determines what they can see and do
    //control access in the auth mw
    role: {
      type:String,
      enum:['student', 'teacher', 'admin', 'superadmin'],
      default: 'student', 
    },

    isActive: {
      type:    Boolean,
      default: true, 
    },

    avatar: {
      type: String,
      trim: true,
      default: '',
    },

  },
  {
    timestamps: true,
  }
);

//Pre-save===========================================================================

userSchema.pre('save', async function (next) {

  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

//generateStudentId =======================================================================
userSchema.statics.generateStudentId = async function (role) {
  //prefix based on role
  const prefix = role === 'teacher'? 'TCH' :
                 role === 'admin'? 'ADM' :
                 role === 'superadmin'? 'SAD' : 'STU';

  //generating until founding unique ID
  let id, exists;
  do {
    //4-digit random number
    const num = String(Math.floor(1000 + Math.random() * 9000));
    id = `${prefix}-${num}`;
    exists = await this.findOne({ studentId: id });
  } while (exists);
  return id;
};

module.exports = mongoose.model('User', userSchema);
