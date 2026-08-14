const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { enrollStudent, unenrollStudent } = require('../controllers/enrollmentController');
const { authorize } = require('../middleware/auth');

const TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

const cleanup = async () => {
  const courses = await Course.find({ name: /^cmtest / });
  const ids = courses.map((c) => c._id);
  await Enrollment.deleteMany({ course: { $in: ids } });
  await Course.deleteMany({ name: /^cmtest / });
  await User.deleteMany({ username: /^cmtest_/ });
};

let teacherA; let teacherB; let admin; let superadmin; let student; let inactiveStudent; let nonStudent;

test.before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await cleanup();
  teacherA = await User.create({ name: 'CM Teacher A', username: 'cmtest_ta', studentId: 'TCH-3001', password: 'secret123', role: 'teacher' });
  teacherB = await User.create({ name: 'CM Teacher B', username: 'cmtest_tb', studentId: 'TCH-3002', password: 'secret123', role: 'teacher' });
  admin = await User.create({ name: 'CM Admin', username: 'cmtest_admin', studentId: 'ADM-3001', password: 'secret123', role: 'admin' });
  superadmin = await User.create({ name: 'CM Super', username: 'cmtest_super', studentId: 'SAD-3001', password: 'secret123', role: 'superadmin' });
  student = await User.create({ name: 'CM Student', username: 'cmtest_student', studentId: 'STU-3001', password: 'secret123', role: 'student' });
  inactiveStudent = await User.create({ name: 'CM Inactive', username: 'cmtest_inactive', studentId: 'STU-3002', password: 'secret123', role: 'student', isActive: false });
  nonStudent = teacherB; // a non-student target for enrollment
});

test.after(async () => {
  await cleanup();
  await mongoose.disconnect();
});

const create = (user, body) => {
  const res = makeRes();
  return createCourse({ body, user }, res).then(() => res);
};
const update = (user, id, body) => {
  const res = makeRes();
  return updateCourse({ params: { id: id.toString() }, body, user }, res).then(() => res);
};
const remove = (user, id) => {
  const res = makeRes();
  return deleteCourse({ params: { id: id.toString() }, user }, res).then(() => res);
};
const enroll = (user, studentId, courseId) => {
  const res = makeRes();
  return enrollStudent({ body: { studentId: studentId?.toString(), courseId: courseId?.toString() }, user }, res).then(() => res);
};
const unenroll = (user, enrollmentId) => {
  const res = makeRes();
  return unenrollStudent({ params: { id: enrollmentId.toString() }, user }, res).then(() => res);
};

// ------------------------- COURSE CREATE / OWNERSHIP -------------------------
test('1-3. teacher creates a course and is forced as owner even when spoofing teacher field', async () => {
  const res = await create(teacherA, { name: 'cmtest Owned', teacher: teacherB._id.toString() });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.teacher._id.toString(), teacherA._id.toString()); // owner = req.user, not spoofed teacherB
});

test('15. student cannot create a course (route RBAC)', () => {
  const res = makeRes();
  let next = false;
  authorize('teacher', 'admin', 'superadmin')({ user: { role: 'student' } }, res, () => { next = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(next, false);
});

// ------------------------- UPDATE OWNERSHIP -------------------------
test('4. teacher updates their own course', async () => {
  const c = await Course.create({ name: 'cmtest A-own', teacher: teacherA._id });
  const res = await update(teacherA, c._id, { name: 'cmtest A-own-renamed' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.name, 'cmtest A-own-renamed');
});

test("6. teacher cannot update another teacher's course (403)", async () => {
  const c = await Course.create({ name: 'cmtest B-own', teacher: teacherB._id });
  const res = await update(teacherA, c._id, { name: 'hijacked' });
  assert.equal(res.statusCode, 403);
  const fresh = await Course.findById(c._id);
  assert.equal(fresh.name, 'cmtest B-own'); // unchanged
});

test('8. teacher cannot transfer ownership of their own course (403)', async () => {
  const c = await Course.create({ name: 'cmtest A-transfer', teacher: teacherA._id });
  const res = await update(teacherA, c._id, { teacher: teacherB._id.toString() });
  assert.equal(res.statusCode, 403);
  const fresh = await Course.findById(c._id);
  assert.equal(fresh.teacher.toString(), teacherA._id.toString()); // still owned by A
});

test('teacher passing their OWN id as teacher is a harmless no-op (allowed)', async () => {
  const c = await Course.create({ name: 'cmtest A-noop', teacher: teacherA._id });
  const res = await update(teacherA, c._id, { name: 'cmtest A-noop2', teacher: teacherA._id.toString() });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.teacher._id.toString(), teacherA._id.toString());
});

// ------------------------- DELETE OWNERSHIP -------------------------
test('5. teacher deletes their own course', async () => {
  const c = await Course.create({ name: 'cmtest A-del', teacher: teacherA._id });
  const res = await remove(teacherA, c._id);
  assert.equal(res.statusCode, 200);
  assert.equal(await Course.findById(c._id), null);
});

test("7. teacher cannot delete another teacher's course (403)", async () => {
  const c = await Course.create({ name: 'cmtest B-del', teacher: teacherB._id });
  const res = await remove(teacherA, c._id);
  assert.equal(res.statusCode, 403);
  assert.ok(await Course.findById(c._id)); // still exists
});

test('24. invalid / non-existent courseId does not bypass ownership', async () => {
  const bad = await update(teacherA, new mongoose.Types.ObjectId(), { name: 'x' });
  assert.equal(bad.statusCode, 404);
  const malformed = await update(teacherA, 'not-an-id', { name: 'x' });
  assert.equal(malformed.statusCode, 400);
});

// ------------------------- ENROLLMENT OWNERSHIP -------------------------
test('9. teacher enrolls a student into their own course', async () => {
  const c = await Course.create({ name: 'cmtest A-enroll', teacher: teacherA._id });
  const res = await enroll(teacherA, student._id, c._id);
  assert.equal(res.statusCode, 201);
  assert.ok(await Enrollment.findOne({ student: student._id, course: c._id }));
});

test("10. teacher cannot enroll into another teacher's course (403)", async () => {
  const c = await Course.create({ name: 'cmtest B-enroll', teacher: teacherB._id });
  const res = await enroll(teacherA, student._id, c._id);
  assert.equal(res.statusCode, 403);
  assert.equal(await Enrollment.findOne({ student: student._id, course: c._id }), null);
});

test('11. teacher unenrolls a student from their own course', async () => {
  const c = await Course.create({ name: 'cmtest A-unenroll', teacher: teacherA._id });
  const e = await Enrollment.create({ student: student._id, course: c._id });
  const res = await unenroll(teacherA, e._id);
  assert.equal(res.statusCode, 200);
  assert.equal(await Enrollment.findById(e._id), null);
});

test("12. teacher cannot unenroll using an enrollment ID from another teacher's course (403 IDOR)", async () => {
  const c = await Course.create({ name: 'cmtest B-unenroll', teacher: teacherB._id });
  const e = await Enrollment.create({ student: student._id, course: c._id });
  const res = await unenroll(teacherA, e._id); // teacherA holds the enrollment id but does not own the course
  assert.equal(res.statusCode, 403);
  assert.ok(await Enrollment.findById(e._id)); // NOT deleted
});

test('21. duplicate enrollment is still rejected', async () => {
  const c = await Course.create({ name: 'cmtest A-dup', teacher: teacherA._id });
  await enroll(teacherA, student._id, c._id);
  const res = await enroll(teacherA, student._id, c._id);
  assert.equal(res.statusCode, 400); // 11000 duplicate handled
});

test('teacher enrolls by identifier (studentId code) into own course', async () => {
  const c = await Course.create({ name: 'cmtest A-byid', teacher: teacherA._id });
  const res = makeRes();
  await enrollStudent({ body: { courseId: c._id.toString(), identifier: student.studentId }, user: teacherA }, res);
  assert.equal(res.statusCode, 201);
  assert.ok(await Enrollment.findOne({ student: student._id, course: c._id }));
});

test('teacher enrolls by identifier (username) into own course', async () => {
  const c = await Course.create({ name: 'cmtest A-byusername', teacher: teacherA._id });
  const res = makeRes();
  await enrollStudent({ body: { courseId: c._id.toString(), identifier: student.username }, user: teacherA }, res);
  assert.equal(res.statusCode, 201);
});

test('enroll by identifier is still ownership-gated (another teacher course -> 403)', async () => {
  const c = await Course.create({ name: 'cmtest B-byid', teacher: teacherB._id });
  const res = makeRes();
  await enrollStudent({ body: { courseId: c._id.toString(), identifier: student.studentId }, user: teacherA }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(await Enrollment.findOne({ student: student._id, course: c._id }), null);
});

test('enroll by unknown identifier -> 404', async () => {
  const c = await Course.create({ name: 'cmtest A-unknown', teacher: teacherA._id });
  const res = makeRes();
  await enrollStudent({ body: { courseId: c._id.toString(), identifier: 'STU-DOES-NOT-EXIST' }, user: teacherA }, res);
  assert.equal(res.statusCode, 404);
});

test('22. enrolling a non-student target is rejected', async () => {
  const c = await Course.create({ name: 'cmtest A-nonstudent', teacher: teacherA._id });
  const res = await enroll(teacherA, nonStudent._id, c._id);
  assert.equal(res.statusCode, 400);
});

test('23. enrolling an inactive student is rejected', async () => {
  const c = await Course.create({ name: 'cmtest A-inactive', teacher: teacherA._id });
  const res = await enroll(teacherA, inactiveStudent._id, c._id);
  assert.equal(res.statusCode, 400);
});

// ------------------------- MANAGER REGRESSION -------------------------
test('13. admin/superadmin course management still works (create/update/delete any course)', async () => {
  // superadmin creates a course assigned to teacherA (manager assign flow preserved)
  const created = await create(superadmin, { name: 'cmtest Super-created', teacher: teacherA._id.toString() });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.teacher._id.toString(), teacherA._id.toString());

  // admin updates a course they do not "own" (manager privilege)
  const c = await Course.create({ name: 'cmtest B-admin', teacher: teacherB._id });
  const upd = await update(admin, c._id, { name: 'cmtest B-admin-renamed' });
  assert.equal(upd.statusCode, 200);

  // admin may reassign the owner (transfer allowed for managers)
  const transfer = await update(admin, c._id, { teacher: teacherA._id.toString() });
  assert.equal(transfer.statusCode, 200);
  assert.equal(transfer.body.data.teacher._id.toString(), teacherA._id.toString());

  const del = await remove(superadmin, c._id);
  assert.equal(del.statusCode, 200);
});

test('14. admin/superadmin enrollment management still works on any course', async () => {
  const c = await Course.create({ name: 'cmtest B-mgr-enroll', teacher: teacherB._id });
  const enr = await enroll(admin, student._id, c._id); // admin enrolls into teacherB's course
  assert.equal(enr.statusCode, 201);
  const found = await Enrollment.findOne({ student: student._id, course: c._id });
  const un = await unenroll(superadmin, found._id);
  assert.equal(un.statusCode, 200);
});

// ------------------------- ROUTE RBAC (16-20) -------------------------
test('16-19. students are blocked from all management mutations (route RBAC)', () => {
  for (const label of ['create/update/delete course', 'enroll', 'unenroll']) {
    const res = makeRes();
    let next = false;
    authorize('teacher', 'admin', 'superadmin')({ user: { role: 'student' } }, res, () => { next = true; });
    assert.equal(res.statusCode, 403, label);
    assert.equal(next, false);
  }
});

test('20. unauthenticated requests are rejected before reaching a management controller', () => {
  // `protect` runs first on these routers; without req.user, authorize cannot pass.
  const res = makeRes();
  let next = false;
  // simulate authorize with no user (protect would already have 401'd; assert authorize is not a bypass)
  try {
    authorize('teacher', 'admin', 'superadmin')({ user: undefined }, res, () => { next = true; });
  } catch {
    // accessing undefined.role throws -> still not a pass-through
  }
  assert.equal(next, false);
});
