const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../models/User');
const Course = require('../models/Course');
const Content = require('../models/Content');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');
const {
  getCourseContent,
  getContentById,
  createContent,
  updateContent,
} = require('../controllers/contentController');
const { submitTask, getStudentTaskStatus } = require('../controllers/submissionController');
const { markLectureComplete } = require('../controllers/enrollmentController');
const { getMyGradebook, getCourseGradebook } = require('../controllers/courseController');

const TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

const cleanup = async () => {
  const courses = await Course.find({ name: /^pubtest / });
  const ids = courses.map((c) => c._id);
  const contents = await Content.find({ course: { $in: ids } });
  await Submission.deleteMany({ task: { $in: contents.map((c) => c._id) } });
  await Content.deleteMany({ course: { $in: ids } });
  await Enrollment.deleteMany({ course: { $in: ids } });
  await Course.deleteMany({ name: /^pubtest / });
  await User.deleteMany({ username: /^pubtest_/ });
};

// NOTE: intentionally no superadmin fixture here. Staff draft-visibility runs
// through the same `!isStudentViewer` (any non-student) branch for admin and
// superadmin, so admin coverage is representative. A persistent active
// superadmin would also pollute the activation suite's global superadmin-count
// assertions when test files run in parallel against the shared test DB.
let owner; let otherTeacher; let admin; let student;
let course; let publishedLecture; let draftLecture; let publishedTask; let draftTask;

test.before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await cleanup();

  owner = await User.create({ name: 'Pub Owner', username: 'pubtest_owner', studentId: 'TCH-6001', password: 'secret123', role: 'teacher' });
  otherTeacher = await User.create({ name: 'Pub Other', username: 'pubtest_other', studentId: 'TCH-6002', password: 'secret123', role: 'teacher' });
  admin = await User.create({ name: 'Pub Admin', username: 'pubtest_admin', studentId: 'ADM-6001', password: 'secret123', role: 'admin' });
  student = await User.create({ name: 'Pub Student', username: 'pubtest_student', studentId: 'STU-6001', password: 'secret123', role: 'student' });

  course = await Course.create({ name: 'pubtest course', teacher: owner._id });
  await Enrollment.create({ student: student._id, course: course._id, isActive: true });

  publishedLecture = await Content.create({ course: course._id, createdBy: owner._id, type: 'lecture', title: 'Published Lecture', isPublished: true });
  draftLecture = await Content.create({ course: course._id, createdBy: owner._id, type: 'lecture', title: 'Draft Lecture', isPublished: false });
  publishedTask = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'Published Task', maxScore: 100, isPublished: true });
  draftTask = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'Draft Task', maxScore: 100, isPublished: false });
});

test.after(async () => {
  await cleanup();
  await mongoose.disconnect();
});

// ----------------------------- MODEL -----------------------------
test('model: isPublished defaults to true when omitted', async () => {
  const c = await Content.create({ course: course._id, createdBy: owner._id, type: 'material', title: 'Default Pub' });
  assert.equal(c.isPublished, true);
  await Content.deleteOne({ _id: c._id });
});

test('model: legacy content with no isPublished field is treated as published by the student filter', async () => {
  // Simulate a pre-migration record (field truly absent).
  const legacy = await Content.collection.insertOne({
    course: course._id, createdBy: owner._id, type: 'announcement', title: 'Legacy Item', order: 1,
    contentDate: new Date(), attachments: [], maxScore: 100, createdAt: new Date(), updatedAt: new Date(),
  });
  const res = makeRes();
  await getCourseContent({ params: { courseId: course._id.toString() }, user: student }, res);
  const titles = res.body.data.map((i) => i.title);
  assert.ok(titles.includes('Legacy Item'), 'legacy (no field) content must remain visible to students');
  await Content.deleteOne({ _id: legacy.insertedId });
});

// ----------------------------- CREATE -----------------------------
test('create: staff can create a draft (isPublished:false)', async () => {
  const res = makeRes();
  await createContent({ body: { course: course._id.toString(), type: 'material', title: 'New Draft', isPublished: false }, user: owner }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.isPublished, false);
  await Content.deleteOne({ _id: res.body.data._id });
});

test('create: omitted isPublished defaults to published', async () => {
  const res = makeRes();
  await createContent({ body: { course: course._id.toString(), type: 'material', title: 'New Default' }, user: owner }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.isPublished, true);
  await Content.deleteOne({ _id: res.body.data._id });
});

// ----------------------------- UPDATE -----------------------------
test('update: owner can publish a draft and unpublish a published item; other fields intact', async () => {
  const item = await Content.create({ course: course._id, createdBy: owner._id, type: 'material', title: 'Toggle Me', body: 'keep', isPublished: false });
  const pub = makeRes();
  await updateContent({ params: { id: item._id.toString() }, body: { isPublished: true }, user: owner }, pub);
  assert.equal(pub.statusCode, 200);
  assert.equal(pub.body.data.isPublished, true);
  assert.equal(pub.body.data.body, 'keep'); // untouched

  const unpub = makeRes();
  await updateContent({ params: { id: item._id.toString() }, body: { isPublished: false }, user: owner }, unpub);
  assert.equal(unpub.body.data.isPublished, false);
  await Content.deleteOne({ _id: item._id });
});

// ------------------------- STUDENT READ ---------------------------
test('student course listing excludes drafts, includes published', async () => {
  const res = makeRes();
  await getCourseContent({ params: { courseId: course._id.toString() }, user: student }, res);
  const titles = res.body.data.map((i) => i.title);
  assert.ok(titles.includes('Published Lecture'));
  assert.ok(titles.includes('Published Task'));
  assert.ok(!titles.includes('Draft Lecture'), 'draft lecture must be hidden');
  assert.ok(!titles.includes('Draft Task'), 'draft task must be hidden');
});

test('student direct GET of a published item -> 200', async () => {
  const res = makeRes();
  await getContentById({ params: { id: publishedLecture._id.toString() }, user: student }, res);
  assert.equal(res.statusCode, 200);
});

test('student direct GET of a draft by ID -> 404 (IDOR-safe, no leak)', async () => {
  const res = makeRes();
  await getContentById({ params: { id: draftLecture._id.toString() }, user: student }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.data, undefined); // no title/body/metadata leaked
});

// ------------------------- STUDENT WRITE --------------------------
test('student cannot submit to a draft task (rejected 404)', async () => {
  const res = makeRes();
  await submitTask({ body: { taskId: draftTask._id.toString(), answer: 'x' }, user: student }, res);
  assert.equal(res.statusCode, 404);
  const created = await Submission.findOne({ task: draftTask._id, student: student._id });
  assert.equal(created, null); // no submission created against a draft
});

test('student cannot complete a draft lecture (rejected 404)', async () => {
  const res = makeRes();
  await markLectureComplete({ body: { courseId: course._id.toString(), lectureId: draftLecture._id.toString() }, user: student }, res);
  assert.equal(res.statusCode, 404);
});

test('student CAN submit to a published task (sanity, not broken)', async () => {
  const res = makeRes();
  await submitTask({ body: { taskId: publishedTask._id.toString(), answer: 'my answer' }, user: student }, res);
  assert.equal(res.statusCode, 201);
});

// ------------------------- GRADEBOOK ------------------------------
test('student gradebook excludes draft tasks from tasks/possible/percentage', async () => {
  const res = makeRes();
  await getMyGradebook({ params: { id: course._id.toString() }, user: student }, res);
  assert.equal(res.statusCode, 200);
  const taskTitles = res.body.tasks.map((t) => t.title);
  assert.ok(taskTitles.includes('Published Task'));
  assert.ok(!taskTitles.includes('Draft Task'), 'draft task must not appear in student gradebook');
  assert.equal(res.body.possiblePoints, 100); // only the published 100-pt task, NOT 200
});

test('teacher gradebook STILL includes draft tasks (staff unchanged)', async () => {
  const res = makeRes();
  await getCourseGradebook({ params: { id: course._id.toString() }, user: owner }, res);
  assert.equal(res.statusCode, 200);
  const taskTitles = res.body.tasks.map((t) => t.title);
  assert.ok(taskTitles.includes('Published Task'));
  assert.ok(taskTitles.includes('Draft Task'), 'teacher must still see draft tasks');
});

// --------------------------- STATUS -------------------------------
test('student task-status response never contains a draft task id', async () => {
  const res = makeRes();
  await getStudentTaskStatus({ params: { courseId: course._id.toString() }, user: student }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(!Object.keys(res.body.data).includes(draftTask._id.toString()), 'draft task id must not surface');
});

// ---------------------------- STAFF -------------------------------
test('owner teacher and admin both see drafts in course listing (staff path; superadmin identical)', async () => {
  for (const staff of [owner, admin]) {
    const res = makeRes();
    await getCourseContent({ params: { courseId: course._id.toString() }, user: staff }, res);
    const titles = res.body.data.map((i) => i.title);
    assert.ok(titles.includes('Draft Lecture'), `${staff.role} must see drafts`);
    assert.ok(titles.includes('Draft Task'), `${staff.role} must see draft tasks`);
  }
});

test('a teacher who does not own the course cannot reach its content (403)', async () => {
  const res = makeRes();
  await getCourseContent({ params: { courseId: course._id.toString() }, user: otherTeacher }, res);
  assert.equal(res.statusCode, 403); // ownership rules still apply
});

test('publish state change is authorized like editing — non-owner teacher cannot update', async () => {
  const res = makeRes();
  await updateContent({ params: { id: publishedTask._id.toString() }, body: { isPublished: false }, user: otherTeacher }, res);
  assert.equal(res.statusCode, 403);
  const fresh = await Content.findById(publishedTask._id);
  assert.equal(fresh.isPublished, true); // unchanged
});
