// CORS origin policy. Fail-closed in production: an unknown origin (or an empty
// allow-list) is rejected. In non-production an empty allow-list stays permissive
// so local development keeps working without configuration.

const buildAllowedOrigins = (raw) =>
  (raw || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const isOriginAllowed = (origin, allowedOrigins = [], isProduction = false) => {
  // Requests without an Origin header (curl, server-to-server, native apps) are
  // not browser cross-origin requests and are allowed.
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) return true;

  // Production must be explicitly configured — never fall through to allow-all.
  if (!isProduction && allowedOrigins.length === 0) return true;

  return false;
};

module.exports = { buildAllowedOrigins, isOriginAllowed };
