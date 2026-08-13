const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../models/User');
const Course = require('../models/Course');
const Content = require('../models/Content');
const Submission = require('../models/Submission');
const { gradeSubmission } = require('../controllers/submissionController');

// Exercises the real grading controller against a dedicated test DB so seeded
// dev data is never touched. Covers validation, persistence and ownership.
const TEST_MONGO_URI =
  process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';

// Minimal Express-style res double that records status + json payload.
const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const cleanup = async () => {
  const courses = await Course.find({ name: 'gradetest course' });
  const courseIds = courses.map((c) => c._id);
  const contents = await Content.find({ course: { $in: courseIds } });
  await Submission.deleteMany({ task: { $in: contents.map((c) => c._id) } });
  await Content.deleteMany({ course: { $in: courseIds } });
  await Course.deleteMany({ name: 'gradetest course' });
  await User.deleteMany({ username: /^gradetest_/ });
};

let teacher;
let otherTeacher;
let student;
let task;
let submission;

test.before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await cleanup();

  teacher = await User.create({
    name: 'Grade Teacher', username: 'gradetest_teacher', studentId: 'TCH-7001', password: 'secret123', role: 'teacher',
  });
  otherTeacher = await User.create({
    name: 'Other Teacher', username: 'gradetest_other', studentId: 'TCH-7002', password: 'secret123', role: 'teacher',
  });
  student = await User.create({
    name: 'Grade Student', username: 'gradetest_student', studentId: 'STU-7001', password: 'secret123', role: 'student',
  });
  const course = await Course.create({ name: 'gradetest course', teacher: teacher._id });
  task = await Content.create({
    course: course._id, createdBy: teacher._id, type: 'task', title: 'gradetest task', maxScore: 100,
  });
  submission = await Submission.create({
    task: task._id, student: student._id, answer: 'my answer', status: 'submitted',
  });
});

test.after(async () => {
  await cleanup();
  await mongoose.disconnect();
});

test('valid grading sets grade + feedback and status becomes graded', async () => {
  const res = makeRes();
  await gradeSubmission(
    { params: { id: submission._id.toString() }, body: { grade: 85, feedback: 'well done' }, user: teacher },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);

  const saved = await Submission.findById(submission._id);
  assert.equal(saved.grade, 85);
  assert.equal(saved.feedback, 'well done'); // feedback saved
  assert.equal(saved.status, 'graded'); // status becomes graded
});

test('grade above maxScore is rejected (400) and does not overwrite', async () => {
  const res = makeRes();
  await gradeSubmission(
    { params: { id: submission._id.toString() }, body: { grade: 150 }, user: teacher },
    res
  );
  assert.equal(res.statusCode, 400);

  const saved = await Submission.findById(submission._id);
  assert.equal(saved.grade, 85); // unchanged from the valid grade above
});

test('negative grade is rejected (400)', async () => {
  const res = makeRes();
  await gradeSubmission(
    { params: { id: submission._id.toString() }, body: { grade: -5 }, user: teacher },
    res
  );
  assert.equal(res.statusCode, 400);
});

test('non-numeric grade is rejected (400)', async () => {
  const res = makeRes();
  await gradeSubmission(
    { params: { id: submission._id.toString() }, body: { grade: 'abc' }, user: teacher },
    res
  );
  assert.equal(res.statusCode, 400);
});

test('a teacher who does not own the course cannot grade (403)', async () => {
  const res = makeRes();
  await gradeSubmission(
    { params: { id: submission._id.toString() }, body: { grade: 50 }, user: otherTeacher },
    res
  );
  assert.equal(res.statusCode, 403);
});
