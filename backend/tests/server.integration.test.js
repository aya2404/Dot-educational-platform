const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const mongoose = require('mongoose');

const TEST_MONGO_URI =
  process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';
const SERVER_PATH = path.join(__dirname, '..', 'server.js');

// ---------------------------------------------------------------------------
// JWT_SECRET missing -> the server must fail fast (exit code 1) at startup.
// ---------------------------------------------------------------------------
test('server exits with a clear error when JWT_SECRET is not configured', async () => {
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [SERVER_PATH], {
      env: { ...process.env, JWT_SECRET: '', MONGO_URI: TEST_MONGO_URI, PORT: '5199' },
      cwd: path.join(__dirname, '..'),
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.stdout.on('data', () => {});

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: null, stderr, timedOut: true });
    }, 15000);

    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, stderr, timedOut: false });
    });
  });

  assert.equal(result.timedOut, false, 'server should exit promptly, not hang');
  assert.equal(result.code, 1, 'server must exit with code 1 when JWT_SECRET is missing');
  assert.match(
    result.stderr,
    /JWT_SECRET is not configured/,
    'stderr must explain the missing JWT_SECRET'
  );
});

// ---------------------------------------------------------------------------
// Login rate limiting -> after the configured limit, requests get HTTP 429.
// ---------------------------------------------------------------------------
test('login endpoint returns 429 after too many attempts', async (t) => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_rate_limit';
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  // Import AFTER env is set; require.main !== module so it will NOT auto-listen.
  const app = require('../server');
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  const statuses = [];
  for (let i = 0; i < 25; i += 1) {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'nobody', password: 'wrongpass' }),
    });
    statuses.push(res.status);
  }

  const unauthorized = statuses.filter((s) => s === 401).length;
  const limited = statuses.filter((s) => s === 429).length;

  assert.ok(unauthorized > 0, `expected some 401s before the limit, got: ${statuses.join(',')}`);
  assert.ok(limited > 0, `expected 429s after the limit, got: ${statuses.join(',')}`);
  assert.equal(unauthorized + limited, 25, 'every response should be either 401 or 429');
});
