const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../models/User');
const Course = require('../models/Course');
const Content = require('../models/Content');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');
const { getMyDeadlines } = require('../controllers/enrollmentController');
const { authorize } = require('../middleware/auth');
const { isSubmissionWindowOpen } = require('../utils/permissions');

const TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const cleanup = async () => {
  const courses = await Course.find({ name: /^dltest / });
  const ids = courses.map((c) => c._id);
  const contents = await Content.find({ course: { $in: ids } });
  await Submission.deleteMany({ task: { $in: contents.map((c) => c._id) } });
  await Content.deleteMany({ course: { $in: ids } });
  await Enrollment.deleteMany({ course: { $in: ids } });
  await Course.deleteMany({ name: /^dltest / });
  await User.deleteMany({ username: /^dltest_/ });
};

let student; let otherStudent; let owner;
let courseA; let courseB; let unrelatedCourse;
let taskFuture; let taskPast; let taskNoDue; let draftTask; let legacyTask; let taskCourseB; let unrelatedTask;

test.before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await cleanup();

  owner = await User.create({ name: 'DL Owner', username: 'dltest_owner', studentId: 'TCH-5001', password: 'secret123', role: 'teacher' });
  student = await User.create({ name: 'DL Student', username: 'dltest_student', studentId: 'STU-5001', password: 'secret123', role: 'student' });
  otherStudent = await User.create({ name: 'DL Other', username: 'dltest_other', studentId: 'STU-5002', password: 'secret123', role: 'student' });

  courseA = await Course.create({ name: 'dltest A', teacher: owner._id });
  courseB = await Course.create({ name: 'dltest B', teacher: owner._id });
  unrelatedCourse = await Course.create({ name: 'dltest Unrelated', teacher: owner._id });

  // student enrolled in A and B only (NOT unrelated)
  await Enrollment.create({ student: student._id, course: courseA._id, isActive: true });
  await Enrollment.create({ student: student._id, course: courseB._id, isActive: true });
  await Enrollment.create({ student: otherStudent._id, course: unrelatedCourse._id, isActive: true });

  taskFuture = await Content.create({ course: courseA._id, createdBy: owner._id, type: 'task', title: 'Future Task', dueDate: daysFromNow(5), maxScore: 100, isPublished: true });
  taskPast = await Content.create({ course: courseA._id, createdBy: owner._id, type: 'task', title: 'Past Task', dueDate: daysFromNow(-3), maxScore: 100, isPublished: true });
  taskNoDue = await Content.create({ course: courseA._id, createdBy: owner._id, type: 'task', title: 'No Due Task', maxScore: 100, isPublished: true });
  draftTask = await Content.create({ course: courseA._id, createdBy: owner._id, type: 'task', title: 'Draft Task', dueDate: daysFromNow(2), maxScore: 100, isPublished: false });
  taskCourseB = await Content.create({ course: courseB._id, createdBy: owner._id, type: 'task', title: 'Course B Task', dueDate: daysFromNow(1), maxScore: 100, isPublished: true });
  unrelatedTask = await Content.create({ course: unrelatedCourse._id, createdBy: owner._id, type: 'task', title: 'Unrelated Task', dueDate: daysFromNow(1), maxScore: 100, isPublished: true });

  // legacy task: dueDate present, isPublished field absent (pre-migration record)
  const legacy = await Content.collection.insertOne({
    course: courseA._id, createdBy: owner._id, type: 'task', title: 'Legacy Task', order: 6,
    dueDate: daysFromNow(4), maxScore: 100, contentDate: new Date(), attachments: [], createdAt: new Date(), updatedAt: new Date(),
  });
  legacyTask = await Content.findById(legacy.insertedId);
});

test.after(async () => {
  await cleanup();
  await mongoose.disconnect();
});

const fetchDeadlines = async (user) => {
  const res = makeRes();
  await getMyDeadlines({ user }, res);
  return res;
};

test('enrolled student receives published, dated deadlines aggregated across courses', async () => {
  const res = await fetchDeadlines(student);
  assert.equal(res.statusCode, 200);
  const titles = res.body.data.map((d) => d.title);
  assert.ok(titles.includes('Future Task'));   // course A, published, future
  assert.ok(titles.includes('Course B Task')); // course B aggregated
});

test('draft task is excluded', async () => {
  const res = await fetchDeadlines(student);
  const titles = res.body.data.map((d) => d.title);
  assert.ok(!titles.includes('Draft Task'));
});

test('legacy task with missing isPublished field is included', async () => {
  const res = await fetchDeadlines(student);
  const titles = res.body.data.map((d) => d.title);
  assert.ok(titles.includes('Legacy Task'));
});

test('task without a dueDate is excluded', async () => {
  const res = await fetchDeadlines(student);
  const titles = res.body.data.map((d) => d.title);
  assert.ok(!titles.includes('No Due Task'));
});

test('a non-enrolled course task never appears', async () => {
  const res = await fetchDeadlines(student);
  const titles = res.body.data.map((d) => d.title);
  assert.ok(!titles.includes('Unrelated Task'));
});

test('deadlines are sorted by dueDate ascending', async () => {
  const res = await fetchDeadlines(student);
  const dates = res.body.data.map((d) => new Date(d.dueDate).getTime());
  const sorted = [...dates].sort((a, b) => a - b);
  assert.deepEqual(dates, sorted);
});

test('overdue classification uses the authoritative isSubmissionWindowOpen', async () => {
  const res = await fetchDeadlines(student);
  const past = res.body.data.find((d) => d.title === 'Past Task');
  const future = res.body.data.find((d) => d.title === 'Future Task');
  assert.equal(past.isPastDeadline, true);
  assert.equal(future.isPastDeadline, false);
  // matches the shared authority exactly
  assert.equal(past.isPastDeadline, !isSubmissionWindowOpen({ dueDate: taskPast.dueDate }));
});

test('submission status reflects only the requesting student (submitted/graded/not_submitted)', async () => {
  await Submission.create({ task: taskFuture._id, student: student._id, status: 'submitted', answer: 'x' });
  await Submission.create({ task: taskCourseB._id, student: student._id, status: 'graded', grade: 80 });
  // another student's submission on the SAME task must not affect this student's status
  await Submission.create({ task: taskPast._id, student: otherStudent._id, status: 'graded', grade: 50 });

  const res = await fetchDeadlines(student);
  const future = res.body.data.find((d) => d.title === 'Future Task');
  const bTask = res.body.data.find((d) => d.title === 'Course B Task');
  const past = res.body.data.find((d) => d.title === 'Past Task');
  assert.equal(future.submissionStatus, 'submitted');
  assert.equal(bTask.submissionStatus, 'graded');
  assert.equal(past.submissionStatus, 'not_submitted'); // other student's grade must NOT leak

  await Submission.deleteMany({ task: { $in: [taskFuture._id, taskCourseB._id, taskPast._id] } });
});

test('another student sees only their own (disjoint) deadlines', async () => {
  const mine = (await fetchDeadlines(student)).body.data.map((d) => d.title);
  const theirs = (await fetchDeadlines(otherStudent)).body.data.map((d) => d.title);
  assert.ok(theirs.includes('Unrelated Task'));   // otherStudent enrolled here
  assert.ok(!mine.includes('Unrelated Task'));     // student is not
  assert.ok(!theirs.includes('Future Task'));      // otherStudent not in course A
});

test('endpoint accepts no courseId/studentId params — identity is req.user only', async () => {
  // Even if a rogue courseId is smuggled onto the request object, it is ignored.
  const res = makeRes();
  await getMyDeadlines({ user: student, params: { courseId: unrelatedCourse._id.toString() }, query: { studentId: otherStudent._id.toString() } }, res);
  const titles = res.body.data.map((d) => d.title);
  assert.ok(!titles.includes('Unrelated Task')); // param ignored, no leak
  assert.ok(!titles.includes('Draft Task'));
});

test('route RBAC: only students may reach the deadlines endpoint', () => {
  for (const role of ['teacher', 'admin', 'superadmin']) {
    const res = makeRes();
    let nextCalled = false;
    authorize('student')({ user: { role } }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403, `${role} must be blocked`);
    assert.equal(nextCalled, false);
  }
  const ok = makeRes();
  let studentPassed = false;
  authorize('student')({ user: { role: 'student' } }, ok, () => { studentPassed = true; });
  assert.equal(studentPassed, true);
});

test('unpublishing a task removes it from deadlines; republishing restores it', async () => {
  await Content.findByIdAndUpdate(taskFuture._id, { isPublished: false });
  let titles = (await fetchDeadlines(student)).body.data.map((d) => d.title);
  assert.ok(!titles.includes('Future Task'), 'unpublished task must disappear');

  await Content.findByIdAndUpdate(taskFuture._id, { isPublished: true });
  titles = (await fetchDeadlines(student)).body.data.map((d) => d.title);
  assert.ok(titles.includes('Future Task'), 'republished task must reappear');
});
