const test = require('node:test');
const assert = require('node:assert/strict');

// F3 — baseline security headers must be present on normal API responses.
// Boots the real Express app (no DB needed for /api/health) and asserts the
// dependency-free header middleware in server.js is applied. HSTS is only set
// when NODE_ENV=production, so it is intentionally NOT asserted here.
test('F3: baseline security headers are set on API responses', async (t) => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_headers';

  // require.main !== module, so importing does NOT auto-listen or exit.
  const app = require('../server');
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const res = await fetch(`http://127.0.0.1:${port}/api/health`);

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(res.headers.get('x-dns-prefetch-control'), 'off');
});

// Non-production must NOT emit HSTS (only appropriate over HTTPS in production).
test('F3: HSTS is absent outside production', async (t) => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_headers';
  const app = require('../server');
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const res = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(res.headers.get('strict-transport-security'), null);
});
