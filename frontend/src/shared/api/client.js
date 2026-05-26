import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_VERSION = import.meta.env.VITE_API_VERSION || '/api/v1';

const api = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getApiErrorMessage = (error, fallback = 'Request failed') => {
  const data = error?.response?.data;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  if (typeof data?.detail?.message === 'string') {
    return data.detail.message;
  }

  if (typeof data?.error?.message === 'string') {
    return data.error.message;
  }

  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    return data.detail.map((item) => item.msg).join('. ');
  }

  if (Array.isArray(data?.error?.details) && data.error.details.length > 0) {
    return data.error.details.map((item) => item.msg).join('. ');
  }

  if (!error?.response) {
    return 'Cannot connect to the backend. Make sure the API server is running.';
  }

  return `${fallback}. Backend returned HTTP ${error.response.status}.`;
};

export const getApiFieldErrors = (error) => {
  const details = error?.response?.data?.detail || error?.response?.data?.error?.details || [];

  if (!Array.isArray(details)) {
    return {};
  }

  return details.reduce((acc, item) => {
    const field = item.loc?.[item.loc.length - 1];
    if (field) {
      acc[field] = item.msg;
    }
    return acc;
  }, {});
};


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (error.config?.url !== '/auth/me') {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);


export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
};


export const templatesAPI = {
  getAll: () => api.get('/templates'),
  getById: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  parseFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/templates/parse-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importPublic: (data) => api.post('/templates/import-public', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
  setReady: (id) => api.post(`/templates/${id}/ready`),
  createShareLink: (id, data) => api.post(`/templates/${id}/share-links`, data),
  getSharedByToken: (token) => api.get(`/templates/shared/${token}`),
  getShare: (token) => api.get(`/share/${token}`),
  startShareAttempt: (token) => api.post(`/share/${token}/start-attempt`),
};


export const attemptsAPI = {
  getAll: () => api.get('/attempts'),
  getById: (id) => api.get(`/attempts/${id}`),
  create: (data) => api.post('/attempts', data),
  submitAnswer: (attemptId, data) => api.post(`/attempts/${attemptId}/answers`, data),
  pause: (id) => api.post(`/attempts/${id}/pause`),
  resume: (id) => api.post(`/attempts/${id}/resume`),
  finish: (id) => api.post(`/attempts/${id}/finish`),
  getResult: (id) => api.get(`/attempts/${id}/result`),
  analyzeVideo: (id, data) => api.post(`/attempts/${id}/video-analysis`, data),
  saveVideoMetrics: (id, data) => api.post(`/attempts/${id}/video-metrics`, data),
};


export const mentorAPI = {
  getAssessments: () => api.get('/mentor/assessments'),
  getInvitations: () => api.get('/mentor/invitations'),
  getReviewResults: () => api.get('/mentor/review-results'),
  getMyResults: () => api.get('/mentor/my-results'),
  getAttempt: (id) => api.get(`/mentor/attempts/${id}`),
  submitReview: (id, data) => api.post(`/mentor/attempts/${id}/review`, data),
  getAnalytics: (templateId) => api.get(`/mentor/analytics/${templateId}`),
};

export const analyticsAPI = {
  getUser: () => api.get('/analytics/user'),
  getMe: () => api.get('/analytics/me'),
  getMentor: () => api.get('/analytics/mentor'),
  getTemplate: (id) => api.get(`/analytics/templates/${id}`),
};

export default api;
