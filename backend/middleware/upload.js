const path = require('path');
const multer = require('multer');

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/json',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
]);

const allowedExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.json',
  '.txt',
  '.csv',
  '.zip',
  '.rar',
]);

// Browser-renderable / executable types that must never be accepted, even if a
// spoofed MIME type would otherwise pass — they can execute script when opened.
const blockedExtensions = new Set([
  '.html', '.htm', '.xhtml', '.shtml', '.svg', '.svgz', '.xml', '.js', '.mjs', '.htaccess',
]);
const blockedMimeTypes = new Set([
  'text/html', 'application/xhtml+xml', 'image/svg+xml', 'application/xml', 'text/xml',
  'text/javascript', 'application/javascript', 'application/x-javascript',
]);

// Testable decision: trust neither MIME nor extension alone. Reject dangerous
// MIME types AND dangerous extensions, then require a known-safe extension (the
// extension is what the file is stored/served with, so it is authoritative).
const isUploadAllowed = ({ originalname, mimetype } = {}) => {
  const extension = path.extname(originalname || '').toLowerCase();
  const mime = (mimetype || '').toLowerCase();

  if (blockedExtensions.has(extension) || blockedMimeTypes.has(mime)) {
    return false;
  }

  return allowedExtensions.has(extension);
};

// ---- Magic-byte (file signature) validation -------------------------------
// Defence-in-depth on top of the MIME/extension checks: verify the file's actual
// leading bytes match the type its extension claims, so a file cannot be
// disguised by renaming (e.g. a text/script payload saved as "x.png"). Runs on
// the in-memory buffer (multer memoryStorage), so it needs the parsed file.
//
// Extension is authoritative here because the file is ultimately stored/served
// by its extension. Each entry lists the allowed leading-byte signatures.
const SIGNATURES = {
  '.png': [[0x89, 0x50, 0x4e, 0x47]],
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.gif': [[0x47, 0x49, 0x46, 0x38]], // "GIF8"
  '.pdf': [[0x25, 0x50, 0x44, 0x46]], // "%PDF"
  '.rar': [[0x52, 0x61, 0x72, 0x21]], // "Rar!"
  // ZIP-based Office formats + plain zip all begin with the PK local-file header.
  '.zip': [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06], [0x50, 0x4b, 0x07, 0x08]],
  '.docx': [[0x50, 0x4b, 0x03, 0x04]],
  '.xlsx': [[0x50, 0x4b, 0x03, 0x04]],
  '.pptx': [[0x50, 0x4b, 0x03, 0x04]],
  // Legacy OLE compound-document formats.
  '.doc': [[0xd0, 0xcf, 0x11, 0xe0]],
  '.xls': [[0xd0, 0xcf, 0x11, 0xe0]],
  '.ppt': [[0xd0, 0xcf, 0x11, 0xe0]],
};

// Plain-text formats have no binary signature — instead assert the bytes are
// actually text (no NUL, no unexpected control chars), which still catches a
// binary payload renamed to .txt/.csv/.json.
const TEXT_EXTENSIONS = new Set(['.txt', '.csv', '.json']);

const looksLikeText = (buffer) => {
  const sample = buffer.subarray(0, Math.min(buffer.length, 512));
  for (const byte of sample) {
    // Allow tab (9), LF (10), CR (13); reject NUL and other control bytes.
    if (byte === 0 || byte < 9 || (byte > 13 && byte < 32)) return false;
  }
  return true;
};

const matchesSignature = (buffer, signatures) =>
  signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));

// Returns true when the file's real content matches the type its extension
// declares. Unknown-but-allow-listed extensions (none today) pass by default so
// this can only ever tighten, never loosen, the existing allow-list.
const hasValidSignature = ({ buffer, originalname } = {}) => {
  if (!buffer || buffer.length === 0) return false;
  const extension = path.extname(originalname || '').toLowerCase();

  if (TEXT_EXTENSIONS.has(extension)) return looksLikeText(buffer);

  // WEBP: "RIFF" .... "WEBP".
  if (extension === '.webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }

  const signatures = SIGNATURES[extension];
  if (!signatures) return true; // allow-listed but no known signature — don't block
  return matchesSignature(buffer, signatures);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
  },
  fileFilter(req, file, callback) {
    if (isUploadAllowed(file)) {
      return callback(null, true);
    }
    return callback(new Error('نوع الملف غير مدعوم'));
  },
});

module.exports = {
  MAX_FILE_SIZE,
  upload,
  isUploadAllowed,
  hasValidSignature,
};
