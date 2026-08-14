const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { buildGradebook } = require('../utils/gradebook');
const User = require('../models/User');
const Course = require('../models/Course');
const Content = require('../models/Content');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');
const { getCourseGradebook, getMyGradebook } = require('../controllers/courseController');

// ===========================================================================
// Part 1: pure aggregation logic (no DB) — calculation + edge cases.
// ===========================================================================
const student = { _id: 's1', name: 'Test Student', studentId: 'STU-1' };
const task = (id, maxScore, extra = {}) => ({ _id: id, type: 'task', title: `Task ${id}`, maxScore, ...extra });
const sub = (taskId, status, grade, feedback = '') => ({ task: taskId, student: 's1', status, grade, feedback });

test('possiblePoints sums maxScore of all gradable tasks', () => {
  const gb = buildGradebook({ tasks: [task('t1', 100), task('t2', 50)], submissions: [], students: [student] });
  assert.equal(gb.rows[0].possiblePoints, 150);
});

test('earnedPoints sums only graded submissions', () => {
  const gb = buildGradebook({
    tasks: [task('t1', 100), task('t2', 100)],
    submissions: [sub('t1', 'graded', 80), sub('t2', 'submitted', undefined)],
    students: [student],
  });
  assert.equal(gb.rows[0].earnedPoints, 80);
});

test('percentage = earned / possible * 100', () => {
  const gb = buildGradebook({ tasks: [task('t1', 100), task('t2', 100)], submissions: [sub('t1', 'graded', 90)], students: [student] });
  assert.equal(gb.rows[0].percentage, 45); // 90 / 200 * 100
});

test('not-submitted task contributes to possible but not earned', () => {
  const gb = buildGradebook({ tasks: [task('t1', 100)], submissions: [], students: [student] });
  const cell = gb.rows[0].tasks[0];
  assert.equal(cell.status, 'not_submitted');
  assert.equal(gb.rows[0].possiblePoints, 100);
  assert.equal(gb.rows[0].earnedPoints, 0);
});

test('ungraded submission contributes to possible but not earned', () => {
  const gb = buildGradebook({ tasks: [task('t1', 100)], submissions: [sub('t1', 'submitted', undefined)], students: [student] });
  const cell = gb.rows[0].tasks[0];
  assert.equal(cell.status, 'ungraded');
  assert.equal(gb.rows[0].possiblePoints, 100);
  assert.equal(gb.rows[0].earnedPoints, 0);
});

test('grade 0 is a legitimate graded score (not ungraded)', () => {
  const gb = buildGradebook({ tasks: [task('t1', 100)], submissions: [sub('t1', 'graded', 0)], students: [student] });
  const cell = gb.rows[0].tasks[0];
  assert.equal(cell.status, 'graded');
  assert.equal(cell.grade, 0);
  assert.equal(gb.rows[0].earnedPoints, 0);
  assert.equal(gb.rows[0].percentage, 0);
});

test('graded submission contributes its grade', () => {
  const gb = buildGradebook({ tasks: [task('t1', 100)], submissions: [sub('t1', 'graded', 73)], students: [student] });
  assert.equal(gb.rows[0].earnedPoints, 73);
});

test('multiple tasks aggregate correctly', () => {
  const gb = buildGradebook({
    tasks: [task('t1', 100), task('t2', 50), task('t3', 50)],
    submissions: [sub('t1', 'graded', 90), sub('t2', 'graded', 40), sub('t3', 'submitted', undefined)],
    students: [student],
  });
  assert.equal(gb.rows[0].earnedPoints, 130);
  assert.equal(gb.rows[0].possiblePoints, 200);
  assert.equal(gb.rows[0].percentage, 65);
});

test('course with zero gradable tasks returns percentage=null', () => {
  const gb = buildGradebook({ tasks: [], submissions: [], students: [student] });
  assert.equal(gb.rows[0].possiblePoints, 0);
  assert.equal(gb.rows[0].percentage, null);
});

test('tasks with invalid maxScore are excluded from gradables', () => {
  const gb = buildGradebook({
    tasks: [task('t1', 100), task('t2', null), task('t3', -5)],
    submissions: [],
    students: [student],
  });
  assert.equal(gb.tasks.length, 1);
  assert.equal(gb.rows[0].possiblePoints, 100);
});

test('feedback and status are preserved on cells', () => {
  const gb = buildGradebook({ tasks: [task('t1', 100)], submissions: [sub('t1', 'graded', 88, 'nice work')], students: [student] });
  const cell = gb.rows[0].tasks[0];
  assert.equal(cell.feedback, 'nice work');
  assert.equal(cell.status, 'graded');
});

test('invalid grade > maxScore is flagged and clamped so percentage stays valid', () => {
  const gb = buildGradebook({ tasks: [task('t1', 100)], submissions: [sub('t1', 'graded', 150)], students: [student] });
  const cell = gb.rows[0].tasks[0];
  assert.equal(cell.invalid, true);
  assert.equal(cell.grade, 150); // raw value surfaced, not hidden
  assert.equal(gb.rows[0].hasInvalidGrade, true);
  assert.equal(gb.rows[0].earnedPoints, 100); // clamped for the aggregate
  assert.equal(gb.rows[0].percentage, 100); // never > 100
});

test('percentage rounds to at most 2 decimals', () => {
  const gb = buildGradebook({ tasks: [task('t1', 3)], submissions: [sub('t1', 'graded', 1)], students: [student] });
  assert.equal(gb.rows[0].percentage, 33.33);
});

// ===========================================================================
// Part 2: authorization (DB-backed controllers against an isolated test DB).
// ===========================================================================
const TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

const cleanup = async () => {
  const courses = await Course.find({ name: /^gbtest / });
  const ids = courses.map((c) => c._id);
  const contents = await Content.find({ course: { $in: ids } });
  await Submission.deleteMany({ task: { $in: contents.map((c) => c._id) } });
  await Content.deleteMany({ course: { $in: ids } });
  await Enrollment.deleteMany({ course: { $in: ids } });
  await Course.deleteMany({ name: /^gbtest / });
  await User.deleteMany({ username: /^gbtest_/ });
};

let owner; let otherTeacher; let admin; let enrolledStudent; let otherStudent; let course; let taskA; let taskB;

test.before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await cleanup();

  owner = await User.create({ name: 'GB Owner', username: 'gbtest_owner', studentId: 'TCH-8001', password: 'secret123', role: 'teacher' });
  otherTeacher = await User.create({ name: 'GB Other', username: 'gbtest_other', studentId: 'TCH-8002', password: 'secret123', role: 'teacher' });
  admin = await User.create({ name: 'GB Admin', username: 'gbtest_admin', studentId: 'ADM-8001', password: 'secret123', role: 'admin' });
  enrolledStudent = await User.create({ name: 'GB Student', username: 'gbtest_student', studentId: 'STU-8001', password: 'secret123', role: 'student' });
  otherStudent = await User.create({ name: 'GB Other Student', username: 'gbtest_student2', studentId: 'STU-8002', password: 'secret123', role: 'student' });

  course = await Course.create({ name: 'gbtest course', teacher: owner._id });
  taskA = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'GB Task A', maxScore: 100, order: 1 });
  taskB = await Content.create({ course: course._id, createdBy: owner._id, type: 'task', title: 'GB Task B', maxScore: 50, order: 2 });
  await Enrollment.create({ student: enrolledStudent._id, course: course._id, isActive: true });
  await Submission.create({ task: taskA._id, student: enrolledStudent._id, status: 'graded', grade: 80, feedback: 'ok' });
  await Submission.create({ task: taskB._id, student: enrolledStudent._id, status: 'submitted', answer: 'x' });
});

test.after(async () => {
  await cleanup();
  await mongoose.disconnect();
});

test('teacher can access gradebook for owned course', async () => {
  const res = makeRes();
  await getCourseGradebook({ params: { id: course._id.toString() }, user: owner }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.students.length, 1);
  assert.equal(res.body.students[0].earnedPoints, 80);
  assert.equal(res.body.students[0].possiblePoints, 150);
});

test('teacher cannot access another teacher course gradebook (403)', async () => {
  const res = makeRes();
  await getCourseGradebook({ params: { id: course._id.toString() }, user: otherTeacher }, res);
  assert.equal(res.statusCode, 403);
});

test('admin can access course gradebook', async () => {
  const res = makeRes();
  await getCourseGradebook({ params: { id: course._id.toString() }, user: admin }, res);
  assert.equal(res.statusCode, 200);
});

test('enrolled student can access own gradebook and sees only own data', async () => {
  const res = makeRes();
  await getMyGradebook({ params: { id: course._id.toString() }, user: enrolledStudent }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.earnedPoints, 80);
  assert.equal(res.body.possiblePoints, 150);
  assert.equal(res.body.tasks.length, 2);
  assert.ok(!('students' in res.body)); // no other students exposed
});

test('non-enrolled student cannot access a course gradebook (403)', async () => {
  const res = makeRes();
  await getMyGradebook({ params: { id: course._id.toString() }, user: otherStudent }, res);
  assert.equal(res.statusCode, 403);
});
