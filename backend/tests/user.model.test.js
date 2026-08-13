const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../models/User');

// Use a dedicated test database so seeded dev data is never touched.
const TEST_MONGO_URI =
  process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';

const BCRYPT_HASH = /^\$2[aby]\$/; // bcrypt hash signature

test.before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await User.deleteMany({ username: /^modeltest_/ });
});

test.after(async () => {
  await User.deleteMany({ username: /^modeltest_/ });
  await mongoose.disconnect();
});

test('password field is excluded by default (select:false) but retrievable with +password', async () => {
  const created = await User.create({
    name: 'Model Test',
    username: 'modeltest_select',
    studentId: 'STU-9001',
    password: 'secret123',
    role: 'student',
  });
  // The document returned from create() still has the (hashed) password in memory;
  // what matters is that DEFAULT queries do not return it.
  assert.ok(BCRYPT_HASH.test(created.password), 'password should be stored hashed, not plaintext');

  const defaultQuery = await User.findById(created._id);
  assert.equal(defaultQuery.password, undefined, 'default query must NOT return password');

  const withPassword = await User.findById(created._id).select('+password');
  assert.ok(withPassword.password, 'explicit +password must return the hash');
  assert.ok(BCRYPT_HASH.test(withPassword.password), 'returned password must be a bcrypt hash');

  const matches = await withPassword.comparePassword('secret123');
  assert.equal(matches, true, 'comparePassword must validate the correct password');
  const rejects = await withPassword.comparePassword('wrongpassword');
  assert.equal(rejects, false, 'comparePassword must reject an incorrect password');
});

test('updating an existing user (non-password field) does not break required-password validation', async () => {
  const created = await User.create({
    name: 'Original Name',
    username: 'modeltest_update',
    studentId: 'STU-9002',
    password: 'origpass123',
    role: 'student',
  });

  // Load WITHOUT the password (default select), mutate another field, and save().
  // With select:false this previously risked a "password required" validation error.
  const loaded = await User.findById(created._id);
  assert.equal(loaded.password, undefined, 'sanity: password not loaded by default');
  loaded.name = 'Updated Name';
  await assert.doesNotReject(() => loaded.save(), 'save() must not throw a validation error');

  const reloaded = await User.findById(created._id).select('+password');
  assert.equal(reloaded.name, 'Updated Name', 'name change must persist');
  assert.ok(reloaded.password, 'password must still exist in the DB after the update');
  assert.equal(
    await reloaded.comparePassword('origpass123'),
    true,
    'original password must remain valid after a non-password update'
  );
});

test('changing the password re-hashes it and invalidates the old one', async () => {
  const created = await User.create({
    name: 'Pw Change',
    username: 'modeltest_pwchange',
    studentId: 'STU-9003',
    password: 'firstpass',
    role: 'student',
  });

  const loaded = await User.findById(created._id);
  loaded.password = 'secondpass';
  await loaded.save();

  const reloaded = await User.findById(created._id).select('+password');
  assert.equal(await reloaded.comparePassword('firstpass'), false, 'old password must no longer match');
  assert.equal(await reloaded.comparePassword('secondpass'), true, 'new password must match');
});
