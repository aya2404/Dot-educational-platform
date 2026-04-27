const path = require('path');

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const configuredUploadDir = sanitizeText(process.env.UPLOAD_DIR);

const UPLOAD_DIR = configuredUploadDir
  ? path.resolve(configuredUploadDir)
  : path.join(__dirname, '..', 'uploads');

module.exports = {
  UPLOAD_DIR,
};
