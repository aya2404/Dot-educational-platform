const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Ensure a JWT secret exists for the login/protect behavioural tests (kept
// self-contained so the suite never depends on a loaded .env).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-activation';
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { updateUser } = require('../controllers/userController');
const { login } = require('../controllers/authController');
const { authorize, protect } = require('../middleware/auth');

// Exercises the activation/deactivation guards in the real updateUser controller
// against an isolated test DB, plus the existing auth enforcement for inactive
// users (login + authenticated-request middleware).
const TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

const cleanup = () => User.deleteMany({ username: /^acttest_/ });

let superA; let superB; let admin; let normalUser;

test.before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await cleanup();
  // studentIds are unique across the whole test DB; use a dedicated 88xx range
  // so this file never collides with other test files running in parallel.
  superA = await User.create({ name: 'Super A', username: 'acttest_supera', studentId: 'SAD-8801', password: 'secret123', role: 'superadmin' });
  superB = await User.create({ name: 'Super B', username: 'acttest_superb', studentId: 'SAD-8802', password: 'secret123', role: 'superadmin' });
  admin = await User.create({ name: 'Admin', username: 'acttest_admin', studentId: 'ADM-8801', password: 'secret123', role: 'admin' });
  normalUser = await User.create({ name: 'Normal', username: 'acttest_user', studentId: 'STU-8801', password: 'secret123', role: 'student' });
});

test.after(async () => {
  await cleanup();
  await mongoose.disconnect();
});

const reactivate = async (id) => { await User.findByIdAndUpdate(id, { isActive: true }); };

test('authorized admin can deactivate a normal user', async () => {
  const res = makeRes();
  await updateUser({ params: { id: normalUser._id.toString() }, body: { isActive: false }, user: admin }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.isActive, false);
  await reactivate(normalUser._id);
});

test('authorized admin can reactivate an inactive user', async () => {
  await User.findByIdAndUpdate(normalUser._id, { isActive: false });
  const res = makeRes();
  await updateUser({ params: { id: normalUser._id.toString() }, body: { isActive: true }, user: admin }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.isActive, true);
});

test('an admin cannot deactivate a superadmin (403) — only a superadmin may', async () => {
  // Also covers "admin attempts to deactivate the last active superadmin":
  // the privileged-role guard rejects it before the last-superadmin check.
  const res = makeRes();
  await updateUser({ params: { id: superA._id.toString() }, body: { isActive: false }, user: admin }, res);
  assert.equal(res.statusCode, 403);
  const fresh = await User.findById(superA._id);
  assert.equal(fresh.isActive, true);
});

test('admin cannot deactivate their own account (blocked, stays active)', async () => {
  // An admin cannot edit any privileged account — including their own — so the
  // privileged-role guard (403) blocks self-deactivation before the self-guard.
  // Either way, an admin can never deactivate themselves.
  const res = makeRes();
  await updateUser({ params: { id: admin._id.toString() }, body: { isActive: false }, user: admin }, res);
  assert.equal(res.statusCode, 403);
  const fresh = await User.findById(admin._id);
  assert.equal(fresh.isActive, true); // unchanged
});

test('superadmin cannot deactivate their own account', async () => {
  const res = makeRes();
  await updateUser({ params: { id: superA._id.toString() }, body: { isActive: false }, user: superA }, res);
  assert.equal(res.statusCode, 400);
  const fresh = await User.findById(superA._id);
  assert.equal(fresh.isActive, true);
});

test('superadmin can deactivate another superadmin when another active one remains', async () => {
  const res = makeRes();
  await updateUser({ params: { id: superB._id.toString() }, body: { isActive: false }, user: superA }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.isActive, false);
  // superA remains active -> invariant preserved
  assert.equal(await User.countDocuments({ role: 'superadmin', isActive: true }), 1);
});

test('cannot deactivate the last active superadmin', async () => {
  // superB is currently inactive (from previous test); superA is the last active one.
  const res = makeRes();
  await updateUser({ params: { id: superA._id.toString() }, body: { isActive: false }, user: superB }, res);
  assert.equal(res.statusCode, 400);
  const fresh = await User.findById(superA._id);
  assert.equal(fresh.isActive, true); // still active — invariant held
  await reactivate(superB._id); // restore fixture
});

test('deactivating an already-inactive user is safe/idempotent', async () => {
  await User.findByIdAndUpdate(normalUser._id, { isActive: false });
  const res = makeRes();
  await updateUser({ params: { id: normalUser._id.toString() }, body: { isActive: false }, user: admin }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.isActive, false);
  await reactivate(normalUser._id);
});

test('activating an already-active user is safe/idempotent', async () => {
  const res = makeRes();
  await updateUser({ params: { id: normalUser._id.toString() }, body: { isActive: true }, user: admin }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.isActive, true);
});

test('route RBAC: authorize blocks a non-admin from the user-management endpoints (403)', () => {
  // The isActive endpoint is PUT /api/users/:id, guarded by
  // authorize('admin','superadmin'). A student/teacher never reaches the
  // controller. Verify that authorization boundary directly.
  for (const role of ['student', 'teacher']) {
    const res = makeRes();
    let nextCalled = false;
    authorize('admin', 'superadmin')({ user: { role } }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403, `${role} must be blocked`);
    assert.equal(nextCalled, false);
  }
});

test('route RBAC: authorize allows admin and superadmin through', () => {
  for (const role of ['admin', 'superadmin']) {
    const res = makeRes();
    let nextCalled = false;
    authorize('admin', 'superadmin')({ user: { role } }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, `${role} must pass`);
  }
});

test('existing user update fields (name) still work normally alongside the guards', async () => {
  const res = makeRes();
  await updateUser({ params: { id: normalUser._id.toString() }, body: { name: 'Renamed Normal' }, user: admin }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.name, 'Renamed Normal');
  const fresh = await User.findById(normalUser._id);
  assert.equal(fresh.name, 'Renamed Normal');
  assert.equal(fresh.isActive, true); // untouched by a name-only update
});

test('concurrency invariant: two simultaneous superadmin deactivations never leave zero active', async () => {
  // Isolate so the two raced superadmins are the only active superadmins in the
  // test DB, forcing the last-superadmin path under genuine concurrency.
  await User.deleteMany({ username: /^acttest_super/ });
  const superX = await User.create({ name: 'Super X', username: 'acttest_superx', studentId: 'SAD-8811', password: 'secret123', role: 'superadmin' });
  const superY = await User.create({ name: 'Super Y', username: 'acttest_supery', studentId: 'SAD-8812', password: 'secret123', role: 'superadmin' });

  const resX = makeRes();
  const resY = makeRes();
  await Promise.all([
    updateUser({ params: { id: superX._id.toString() }, body: { isActive: false }, user: superY }, resX),
    updateUser({ params: { id: superY._id.toString() }, body: { isActive: false }, user: superX }, resY),
  ]);

  // Whatever the interleaving, the committed state must retain >= 1 active
  // superadmin (pre-check + compensating rollback guarantee the final state).
  const activeSuperadmins = await User.countDocuments({ role: 'superadmin', isActive: true });
  assert.ok(activeSuperadmins >= 1, `expected >= 1 active superadmin, found ${activeSuperadmins}`);
});

test('auth enforcement: an inactive user cannot log in (401)', async () => {
  const u = await User.create({ name: 'Auth User', username: 'acttest_auth', studentId: 'STU-8821', password: 'secret123', role: 'student', isActive: false });
  const res = makeRes();
  await login({ body: { identifier: 'acttest_auth', password: 'secret123' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
  await User.deleteOne({ _id: u._id });
});

test("auth enforcement: an inactive user's existing token is rejected mid-request (401)", async () => {
  const u = await User.create({ name: 'Token User', username: 'acttest_token', studentId: 'STU-8822', password: 'secret123', role: 'student', isActive: true });
  // Token minted while active, then the account is deactivated.
  const token = jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  await User.findByIdAndUpdate(u._id, { isActive: false });

  const res = makeRes();
  let nextCalled = false;
  await protect({ headers: { authorization: `Bearer ${token}` } }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false); // request must not proceed
  await User.deleteOne({ _id: u._id });
});

test('auth enforcement: reactivating a user restores their ability to log in', async () => {
  const u = await User.create({ name: 'Reauth User', username: 'acttest_reauth', studentId: 'STU-8823', password: 'secret123', role: 'student', isActive: false });
  // Blocked while inactive.
  const blocked = makeRes();
  await login({ body: { identifier: 'acttest_reauth', password: 'secret123' } }, blocked);
  assert.equal(blocked.statusCode, 401);

  // Reactivate via the admin-facing controller, then login succeeds.
  const activateRes = makeRes();
  await updateUser({ params: { id: u._id.toString() }, body: { isActive: true }, user: admin }, activateRes);
  assert.equal(activateRes.statusCode, 200);

  const ok = makeRes();
  await login({ body: { identifier: 'acttest_reauth', password: 'secret123' } }, ok);
  assert.equal(ok.statusCode, 200);
  assert.ok(ok.body.token, 'login should return a token after reactivation');
  await User.deleteOne({ _id: u._id });
});
