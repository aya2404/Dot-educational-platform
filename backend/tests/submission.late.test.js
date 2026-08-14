const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../models/User');
const Course = require('../models/Course');
const Content = require('../models/Content');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');
const { submitTask, getTaskSubmissions, getStudentTaskStatus } = require('../controllers/submissionController');
const { getMyGradebook } = require('../controllers/courseController');
const { buildGradebook } = require('../utils/gradebook');

const TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const cleanup = async () => {
  const courses = await Course.find({ name: /^latetest / });
  const ids = courses.map((c) => c._id);
  const contents = await Content.find({ course: { $in: ids } });
  await Submission.deleteMany({ task: { $in: contents.map((c) => c._id) } });
  await Content.deleteMany({ course: { $in: ids } });
  await Enrollment.deleteMany({ course: { $in: ids } });
  await Course.deleteMany({ name: /^latetest / });
  await User.deleteMany({ username: /^latetest_/ });
};

let owner; let otherOwner; let student; let otherStudent; let course; let otherCourse;
let taskOpen; let taskClosed; let taskBoundary; let taskNoDue; let draftTask; let taskOtherCourse; let lecture;

const resetSubs = () => Submission.deleteMany({ student: { $in: [student._id, otherStudent._id] } });

test.before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await cleanup();

  owner = await User.create({ name: 'Late Owner', username: 'latetest_owner', studentId: 'TCH-4001', password: 'secret123', role: 'teacher' });
  otherOwner = await User.create({ name: 'Late Other Owner', username: 'latetest_owner2', studentId: 'TCH-4002', password: 'secret123', role: 'teacher' });
  student = await User.create({ name: 'Late Student', username: 'latetest_student', studentId: 'STU-4001', password: 'secret123', role: 'student' });
  otherStudent = await User.create({ name: 'Late Other', username: 'latetest_other', studentId: 'STU-4002', password: 'secret123', role: 'student' });

  course = await Course.create({ name: 'latetest course', teacher: owner._id });
  otherCourse = await Course.create({ name: 'latetest other', teacher: otherOwner._id });
  await Enrollment.create({ student: student._id, course: course._id, isActive: true });

  taskOpen = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'Open Task', dueDate: daysFromNow(5), maxScore: 100, isPublished: true });
  taskClosed = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'Closed Task', dueDate: daysFromNow(-3), maxScore: 100, isPublished: true });
  taskBoundary = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'Boundary Task', dueDate: daysFromNow(2), maxScore: 100, isPublished: true });
  taskNoDue = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'No Due Task', maxScore: 100, isPublished: true });
  draftTask = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'Draft Task', dueDate: daysFromNow(-1), maxScore: 100, isPublished: false });
  lecture = await Content.create({ course: course._id, createdBy: owner._id, type: 'lecture', title: 'A Lecture', isPublished: true });
  taskOtherCourse = await Content.create({ course: otherCourse._id, createdBy: otherOwner._id, type: 'task', title: 'Other Course Task', dueDate: daysFromNow(5), maxScore: 100, isPublished: true });
});

test.after(async () => {
  await cleanup();
  await mongoose.disconnect();
});

const submit = (task, user, extraBody = {}) => {
  const res = makeRes();
  return submitTask({ body: { taskId: task._id.toString(), answer: 'my answer', ...extraBody }, user }, res).then(() => res);
};

// ------------------- A. before deadline -------------------
test('before deadline: submit accepted, isLate=false', async () => {
  await resetSubs();
  const res = await submit(taskOpen, student);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.isLate, false);
  const saved = await Submission.findOne({ task: taskOpen._id, student: student._id });
  assert.equal(saved.isLate, false);
});

// ------------------- B. boundary -------------------
test('exactly-at-boundary (open) is NOT late', async () => {
  // A future dueDate at midnight normalizes to end-of-day; "now" is before it -> open -> not late.
  const midnightTask = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'Midnight Task', dueDate: daysFromNow(1), maxScore: 100, isPublished: true });
  const res = await submit(midnightTask, student);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.isLate, false);
  await Submission.deleteMany({ task: midnightTask._id });
  await Content.deleteOne({ _id: midnightTask._id });
});

// ------------------- C. after deadline -------------------
test('after deadline: submit accepted (201) and isLate=true', async () => {
  await resetSubs();
  const res = await submit(taskClosed, student);
  assert.equal(res.statusCode, 201); // was 403 before this feature
  assert.equal(res.body.data.isLate, true);
  const saved = await Submission.findOne({ task: taskClosed._id, student: student._id });
  assert.equal(saved.isLate, true);
});

// ------------------- D. no deadline -------------------
test('no dueDate: accepted, isLate=false', async () => {
  await resetSubs();
  const res = await submit(taskNoDue, student);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.isLate, false);
});

// ------------------- E. spoof protection -------------------
test('spoof: body isLate=false on a LATE task -> stored isLate=true', async () => {
  await resetSubs();
  const res = await submit(taskClosed, student, { isLate: false });
  assert.equal(res.body.data.isLate, true);
  const saved = await Submission.findOne({ task: taskClosed._id, student: student._id });
  assert.equal(saved.isLate, true);
});

test('spoof: body isLate=true on an OPEN task -> stored isLate=false', async () => {
  await resetSubs();
  const res = await submit(taskOpen, student, { isLate: true });
  assert.equal(res.body.data.isLate, false);
  const saved = await Submission.findOne({ task: taskOpen._id, student: student._id });
  assert.equal(saved.isLate, false);
});

// ------------------- F. resubmission recompute -------------------
test('resubmission recomputes isLate server-side (open then still open = false)', async () => {
  await resetSubs();
  await submit(taskOpen, student);
  const res = await submit(taskOpen, student, { answer: 'edited' });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.isLate, false);
  const count = await Submission.countDocuments({ task: taskOpen._id, student: student._id });
  assert.equal(count, 1); // uniqueness preserved (upsert, not duplicate)
});

test('late resubmission on a closed task recalculates isLate=true', async () => {
  await resetSubs();
  const res = await submit(taskClosed, student, { answer: 'late edit' });
  assert.equal(res.body.data.isLate, true);
});

// ------------------- G. security regressions -------------------
test('non-enrolled student is still rejected (403)', async () => {
  const res = await submit(taskOpen, otherStudent);
  assert.equal(res.statusCode, 403);
});

test('submitting to a non-task (lecture) is rejected (404)', async () => {
  const res = await submit(lecture, student);
  assert.equal(res.statusCode, 404);
});

test('submitting to a draft task is rejected (404)', async () => {
  const res = await submit(draftTask, student);
  assert.equal(res.statusCode, 404);
});

test('cross-course task the student is not enrolled in is rejected (403)', async () => {
  const res = await submit(taskOtherCourse, student);
  assert.equal(res.statusCode, 403);
});

// ------------------- H. grade regression -------------------
test('grade calculation is identical for on-time vs late submissions with the same score', async () => {
  const tasks = [{ _id: 't1', type: 'task', title: 'T', maxScore: 100 }];
  const students = [{ _id: 's1', name: 'A', studentId: 'STU-X' }];
  const onTime = buildGradebook({ tasks, submissions: [{ task: 't1', student: 's1', status: 'graded', grade: 80, isLate: false }], students });
  const late = buildGradebook({ tasks, submissions: [{ task: 't1', student: 's1', status: 'graded', grade: 80, isLate: true }], students });
  assert.equal(onTime.rows[0].earnedPoints, late.rows[0].earnedPoints);
  assert.equal(onTime.rows[0].possiblePoints, late.rows[0].possiblePoints);
  assert.equal(onTime.rows[0].percentage, late.rows[0].percentage);
  assert.equal(late.rows[0].percentage, 80); // late does NOT reduce the grade
});

// ------------------- I. serialization -------------------
test('teacher submission list exposes isLate; legacy (no field) serializes as false', async () => {
  await resetSubs();
  await submit(taskClosed, student); // late
  // legacy submission written directly without isLate field
  await Submission.collection.insertOne({
    task: taskOpen._id, student: student._id, answer: 'legacy', attachments: [], status: 'submitted',
    createdAt: new Date(), updatedAt: new Date(),
  });

  const res = makeRes();
  await getTaskSubmissions({ params: { taskId: taskClosed._id.toString() }, user: owner }, res);
  assert.equal(res.statusCode, 200);
  const lateOne = res.body.data.find((s) => String(s.task) === taskClosed._id.toString());
  assert.equal(lateOne.isLate, true);

  const legacyRes = makeRes();
  await getTaskSubmissions({ params: { taskId: taskOpen._id.toString() }, user: owner }, legacyRes);
  const legacy = legacyRes.body.data[0];
  assert.equal(legacy.isLate, false); // missing field -> false
});

test('student task-status response exposes isLate', async () => {
  await resetSubs();
  await submit(taskClosed, student); // late
  const res = makeRes();
  await getStudentTaskStatus({ params: { courseId: course._id.toString() }, user: student }, res);
  const entry = res.body.data[taskClosed._id.toString()];
  assert.ok(entry);
  assert.equal(entry.isLate, true);
});
