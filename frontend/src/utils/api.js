import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const getApiOrigin = () => {
  try {
    const url = new URL(API_BASE_URL);
    return `${url.protocol}//${url.host}`;
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
});

let unauthorizedHandler = null;
let isHandlingUnauthorized = false;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

api.interceptors.request.use(
  (config) => {
    const nextConfig = { ...config };
    const token = localStorage.getItem('token');

    nextConfig.headers = nextConfig.headers || {};

    if (token) {
      nextConfig.headers.Authorization = `Bearer ${token}`;
    }

    if (nextConfig.data instanceof FormData) {
      delete nextConfig.headers['Content-Type'];
    }

    return nextConfig;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const shouldSkip = error.config?.skipAuthRedirect;
    const isLoginRequest = /\/auth\/login$/.test(requestUrl);

    if (status === 401 && !shouldSkip && !isLoginRequest && typeof unauthorizedHandler === 'function') {
      if (!isHandlingUnauthorized) {
        isHandlingUnauthorized = true;

        try {
          await unauthorizedHandler(error);
        } finally {
          isHandlingUnauthorized = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
