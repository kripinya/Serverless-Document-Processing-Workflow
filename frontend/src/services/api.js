// ============================================================
// api.js — Centralized API service
// All communication between Frontend <-> Backend happens here
// ============================================================
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach JWT bearer token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Authentication APIs ───
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me')
};

// ─── Document APIs ───
export const documentAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('document', file);
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getAll: (limit = 50) => api.get(`/documents?limit=${limit}`),
  getById: (id) => api.get(`/documents/${id}`),
  delete: (id) => api.delete(`/documents/${id}`),
  download: (id) => api.get(`/documents/${id}/download`)
};

// ─── Processing & Event Pipeline APIs ───
export const processingAPI = {
  getStatus: (id) => api.get(`/processing/status/${id}`),
  retry: (id) => api.post(`/processing/retry/${id}`),
  getEvents: (id) => api.get(`/processing/events/${id}`)
};

// ─── System Health & Metrics APIs ───
export const healthAPI = {
  getHealth: () => api.get('/health'),
  getMetrics: () => api.get('/health/metrics')
};

export default api;
