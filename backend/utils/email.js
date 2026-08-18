const nodemailer = require('nodemailer');

// ============================================================================
// Reusable SMTP email channel with a safe development fallback.
//
// If SMTP is configured (SMTP_HOST + SMTP_USER + SMTP_PASS), emails are sent via
// nodemailer. Otherwise every send is a no-op that logs the message to the
// console, so the app runs fine locally / in CI with no credentials. sendEmail
// NEVER throws — a delivery failure must not break the primary business flow.
// ============================================================================

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

const isEmailConfigured = () => Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

// Lazily-created shared transporter (only when configured).
let transporter = null;
const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465, // TLS for 465, STARTTLS otherwise
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text } = {}) => {
  try {
    if (!to) {
      // No recipient (e.g. the user has no email on file) — nothing to send.
      console.warn('sendEmail: skipped — no recipient address');
      return { skipped: true };
    }

    const from = SMTP_FROM || SMTP_USER || 'no-reply@dot-jordan.local';
    const mail = { from, to, subject, html, text: text || undefined };

    const activeTransporter = getTransporter();
    if (!activeTransporter) {
      // Dev fallback: log what WOULD have been sent instead of failing.
      console.log(
        `\n[email:fallback] SMTP not configured — email not sent.\n` +
          `  to:      ${to}\n  subject: ${subject}\n  body:    ${(text || html || '').slice(0, 500)}\n`
      );
      return { fallback: true };
    }

    const info = await activeTransporter.sendMail(mail);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    // Fail-safe: never let an email error propagate into the caller's flow.
    console.error('sendEmail error:', error.message);
    return { error: error.message };
  }
};

module.exports = { sendEmail, isEmailConfigured };
