const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Ensure a JWT secret exists for the successful-login path (self-contained).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-security';

const { isUploadAllowed } = require('../middleware/upload');
const { buildAllowedOrigins, isOriginAllowed } = require('../utils/cors');
const { normalizeAttachmentArray } = require('../utils/attachments');
const User = require('../models/User');
const { login } = require('../controllers/authController');
const { getAllUsers } = require('../controllers/userController');

// ============================ F1 — UPLOAD FILTER ============================
test('F1: dangerous browser-renderable extensions are rejected (even with benign MIME)', () => {
  assert.equal(isUploadAllowed({ originalname: 'x.html', mimetype: 'text/plain' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.htm', mimetype: 'application/pdf' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.xhtml', mimetype: 'text/plain' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.svg', mimetype: 'image/png' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.svgz', mimetype: 'application/zip' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.js', mimetype: 'text/plain' }), false);
});

test('F1: dangerous MIME types are rejected even with a "safe" extension', () => {
  assert.equal(isUploadAllowed({ originalname: 'x.png', mimetype: 'text/html' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.pdf', mimetype: 'image/svg+xml' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.txt', mimetype: 'application/javascript' }), false);
});

test('F1: MIME spoofing cannot bypass extension validation (extension is authoritative)', () => {
  // A .exe claiming to be a PDF must NOT pass (extension not in allow-list).
  assert.equal(isUploadAllowed({ originalname: 'evil.exe', mimetype: 'application/pdf' }), false);
  // No extension -> rejected.
  assert.equal(isUploadAllowed({ originalname: 'noext', mimetype: 'application/pdf' }), false);
});

test('F1: legitimate supported files still upload', () => {
  assert.equal(isUploadAllowed({ originalname: 'photo.png', mimetype: 'image/png' }), true);
  assert.equal(isUploadAllowed({ originalname: 'doc.pdf', mimetype: 'application/pdf' }), true);
  assert.equal(isUploadAllowed({ originalname: 'sheet.csv', mimetype: 'text/csv' }), true);
  assert.equal(isUploadAllowed({ originalname: 'report.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), true);
  // extension known-safe, MIME variant/unknown but not dangerous -> allowed.
  assert.equal(isUploadAllowed({ originalname: 'data.csv', mimetype: 'application/octet-stream' }), true);
});

test('F1: extension check is case-insensitive and covers .mjs/.htaccess', () => {
  assert.equal(isUploadAllowed({ originalname: 'x.HTML', mimetype: 'image/png' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.SVG', mimetype: 'image/png' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.mjs', mimetype: 'text/plain' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.htaccess', mimetype: 'text/plain' }), false);
  assert.equal(isUploadAllowed({ originalname: '.htaccess', mimetype: 'text/plain' }), false); // dotfile, no allowed ext
});

test('F1: double extensions are judged by the FINAL extension and neutralized at serve time', () => {
  // The final extension is what the file is stored/served as. `x.html.jpg` is
  // stored as a .jpg and served with `X-Content-Type-Options: nosniff` +
  // `Content-Disposition: attachment` (see server.js /uploads), so a browser
  // downloads it rather than rendering any embedded markup — no stored XSS.
  assert.equal(isUploadAllowed({ originalname: 'x.html.jpg', mimetype: 'image/jpeg' }), true);
  assert.equal(isUploadAllowed({ originalname: 'x.php.jpg', mimetype: 'image/jpeg' }), true);
  // But a real dangerous FINAL extension is still rejected regardless of prefix.
  assert.equal(isUploadAllowed({ originalname: 'x.jpg.html', mimetype: 'image/jpeg' }), false);
  assert.equal(isUploadAllowed({ originalname: 'x.pdf.svg', mimetype: 'application/pdf' }), false);
});

// ============================== F2 — CORS ==================================
test('F2: configured allowed origin is allowed', () => {
  const allow = buildAllowedOrigins('https://app.example.com, https://admin.example.com');
  assert.equal(isOriginAllowed('https://app.example.com', allow, true), true);
});

test('F2: unknown origin is rejected', () => {
  const allow = buildAllowedOrigins('https://app.example.com');
  assert.equal(isOriginAllowed('https://evil.com', allow, true), false);
  assert.equal(isOriginAllowed('https://evil.com', allow, false), false);
});

test('F2: production + missing CLIENT_ORIGIN fails closed (browser origins rejected)', () => {
  const allow = buildAllowedOrigins('');
  assert.equal(isOriginAllowed('https://anything.com', allow, true), false);
});

test('F2: development with empty allow-list stays permissive, and no-origin requests pass', () => {
  const allow = buildAllowedOrigins('');
  assert.equal(isOriginAllowed('http://localhost:3000', allow, false), true); // dev compatible
  assert.equal(isOriginAllowed(undefined, allow, true), true); // curl/server-to-server
});

// ==================== F4 — ATTACHMENT URL SCHEME ==========================
test('F4: unsafe attachment URL schemes are stripped', () => {
  const unsafe = ['javascript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:msgbox', 'file:///etc/passwd', 'blob:https://x/1'];
  for (const url of unsafe) {
    const [normalized] = normalizeAttachmentArray([{ url, name: 'x' }]);
    // Either dropped entirely, or url neutralized to empty — never the unsafe value.
    assert.notEqual(normalized?.url, url, `unsafe url must not survive: ${url}`);
    assert.ok(!normalized || !/^(javascript|data|vbscript|file|blob):/i.test(normalized.url || ''));
  }
});

test('F4: legitimate http(s) and /uploads attachment URLs are preserved', () => {
  const [https] = normalizeAttachmentArray([{ url: 'https://res.cloudinary.com/x/file.pdf', name: 'f' }]);
  assert.equal(https.url, 'https://res.cloudinary.com/x/file.pdf');
  const [rel] = normalizeAttachmentArray([{ url: '/uploads/123-abc-file.pdf', name: 'f' }]);
  assert.ok(rel.url.endsWith('/uploads/123-abc-file.pdf')); // base-prefixed relative path preserved
});

// ==================== F5 — LOGIN ENUMERATION ==============================
const TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/dot-jordan-test';
const makeRes = () => ({ statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

let activeUser; let inactiveUser;
test.before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await User.deleteMany({ username: /^sectest_/ });
  activeUser = await User.create({ name: 'Sec Active', username: 'sectest_active', studentId: 'STU-9501', password: 'secret123', role: 'student' });
  inactiveUser = await User.create({ name: 'Sec Inactive', username: 'sectest_inactive', studentId: 'STU-9502', password: 'secret123', role: 'student', isActive: false });
});
test.after(async () => {
  await User.deleteMany({ username: /^sectest_/ });
  await mongoose.disconnect();
});

test('F5: inactive account and wrong password and unknown user all return the SAME generic 401', async () => {
  const wrongPw = makeRes();
  await login({ body: { identifier: 'sectest_active', password: 'WRONG' } }, wrongPw);

  const inactive = makeRes();
  await login({ body: { identifier: 'sectest_inactive', password: 'secret123' } }, inactive); // correct pw, inactive

  const unknown = makeRes();
  await login({ body: { identifier: 'sectest_nobody', password: 'whatever' } }, unknown);

  assert.equal(wrongPw.statusCode, 401);
  assert.equal(inactive.statusCode, 401);
  assert.equal(unknown.statusCode, 401);
  // Message must be identical across all three — no "account inactive" disclosure.
  assert.equal(wrongPw.body.message, inactive.body.message);
  assert.equal(inactive.body.message, unknown.body.message);
  assert.ok(!/معطل/.test(inactive.body.message), 'must not reveal inactive state');
});

test('F5: a valid active login still succeeds', async () => {
  const res = makeRes();
  await login({ body: { identifier: 'sectest_active', password: 'secret123' } }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.token);
});

// ================= F8 — NoSQL OPERATOR INJECTION (getAllUsers) =============
test('F8: getAllUsers role filter cannot be used as a live NoSQL operator', async () => {
  const usernamesOf = (body) => (body.data || []).map((u) => u.username);

  // A legitimate string filter still works and returns only that role.
  const stringFiltered = makeRes();
  await getAllUsers({ query: { role: 'student' } }, stringFiltered);
  assert.equal(stringFiltered.statusCode, 200);
  assert.ok(usernamesOf(stringFiltered.body).includes('sectest_active'));

  // Injection attempt: `?role[$ne]=student` arrives as an object. If it were
  // honored as a live operator it would EXCLUDE every student (incl. our seeded
  // student). After coercion it is ignored (non-string -> no filter), so the
  // seeded student is still present — proving the operator never reached Mongo.
  const injected = makeRes();
  await getAllUsers({ query: { role: { $ne: 'student' } } }, injected);
  assert.equal(injected.statusCode, 200);
  assert.ok(
    usernamesOf(injected.body).includes('sectest_active'),
    'the $ne operator must not act as a filter — it should be neutralized to a plain list'
  );
});
