require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Course = require('./models/Course');
const Content = require('./models/Content');
const Enrollment = require('./models/Enrollment');

// ============================================================================
// Idempotent, NON-DESTRUCTIVE, fully-fictional demo seed.
//
//  * Never deletes anything (no deleteMany / drop / deleteOne). Every record is
//    created once and updated in place on re-runs, keyed by a deterministic
//    field, so running `npm run seed` repeatedly converges without duplicates.
//  * All identities are FICTIONAL demo data — safe to showcase publicly.
//  * No plaintext passwords live in this file. The demo-account passwords are
//    read from environment variables and documented only in LOCAL_SETUP.md.
//  * Passwords are always hashed by the User model's pre-save bcrypt hook.
// ============================================================================

// ---- idempotent helpers (create-or-update, never delete) ----
const ensureUser = async ({ name, username, studentId, password, role }) => {
  const user = await User.findOne({ username }).select('+password');
  if (user) {
    user.name = name;
    user.studentId = studentId;
    user.role = role;
    user.isActive = true;
    user.password = password; // re-hashed by the pre-save hook
    await user.save();
    return user;
  }
  return User.create({ name, username, studentId, password, role });
};

const ensureCourse = async (data) => {
  const course = await Course.findOne({ name: data.name });
  if (course) {
    Object.assign(course, data);
    await course.save();
    return course;
  }
  return Course.create(data);
};

const ensureEnrollment = async (student, course) => {
  const existing = await Enrollment.findOne({ student, course });
  if (existing) {
    existing.isActive = true;
    await existing.save();
    return existing;
  }
  return Enrollment.create({ student, course, isActive: true });
};

const ensureContent = async (item) => {
  const existing = await Content.findOne({ course: item.course, title: item.title });
  if (existing) {
    Object.assign(existing, item);
    await existing.save();
    return existing;
  }
  return Content.create(item);
};

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// ============================= DEMO ACCOUNTS ================================
// Exactly one fictional demo account per role. Passwords come from environment
// variables (see LOCAL_SETUP.md → Demo Accounts) — never hardcoded here.
const DEMO_USERS = [
  { name: 'Lina Salem',   username: 'demo.student',    studentId: 'STU-9001', role: 'student',    password: process.env.DEMO_STUDENT_PASSWORD },
  { name: 'Omar Naji',    username: 'demo.teacher',    studentId: 'TCH-9001', role: 'teacher',    password: process.env.DEMO_TEACHER_PASSWORD },
  { name: 'Sara Haddad',  username: 'demo.admin',      studentId: 'ADM-9001', role: 'admin',      password: process.env.DEMO_ADMIN_PASSWORD },
  { name: 'Kareem Faris', username: 'demo.superadmin', studentId: 'SAD-9001', role: 'superadmin', password: process.env.DEMO_SUPERADMIN_PASSWORD },
];

// ====================== FICTIONAL FILLER STUDENTS ==========================
// Fictional names used only to populate rosters and admin dashboards. They all
// share the demo-student password (from env) so no plaintext password is stored
// in this file. Usernames and IDs are deterministic.
const fictionalStudentNames = [
  'ليان السالمي', 'ريان النعيمي', 'سارة المهداوي', 'يزن الرفاعي', 'نور الكيلاني',
  'آدم البرغوثي', 'جود النبهاني', 'تالا المرادي', 'زيد الحارثي', 'ريم الدروبي',
  'كرم الشامي', 'لمى العزام', 'سيف المقداد', 'دانة الفاعوري', 'وسيم الطراونة',
  'جنى القيسي', 'هاشم الدباس', 'ملك السرحان', 'علي المصري', 'رهام الخالدي',
  'فارس العتيبي', 'ندى الحلبي',
];

// ============================ DEMO COURSES =================================
// Two fictional courses, both owned by the demo teacher, with professional,
// generic content (no personal names anywhere).
const COURSE_FULLSTACK = 'Full-Stack Web Development — Demo Cohort';
const COURSE_FRONTEND  = 'React & Modern Frontend — Demo Cohort';

const fullstackContent = (courseId, teacherId) => [
  { type: 'announcement', title: 'Welcome to the Demo Learning Environment', body: 'A quick tour of how lectures, materials, announcements, and assignments work in this demo.', contentDate: new Date('2026-03-02'), order: 1 },
  { type: 'lecture',      title: 'Introduction to Modern Web Development', body: 'The full-stack workflow, tooling, and how the pieces fit together.', contentDate: new Date('2026-03-02'), order: 2 },
  { type: 'material',     title: 'Environment Setup Guide', body: 'Step-by-step setup for Node.js, VS Code, and Git.', contentDate: new Date('2026-03-04'), order: 1 },
  { type: 'lecture',      title: 'REST API Design', body: 'Designing clean, resource-oriented JSON APIs with Express.', contentDate: new Date('2026-03-06'), order: 1 },
  { type: 'lecture',      title: 'Authentication & Authorization', body: 'Sessions vs. tokens, JWTs, password hashing, and role-based access.', contentDate: new Date('2026-03-09'), order: 1 },
  { type: 'material',     title: 'MongoDB & Mongoose Cheat Sheet', body: 'Schemas, models, relationships, and common queries.', contentDate: new Date('2026-03-11'), order: 1 },
  { type: 'task',         title: 'Create a REST API', body: 'Build CRUD endpoints for a small resource of your choice. Submit a repository link or a file.', contentDate: new Date('2026-03-06'), order: 2, dueDate: daysFromNow(45), maxScore: 100 },
  { type: 'task',         title: 'Implement JWT Authentication', body: 'Add login, protected routes, and role checks to your API. Submit a short write-up or a file.', contentDate: new Date('2026-03-11'), order: 2, dueDate: daysFromNow(60), maxScore: 100 },
].map((c) => ({ ...c, course: courseId, createdBy: teacherId }));

const frontendContent = (courseId, teacherId) => [
  { type: 'announcement', title: 'New Module Available: React', body: 'The React module is now open. Start with the fundamentals lecture below.', contentDate: new Date('2026-03-16'), order: 1 },
  { type: 'lecture',      title: 'React Fundamentals', body: 'Components, JSX, and rendering the UI as a function of state.', contentDate: new Date('2026-03-16'), order: 2 },
  { type: 'lecture',      title: 'State, Props & Hooks', body: 'Managing local state with useState and side effects with useEffect.', contentDate: new Date('2026-03-18'), order: 1 },
  { type: 'material',     title: 'Component Design Patterns', body: 'Reference material on composition, lifting state, and reusable UI.', contentDate: new Date('2026-03-20'), order: 1 },
  { type: 'lecture',      title: 'Client-Side Routing', body: 'Building multi-view single-page apps with a router.', contentDate: new Date('2026-03-23'), order: 1 },
  { type: 'task',         title: 'Build Your First React Dashboard', body: 'Create a small responsive dashboard with React. Submit a link or a file.', contentDate: new Date('2026-03-20'), order: 2, dueDate: daysFromNow(50), maxScore: 100 },
].map((c) => ({ ...c, course: courseId, createdBy: teacherId }));

// ================================= SEED ===================================
const seed = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI missing');
    }

    // Demo passwords must be supplied via environment variables — never hardcoded.
    const missing = DEMO_USERS.filter((u) => !u.password).map((u) => u.username);
    if (missing.length) {
      throw new Error(
        `Missing demo password env vars for: ${missing.join(', ')}. ` +
        'Set DEMO_STUDENT_PASSWORD / DEMO_TEACHER_PASSWORD / DEMO_ADMIN_PASSWORD / ' +
        'DEMO_SUPERADMIN_PASSWORD in backend/.env — see LOCAL_SETUP.md → Demo Accounts.'
      );
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected — running non-destructive idempotent demo seed');

    // ----- Demo accounts (one fictional account per role) -----
    const demoUsers = [];
    for (const demo of DEMO_USERS) demoUsers.push(await ensureUser(demo));
    const demoStudent = demoUsers.find((u) => u.role === 'student');
    const demoTeacher = demoUsers.find((u) => u.role === 'teacher');
    console.log('Demo accounts ready (one per role)');

    // ----- Fictional filler students (share the demo-student password) -----
    const fillerStudents = [];
    for (let i = 0; i < fictionalStudentNames.length; i++) {
      const index = i + 1;
      fillerStudents.push(await ensureUser({
        name: fictionalStudentNames[i],
        username: `student_${String(index).padStart(3, '0')}`,
        studentId: `STU-${1000 + index}`,
        password: process.env.DEMO_STUDENT_PASSWORD,
        role: 'student',
      }));
    }
    console.log(`Fictional filler students ready (${fillerStudents.length})`);

    // ----- Two demo courses, both owned by the demo teacher -----
    const fullStackCourse = await ensureCourse({
      name: COURSE_FULLSTACK,
      description: 'A fictional demonstration course showcasing the Dot Jordan learning experience across student, teacher, admin, and super admin roles.',
      teacher: demoTeacher._id,
      group: 'DEMO-FS-2026',
      time: '5 PM - 8 PM',
      days: ['Monday', 'Wednesday'],
      startDate: new Date('2026-03-02'),
    });

    const frontendCourse = await ensureCourse({
      name: COURSE_FRONTEND,
      description: 'A fictional demo course covering React and modern front-end development.',
      teacher: demoTeacher._id,
      group: 'DEMO-FE-2026',
      time: '6 PM - 9 PM',
      days: ['Sunday', 'Tuesday'],
      startDate: new Date('2026-03-16'),
    });

    // ----- Enrollments -----
    // Demo student sees both courses (rich dashboard).
    await ensureEnrollment(demoStudent._id, fullStackCourse._id);
    await ensureEnrollment(demoStudent._id, frontendCourse._id);
    // Filler students populate the rosters: all in Full-Stack, first 10 also in Frontend.
    for (const s of fillerStudents) await ensureEnrollment(s._id, fullStackCourse._id);
    for (const s of fillerStudents.slice(0, 10)) await ensureEnrollment(s._id, frontendCourse._id);

    // ----- Course content -----
    for (const item of fullstackContent(fullStackCourse._id, demoTeacher._id)) await ensureContent(item);
    for (const item of frontendContent(frontendCourse._id, demoTeacher._id)) await ensureContent(item);

    console.log('Seed completed successfully (idempotent — safe to re-run)');
    console.log('\nDemo accounts (log in with username OR studentId — passwords in LOCAL_SETUP.md):');
    DEMO_USERS.forEach((d) =>
      console.log(`  ${d.role.padEnd(10)}  ${d.username.padEnd(16)} | ${d.studentId}`)
    );

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
