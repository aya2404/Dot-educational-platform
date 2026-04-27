require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Course = require('./models/Course');
const Content = require('./models/Content');
const Enrollment = require('./models/Enrollment');
const Submission = require('./models/Submission');

// ================= HELPERS =================
const generateUsername = (role, index) => {
  const padded = String(index).padStart(3, '0');
  return `${role}_${padded}`;
};

// ================= STUDENTS =================
const studentNames = [
  'رهف هاشم ابو معيلش',
  'ايهم صقر الربضي',
  'آية محمد أبو طه',
  'أيمن بسام مصبح',
  'رامي نضال الجابر',
  'فرح خالد عراده',
  'موسى عاطف البحتي',
  'عزالدين باجس البيطار',
  'عمر زهير ابو عباس',
  'رفاه عمر زيادات',
  'نسيم علي عيسى',
  'تكريت عمر الزيادات',
  'عيسى عصام ابو هدهود',
  'محمد احمد عبدالله',
  'نغم عبدالسلام الرجوب',
  'رغد أسامه عطوة',
  'عبدالرحمن عصام ابو نعمة',
  'مرام نضال ابوحماده',
  'حمزة محمد طعاني'
];

// ================= SEED =================
const seed = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI missing');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    // تنظيف الداتا
    await Submission.deleteMany({});
    await Enrollment.deleteMany({});
    await Content.deleteMany({});
    await Course.deleteMany({});
    await User.deleteMany({});
    console.log('Database cleared');

    // ===== Super Admin =====
    const superAdmin = await User.create({
      name: 'System Owner',
      username: 'superadmin',
      studentId: 'SAD-0001',
      password: 'super2004',
      role: 'superadmin'
    });

    // ===== Teacher =====
    const teacher = await User.create({
      name: 'بلقيس محمد الخطيب',
      username: 'eng_balqees',
      studentId: 'TCH-0001',
      password: 'eng123456',
      role: 'teacher'
    });

    // ===== Students =====
    const students = [];

    for (let i = 0; i < studentNames.length; i++) {
      const index = i + 1;

      const student = await User.create({
        name: studentNames[i],
        username: generateUsername('student', index),
        studentId: `STU-${1000 + index}`,
        password: `student${1000 + index}`,
        role: 'student'
      });

      students.push(student);
    }

    // ===== Course =====
    const course = await Course.create({
      name: 'MERN Stack',
      description: 'تعلم تطوير تطبيقات كاملة باستخدام MERN Stack',
      teacher: teacher._id,
      group: 'AM-FS-4-26-YGA',
      time: '6 PM - 9 PM',
      days: ['Sunday', 'Tuesday', 'Thursday']
    });

    // ===== Enrollment =====
    await Enrollment.insertMany(
      students.map(s => ({
        student: s._id,
        course: course._id,
        isActive: true
      }))
    );

    // ================= CONTENT + LECTURES =================
    await Content.create([
      {
        course: course._id,
        createdBy: teacher._id,
        type: 'lecture',
        title: 'Introduction Session',
        body: 'مقدمة في تطوير الويب الكامل',
        contentDate: new Date('2026-01-22'),
        order: 1
      },
      {
        course: course._id,
        createdBy: teacher._id,
        type: 'material',
        title: 'Introduction to Web Development PDF',
        body: '1.Introduction to Web Development.pdf',
        contentDate: new Date('2026-01-22'),
        order: 2
      },
      {
        course: course._id,
        createdBy: teacher._id,
        type: 'lecture',
        title: 'Tools & Setup',
        body: 'Wireframing + UI/UX Basics',
        contentDate: new Date('2026-01-25'),
        order: 3
      },
      {
        course: course._id,
        createdBy: teacher._id,
        type: 'lecture',
        title: 'HTML Fundamentals',
        body: 'HTML Basics & Structure',
        contentDate: new Date('2026-01-27'),
        order: 4
      },
      {
        course: course._id,
        createdBy: teacher._id,
        type: 'lecture',
        title: 'CSS Introduction',
        body: 'Styling Basics',
        contentDate: new Date('2026-01-29'),
        order: 5
      },
      {
        course: course._id,
        createdBy: teacher._id,
        type: 'lecture',
        title: 'Responsive CSS & Media',
        body: 'Flexbox + Responsive Design',
        contentDate: new Date('2026-02-01'),
        order: 6
      },
      {
        course: course._id,
        createdBy: teacher._id,
        type: 'lecture',
        title: 'Flexbox',
        body: 'CSS Flexbox Layout',
        contentDate: new Date('2026-02-03'),
        order: 7
      },
      {
        course: course._id,
        createdBy: teacher._id,
        type: 'lecture',
        title: 'CSS Grid',
        body: 'Grid Layout System',
        contentDate: new Date('2026-02-05'),
        order: 8
      },
      {
        course: course._id,
        createdBy: teacher._id,
        type: 'lecture',
        title: 'Bootstrap',
        body: 'Bootstrap Framework',
        contentDate: new Date('2026-02-10'),
        order: 9
      },
      {
        course: course._id,
        createdBy: teacher._id,
        type: 'lecture',
        title: 'JavaScript Basics',
        body: 'JS Core Concepts',
        contentDate: new Date('2026-02-15'),
        order: 10
      }
    ]);

    console.log('Seed completed successfully');

    await mongoose.connection.close();
    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();