import { API_BASE_URL, getApiOriginFromBaseUrl } from './apiBaseUrl';

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const decodeSafe = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getApiOrigin = () => {
  return getApiOriginFromBaseUrl(API_BASE_URL);
};

export const resolveAttachmentUrl = (url) => {
  const cleanUrl = sanitizeText(url);

  if (!cleanUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(cleanUrl) || cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }

  const origin = getApiOrigin();
  return origin ? `${origin}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}` : cleanUrl;
};

const getAttachmentName = (url, fallback = 'ملف مرفق') => {
  const cleanUrl = sanitizeText(url);

  if (!cleanUrl) {
    return fallback;
  }

  const fileName = cleanUrl.split('?')[0].split('#')[0].split('/').pop();
  return fileName ? decodeSafe(fileName) : fallback;
};

export const normalizeAttachment = (attachment) => {
  if (typeof attachment === 'string') {
    const url = resolveAttachmentUrl(attachment);

    if (!url) {
      return null;
    }

    return {
      kind: 'file',
      url,
      name: getAttachmentName(url),
      mimeType: '',
      size: null,
      storage: 'local',
    };
  }

  if (!attachment || typeof attachment !== 'object') {
    return null;
  }

  const url = resolveAttachmentUrl(attachment.url);

  if (!url) {
    return null;
  }

  const mimeType = sanitizeText(attachment.mimeType);
  const kind = attachment.kind || (mimeType.startsWith('image/') ? 'image' : 'file');
  const size = Number(attachment.size);

  return {
    kind,
    url,
    name: sanitizeText(attachment.name) || getAttachmentName(url, kind === 'link' ? 'رابط خارجي' : 'ملف مرفق'),
    mimeType,
    size: Number.isFinite(size) && size > 0 ? size : null,
    storage: sanitizeText(attachment.storage) || (kind === 'link' ? 'external' : 'local'),
  };
};

export const normalizeAttachments = (attachments) =>
  Array.isArray(attachments)
    ? attachments.map((attachment) => normalizeAttachment(attachment)).filter(Boolean)
    : [];

export const createExternalAttachment = ({ url, name }) => {
  const cleanUrl = sanitizeText(url);

  if (!cleanUrl) {
    return null;
  }

  return {
    kind: 'link',
    url: cleanUrl,
    name: sanitizeText(name) || cleanUrl,
    mimeType: '',
    size: null,
    storage: 'external',
  };
};

export const isImageAttachment = (attachment) =>
  attachment?.kind === 'image' || sanitizeText(attachment?.mimeType).startsWith('image/');

export const formatAttachmentSize = (size) => {
  if (!size || size <= 0) {
    return '';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
