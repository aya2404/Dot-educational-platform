const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../models/User');
const Course = require('../models/Course');
const Content = require('../models/Content');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');
const Notification = require('../models/Notification');
const { notify, notifyMany } = require('../utils/notifications');
const {
  getMyNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');
const { enrollStudent } = require('../controllers/enrollmentController');
const { createContent } = require('../controllers/contentController');
const { gradeSubmission } = require('../controllers/submissionController');
const { protect } = require('../middleware/auth');

const TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

let owner; let admin; let studentA; let studentB; let studentC; let course; let task;

const cleanup = async () => {
  const courses = await Course.find({ name: /^ntest / });
  const ids = courses.map((c) => c._id);
  const contents = await Content.find({ course: { $in: ids } });
  await Submission.deleteMany({ task: { $in: contents.map((c) => c._id) } });
  await Content.deleteMany({ course: { $in: ids } });
  await Enrollment.deleteMany({ course: { $in: ids } });
  await Course.deleteMany({ name: /^ntest / });
  const users = await User.find({ username: /^ntest_/ });
  await Notification.deleteMany({ recipient: { $in: users.map((u) => u._id) } });
  await User.deleteMany({ username: /^ntest_/ });
};

const clearNotifs = () => Notification.deleteMany({
  recipient: { $in: [owner._id, studentA._id, studentB._id, studentC._id] },
});

test.before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await cleanup();
  owner = await User.create({ name: 'N Owner', username: 'ntest_owner', studentId: 'TCH-2101', password: 'secret123', role: 'teacher' });
  admin = await User.create({ name: 'N Admin', username: 'ntest_admin', studentId: 'ADM-2101', password: 'secret123', role: 'admin' });
  studentA = await User.create({ name: 'N Student A', username: 'ntest_sa', studentId: 'STU-2101', password: 'secret123', role: 'student' });
  studentB = await User.create({ name: 'N Student B', username: 'ntest_sb', studentId: 'STU-2102', password: 'secret123', role: 'student' });
  studentC = await User.create({ name: 'N Student C', username: 'ntest_sc', studentId: 'STU-2103', password: 'secret123', role: 'student' });
  course = await Course.create({ name: 'ntest course', teacher: owner._id });
  await Enrollment.create({ student: studentB._id, course: course._id, isActive: true }); // B enrolled; C not
  task = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'N Task', maxScore: 100, isPublished: true });
});

test.after(async () => {
  await cleanup();
  await mongoose.disconnect();
});

// ---------------------------- LIST / COUNT / READ ----------------------------
test('1. authenticated user lists only their own notifications (newest first)', async () => {
  await clearNotifs();
  await notify(studentB._id, { type: 'COURSE_ENROLLED', title: 'a', message: '1' });
  await notify(studentB._id, { type: 'COURSE_ENROLLED', title: 'b', message: '2' });
  await notify(studentC._id, { type: 'COURSE_ENROLLED', title: 'other', message: 'x' }); // must not appear

  const res = makeRes();
  await getMyNotifications({ user: studentB, query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.length, 2);
  assert.ok(res.body.data.every((n) => n.recipient.toString() === studentB._id.toString()));
  assert.equal(res.body.data[0].title, 'b'); // newest first
  assert.equal(res.body.unreadCount, 2);
});

test('4. unread count reflects only unread own notifications', async () => {
  await clearNotifs();
  await notify(studentB._id, { type: 'COURSE_ENROLLED', title: 'u1' });
  const readOne = await notify(studentB._id, { type: 'COURSE_ENROLLED', title: 'r1' });
  readOne.isRead = true; await readOne.save();

  const res = makeRes();
  await getUnreadCount({ user: studentB }, res);
  assert.equal(res.body.unreadCount, 1);
});

test('5 & 7. mark as read works and is idempotent', async () => {
  await clearNotifs();
  const n = await notify(studentB._id, { type: 'COURSE_ENROLLED', title: 'mark' });
  const r1 = makeRes();
  await markRead({ params: { id: n._id.toString() }, user: studentB }, r1);
  assert.equal(r1.statusCode, 200);
  assert.equal(r1.body.data.isRead, true);

  const r2 = makeRes();
  await markRead({ params: { id: n._id.toString() }, user: studentB }, r2);
  assert.equal(r2.statusCode, 200); // idempotent, still 200
  assert.equal(r2.body.data.isRead, true);
});

test('6. mark all as read', async () => {
  await clearNotifs();
  await notify(studentB._id, { type: 'COURSE_ENROLLED', title: 'x1' });
  await notify(studentB._id, { type: 'COURSE_ENROLLED', title: 'x2' });
  const res = makeRes();
  await markAllRead({ user: studentB }, res);
  assert.equal(res.body.modified, 2);
  assert.equal(await Notification.countDocuments({ recipient: studentB._id, isRead: false }), 0);
});

test('3. a user cannot read another user notification (foreign id -> 404, stays unread)', async () => {
  await clearNotifs();
  const n = await notify(studentB._id, { type: 'COURSE_ENROLLED', title: 'private' });
  const res = makeRes();
  await markRead({ params: { id: n._id.toString() }, user: studentC }, res); // C is not the recipient
  assert.equal(res.statusCode, 404);
  const fresh = await Notification.findById(n._id);
  assert.equal(fresh.isRead, false); // untouched
});

test('8. malformed notification id -> 400', async () => {
  const res = makeRes();
  await markRead({ params: { id: 'not-an-id' }, user: studentB }, res);
  assert.equal(res.statusCode, 400);
});

// ----------------------------- EVENT INTEGRATION -----------------------------
test('9. enrolling a student creates a COURSE_ENROLLED notification for that student', async () => {
  await clearNotifs();
  const res = makeRes();
  await enrollStudent({ body: { studentId: studentA._id.toString(), courseId: course._id.toString() }, user: owner }, res);
  assert.equal(res.statusCode, 201);
  const n = await Notification.findOne({ recipient: studentA._id, type: 'COURSE_ENROLLED' });
  assert.ok(n);
  assert.equal(n.course.toString(), course._id.toString());
  await Enrollment.deleteOne({ student: studentA._id, course: course._id }); // restore fixture
});

test('10 & 13. grading notifies only the student, never the teacher', async () => {
  await clearNotifs();
  const submission = await Submission.create({ task: task._id, student: studentB._id, status: 'submitted', answer: 'x' });
  const res = makeRes();
  await gradeSubmission({ params: { id: submission._id.toString() }, body: { grade: 88, feedback: 'ok' }, user: owner }, res);
  assert.equal(res.statusCode, 200);

  const studentNotif = await Notification.findOne({ recipient: studentB._id, type: 'SUBMISSION_GRADED' });
  assert.ok(studentNotif, 'student should be notified');
  assert.match(studentNotif.message, /88/);
  const teacherNotifs = await Notification.countDocuments({ recipient: owner._id });
  assert.equal(teacherNotifs, 0, 'teacher must NOT receive the student notification');
  await Submission.deleteOne({ _id: submission._id });
});

test('11 & 14. publishing a task notifies enrolled students only (not unenrolled)', async () => {
  await clearNotifs();
  const res = makeRes();
  await createContent({ body: { course: course._id.toString(), type: 'task', title: 'Fresh Task', isPublished: true }, user: owner }, res);
  assert.equal(res.statusCode, 201);

  const enrolled = await Notification.findOne({ recipient: studentB._id, type: 'NEW_TASK' });
  assert.ok(enrolled, 'enrolled student notified');
  const notEnrolled = await Notification.countDocuments({ recipient: studentC._id, type: 'NEW_TASK' });
  assert.equal(notEnrolled, 0, 'unenrolled student must NOT be notified');
  await Content.deleteMany({ course: course._id, title: 'Fresh Task' });
});

test('draft content does NOT notify students', async () => {
  await clearNotifs();
  const res = makeRes();
  await createContent({ body: { course: course._id.toString(), type: 'task', title: 'Draft Task', isPublished: false }, user: owner }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(await Notification.countDocuments({ recipient: studentB._id }), 0);
  await Content.deleteMany({ course: course._id, title: 'Draft Task' });
});

test('13. publishing an announcement notifies enrolled students with COURSE_ANNOUNCEMENT', async () => {
  await clearNotifs();
  const res = makeRes();
  await createContent({ body: { course: course._id.toString(), type: 'announcement', title: 'Fresh Announcement', isPublished: true }, user: owner }, res);
  assert.equal(res.statusCode, 201);
  const enrolled = await Notification.findOne({ recipient: studentB._id, type: 'COURSE_ANNOUNCEMENT' });
  assert.ok(enrolled, 'enrolled student notified of announcement');
  const notEnrolled = await Notification.countDocuments({ recipient: studentC._id, type: 'COURSE_ANNOUNCEMENT' });
  assert.equal(notEnrolled, 0, 'unenrolled student must NOT be notified');
  await Content.deleteMany({ course: course._id, title: 'Fresh Announcement' });
});

test('2. unauthenticated request is rejected by protect (401)', async () => {
  const res = makeRes();
  let nextCalled = false;
  await protect({ headers: {} }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('8b. mark-all-read affects ONLY the current user', async () => {
  await clearNotifs();
  await notify(studentB._id, { type: 'COURSE_ENROLLED', title: 'b-unread' });
  await notify(studentC._id, { type: 'COURSE_ENROLLED', title: 'c-unread' }); // another user

  const res = makeRes();
  await markAllRead({ user: studentB }, res);
  assert.equal(res.body.modified, 1);
  // studentC's notification must remain unread
  assert.equal(await Notification.countDocuments({ recipient: studentC._id, isRead: false }), 1);
});

test('17. existing manager (admin) enrollment flow still works and notifies the student', async () => {
  await clearNotifs();
  const res = makeRes();
  await enrollStudent({ body: { studentId: studentA._id.toString(), courseId: course._id.toString() }, user: admin }, res);
  assert.equal(res.statusCode, 201); // manager path intact
  assert.ok(await Notification.findOne({ recipient: studentA._id, type: 'COURSE_ENROLLED' }));
  await Enrollment.deleteOne({ student: studentA._id, course: course._id });
});

// ------------------------- SAFE FAILURE / UTIL SEMANTICS ---------------------
test('16. notify helpers never throw and never break the primary operation', async () => {
  // Invalid recipient / empty inputs must resolve safely (null / []), not throw.
  assert.equal(await notify(null, { type: 'COURSE_ENROLLED', title: 'x' }), null);
  assert.deepEqual(await notifyMany([], { type: 'COURSE_ENROLLED', title: 'x' }), []);
  // A bad recipient value does not throw (swallowed).
  const bad = await notify('not-an-objectid', { type: 'COURSE_ENROLLED', title: 'x' });
  assert.equal(bad, null);

  // And the primary op (enrolment) still succeeds even though notify is awaited.
  const res = makeRes();
  await enrollStudent({ body: { studentId: studentA._id.toString(), courseId: course._id.toString() }, user: owner }, res);
  assert.equal(res.statusCode, 201);
  await Enrollment.deleteOne({ student: studentA._id, course: course._id });
});
