const path = require('path');

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const LOCAL_UPLOAD_SEGMENT = '/uploads/';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const FILE_EXTENSIONS = new Set([
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

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const getRequestBaseUrl = (req) => {
  const configuredBaseUrl = sanitizeText(process.env.PUBLIC_API_URL);

  if (configuredBaseUrl) {
    return stripTrailingSlash(configuredBaseUrl);
  }

  if (!req) {
    return '';
  }

  return stripTrailingSlash(`${req.protocol}://${req.get('host')}`);
};

const toPublicUrl = (url, req) => {
  const cleanUrl = sanitizeText(url);

  if (!cleanUrl) {
    return '';
  }

  if (ABSOLUTE_URL_PATTERN.test(cleanUrl) || cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }

  const baseUrl = getRequestBaseUrl(req);

  if (!baseUrl) {
    return cleanUrl;
  }

  return `${baseUrl}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
};

const decodeSafe = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getExtensionFromUrl = (url) => {
  const cleanUrl = sanitizeText(url);

  if (!cleanUrl) {
    return '';
  }

  return path.extname(cleanUrl.split('?')[0].split('#')[0]).toLowerCase();
};

const getAttachmentName = (url, fallback = 'ملف مرفق') => {
  const cleanUrl = sanitizeText(url);

  if (!cleanUrl) {
    return fallback;
  }

  const fileName = path.basename(cleanUrl.split('?')[0].split('#')[0]);
  return fileName && fileName !== '/' && fileName !== '.'
    ? decodeSafe(fileName)
    : fallback;
};

const inferAttachmentKind = ({ kind, mimeType, url }) => {
  if (['file', 'image', 'link'].includes(kind)) {
    return kind;
  }

  const cleanMimeType = sanitizeText(mimeType);
  const extension = getExtensionFromUrl(url);

  if (cleanMimeType.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }

  if (FILE_EXTENSIONS.has(extension) || cleanMimeType) {
    return 'file';
  }

  if (ABSOLUTE_URL_PATTERN.test(sanitizeText(url))) {
    return 'link';
  }

  return 'file';
};

const inferStorage = ({ storage, kind, rawUrl }) => {
  if (['local', 'cloudinary', 'external'].includes(storage)) {
    return storage;
  }

  if (kind === 'link') {
    return 'external';
  }

  if (ABSOLUTE_URL_PATTERN.test(rawUrl) && !rawUrl.includes(LOCAL_UPLOAD_SEGMENT)) {
    return 'cloudinary';
  }

  return 'local';
};

const normalizeAttachment = (attachment, { req } = {}) => {
  if (typeof attachment === 'string') {
    const rawUrl = sanitizeText(attachment);

    if (!rawUrl) {
      return null;
    }

    const kind = inferAttachmentKind({ url: rawUrl });

    return {
      kind,
      url: toPublicUrl(rawUrl, req),
      name: getAttachmentName(rawUrl, kind === 'link' ? 'رابط خارجي' : 'ملف مرفق'),
      mimeType: '',
      size: null,
      storage: inferStorage({ kind, rawUrl }),
    };
  }

  if (!attachment || typeof attachment !== 'object') {
    return null;
  }

  const rawUrl = sanitizeText(attachment.url);

  if (!rawUrl) {
    return null;
  }

  const mimeType = sanitizeText(attachment.mimeType);
  const kind = inferAttachmentKind({
    kind: attachment.kind,
    mimeType,
    url: rawUrl,
  });
  const parsedSize = Number(attachment.size);

  return {
    kind,
    url: toPublicUrl(rawUrl, req),
    name:
      sanitizeText(attachment.name) ||
      getAttachmentName(rawUrl, kind === 'link' ? 'رابط خارجي' : 'ملف مرفق'),
    mimeType,
    size: Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : null,
    storage: inferStorage({
      storage: sanitizeText(attachment.storage),
      kind,
      rawUrl,
    }),
  };
};

const normalizeAttachmentArray = (attachments, options = {}) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map((attachment) => normalizeAttachment(attachment, options))
    .filter(Boolean);
};

module.exports = {
  inferAttachmentKind,
  normalizeAttachment,
  normalizeAttachmentArray,
  toPublicUrl,
};
