const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const normalizeApiPath = (pathname = '') => {
  const cleanPath = stripTrailingSlash(pathname || '');

  if (!cleanPath || cleanPath === '/') {
    return '/api';
  }

  return /\/api$/i.test(cleanPath) ? cleanPath : `${cleanPath}/api`;
};

export const getApiBaseUrl = (configuredValue = process.env.REACT_APP_API_URL) => {
  const cleanValue = sanitizeText(configuredValue) || DEFAULT_API_BASE_URL;

  if (ABSOLUTE_URL_PATTERN.test(cleanValue)) {
    try {
      const url = new URL(cleanValue);

      url.pathname = normalizeApiPath(url.pathname);
      url.hash = '';

      return stripTrailingSlash(url.toString());
    } catch {
      return `${stripTrailingSlash(cleanValue)}/api`;
    }
  }

  if (cleanValue.startsWith('/')) {
    return normalizeApiPath(cleanValue);
  }

  const normalizedValue = stripTrailingSlash(cleanValue);
  return /\/api$/i.test(normalizedValue) ? normalizedValue : `${normalizedValue}/api`;
};

export const getApiOriginFromBaseUrl = (apiBaseUrl) => {
  const cleanValue = sanitizeText(apiBaseUrl);

  if (ABSOLUTE_URL_PATTERN.test(cleanValue)) {
    try {
      const url = new URL(cleanValue);
      return `${url.protocol}//${url.host}`;
    } catch {
      return typeof window !== 'undefined' ? window.location.origin : '';
    }
  }

  return typeof window !== 'undefined' ? window.location.origin : '';
};

export const API_BASE_URL = getApiBaseUrl();
