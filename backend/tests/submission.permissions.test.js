const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { getSubmissionPermissions } = require('../utils/permissions');

// Pure authorization logic — no DB/server needed. Verifies who may grade a
// submission (canGrade): only an admin/superadmin or the assigned course
// teacher — never the submitting student, and never an unrelated teacher.

const oid = () => new mongoose.Types.ObjectId();

test('canGrade is true for the assigned course teacher', () => {
  const teacherId = oid();
  const perms = getSubmissionPermissions({
    user: { _id: teacherId, role: 'teacher' },
    submission: { student: oid() },
    task: {},
    course: { teacher: teacherId },
  });
  assert.equal(perms.canGrade, true);
});

test('canGrade is false for a teacher who does not own the course', () => {
  const perms = getSubmissionPermissions({
    user: { _id: oid(), role: 'teacher' },
    submission: { student: oid() },
    task: {},
    course: { teacher: oid() }, // a different teacher owns this course
  });
  assert.equal(perms.canGrade, false);
});

test('canGrade is true for admin and superadmin (even without course context)', () => {
  for (const role of ['admin', 'superadmin']) {
    const perms = getSubmissionPermissions({
      user: { _id: oid(), role },
      submission: { student: oid() },
      task: {},
    });
    assert.equal(perms.canGrade, true, `role ${role} should be able to grade`);
  }
});

test('canGrade is false for the submitting student (owner)', () => {
  const studentId = oid();
  const perms = getSubmissionPermissions({
    user: { _id: studentId, role: 'student' },
    submission: { student: studentId },
    task: {},
    course: { teacher: oid() },
  });
  assert.equal(perms.isOwner, true);
  assert.equal(perms.canGrade, false);
});

test('canGrade is false for a teacher when no course context is provided', () => {
  const perms = getSubmissionPermissions({
    user: { _id: oid(), role: 'teacher' },
    submission: { student: oid() },
    task: {},
  });
  assert.equal(perms.canGrade, false);
});
