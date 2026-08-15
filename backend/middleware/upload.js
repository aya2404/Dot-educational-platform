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
};
