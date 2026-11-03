import axios from 'axios';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
    }
    // In production / live deployment, use relative '/api/v1'
    // This automatically routes via Nginx on whichever host/port the user opens
    // (e.g. http://192.168.1.164, http://210.18.179.82:3001, etc.)
    return '/api/v1';
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
};

const BASE = getBaseUrl();

const api = axios.create({ baseURL: BASE, timeout: 30000 });

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('crm_token');
  if (t && t !== 'undefined' && t !== 'null') cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  r => r.data,
  err => {
    const url = err.config?.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/forgot-password');

    // Only redirect to login on 401 if it's NOT an auth attempt and NOT already on /login
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(new Error(err.response?.data?.message || err.message || 'Network error'));
  }
);

export const authAPI = {
  login:                   d => api.post('/auth/login', d),
  getMe:                   () => api.get('/auth/me'),
  changePassword:          d => api.put('/auth/change-password', d),
  forgotPasswordSendOtp:   d => api.post('/auth/forgot-password/send-otp', d),
  forgotPasswordVerifyOtp: d => api.post('/auth/forgot-password/verify-otp', d),
  forgotPasswordReset:     d => api.post('/auth/forgot-password/reset', d),
};

export const usersAPI = {
  getAll:        p => api.get('/users', { params: p }),
  create:        d => api.post('/users', d),
  update:       (id, d) => api.put(`/users/${id}`, d),
  resetPassword:(id, d) => api.put(`/users/${id}/reset-password`, d),
  getRoles:      () => api.get('/users/roles'),
};

export const customersAPI = {
  getAll:  p => api.get('/customers', { params: p }),
  getById: id => api.get(`/customers/${id}`),
  create:  d => api.post('/customers', d),
  update: (id, d) => api.put(`/customers/${id}`, d),
  remove:  id => api.delete(`/customers/${id}`),
};

export const leadsAPI = {
  getAll:      p => api.get('/leads', { params: p }),
  getById:     id => api.get(`/leads/${id}`),
  create:      d => api.post('/leads', d),
  update:     (id, d) => api.put(`/leads/${id}`, d),
  bulkUpdate:  d => api.post('/leads/bulk-update', d),
  remove:      id => api.delete(`/leads/${id}`),
  restore:     id => api.patch(`/leads/${id}/restore`),
  updateStage:(id, d) => api.patch(`/leads/${id}/stage`, d),
  getStages:   () => api.get('/leads/stages'),
  getPipeline: () => api.get('/leads/pipeline'),
  getAdjacent: id => api.get(`/leads/${id}/adjacent`),
  getEditHistory: id => api.get(`/leads/${id}/edit-history`),
};

export const stagesAPI = {
  create:  d => api.post('/stages', d),
  update: (id, d) => api.put(`/stages/${id}`, d),
  remove:  id => api.delete(`/stages/${id}`),
  reorder: order => api.put('/stages/reorder', { order }),
};

export const savedFiltersAPI = {
  getAll: (module = 'leads') => api.get('/saved-filters', { params: { module } }),
  create: d => api.post('/saved-filters', d),
  update: (id, d) => api.put(`/saved-filters/${id}`, d),
  remove: id => api.delete(`/saved-filters/${id}`),
};

export const settingsAPI = {
  get:    () => api.get('/settings'),
  update: d => api.put('/settings', d),
};

export const masterAPI = {
  getStates:   () => api.get('/master/states'),
  getCities:   p => api.get('/master/cities', { params: p }),
  createState: d => api.post('/master/states', d),
  createCity:  d => api.post('/master/cities', d),
  deleteState: id => api.delete(`/master/states/${id}`),
  deleteCity:  id => api.delete(`/master/cities/${id}`),
};

export const visitsAPI = {
  checkIn:     d => api.post('/visits/check-in', d),
  checkOut:    d => api.post('/visits/check-out', d),
  getActive:   p => api.get('/visits/active', { params: p }),
  getHistory:  p => api.get('/visits/history', { params: p }),
  getLive:     () => api.get('/visits/live'),
};

export const activitiesAPI = {
  getAll:  p => api.get('/activities', { params: p }),
  create:  d => api.post('/activities', d),
};

export const analyticsAPI = {
  getDashboard:   () => api.get('/analytics/dashboard'),
  getLeadReport:  p => api.get('/analytics/leads-report', { params: p }),
  getVisitReport: p => api.get('/analytics/visits-report', { params: p }),
  getStaleLeads:  p => api.get('/analytics/stale-leads', { params: p }),
  getCustom:      p => api.get('/analytics/custom', { params: p }),

  // Analytics & Custom Dashboard Builder APIs
  getDashboards:      () => api.get('/analytics/dashboards'),
  getDashboardById:   id => api.get(`/analytics/dashboards/${id}`),
  createDashboard:    data => api.post('/analytics/dashboards', data),
  updateDashboard:    (id, data) => api.put(`/analytics/dashboards/${id}`, data),
  deleteDashboard:    id => api.delete(`/analytics/dashboards/${id}`),
  cloneDashboard:     id => api.post(`/analytics/dashboards/${id}/clone`),
  setDefaultDashboard: id => api.put(`/analytics/dashboards/${id}/default`),

  getComponentData:   payload => api.post('/analytics/components/data', payload),
  getSchemaMetadata:  () => api.get('/analytics/schema-meta'),

  getTargets:         () => api.get('/analytics/targets'),
  createTarget:       data => api.post('/analytics/targets', data),
  updateTarget:       (id, data) => api.put(`/analytics/targets/${id}`, data),
  deleteTarget:       id => api.delete(`/analytics/targets/${id}`),
  upsertTarget:       data => api.post('/analytics/targets/upsert', data),
  saveTargetsBatch:   data => api.post('/analytics/targets/batch', data),
};

export const reportsAPI = {
  getModulesMetadata: () => api.get('/reports/modules/metadata'),
  getFolders:         () => api.get('/reports/folders'),
  createFolder:       data => api.post('/reports/folders', data),
  updateFolder:       (id, data) => api.put(`/reports/folders/${id}`, data),
  deleteFolder:       id => api.delete(`/reports/folders/${id}`),

  getReports:         params => api.get('/reports', { params }),
  getById:            id => api.get(`/reports/${id}`),
  create:             data => api.post('/reports', data),
  update:             (id, data) => api.put(`/reports/${id}`, data),
  remove:             id => api.delete(`/reports/${id}`),
  deleteReport:       id => api.delete(`/reports/${id}`),
  clone:              id => api.post(`/reports/${id}/clone`),
  cloneReport:        id => api.post(`/reports/${id}/clone`),
  toggleFavorite:     id => api.post(`/reports/${id}/favorite`),
  preview:            data => api.post('/reports/preview', data),
  run:                (id, params) => api.post(`/reports/${id}/run`, null, { params }),
};

export const customerGroupsAPI = {
  getAll: (params) => api.get('/customer-groups', { params }),
  getById: (id) => api.get('/customer-groups/' + id),
  create: (data) => api.post('/customer-groups', data),
  update: (id, data) => api.put('/customer-groups/' + id, data),
  remove: (id) => api.delete('/customer-groups/' + id),
};

export const customerTypesAPI = {
  getAll: () => api.get('/customer-types'),
  create: (data) => api.post('/customer-types', data),
  update: (id, data) => api.put(`/customer-types/${id}`, data),
  remove: (id) => api.delete(`/customer-types/${id}`),
};

export const contactsAPI = {

  getAll: (params) =>
      api.get('/contacts', {
          params
      }),

  getById: (id) =>
      api.get(`/contacts/${id}`),

  create: (data) =>
      api.post('/contacts', data),

  update: (id, data) =>
      api.put(`/contacts/${id}`, data),

  remove: (id) =>
      api.delete(`/contacts/${id}`)
};

export const productMasterAPI = {

  // Domains
  getDomains: () =>
    api.get('/domains'),

  createDomain: (data) =>
    api.post('/domains', data),

  updateDomain: (id, data) =>
    api.put(`/domains/${id}`, data),

  deleteDomain: (id) =>
    api.delete(`/domains/${id}`),


  // Subdomains
  getSubdomains: (params) =>
    api.get('/subdomains', { params }),

  createSubdomain: (data) =>
    api.post('/subdomains', data),

  updateSubdomain: (id, data) =>
    api.put(`/subdomains/${id}`, data),

  deleteSubdomain: (id) =>
    api.delete(`/subdomains/${id}`),


  // Products
  getProducts: (params) =>
    api.get('/products', { params }),

  createProduct: (data) =>
    api.post('/products', data),

  updateProduct: (id, data) =>
    api.put(`/products/${id}`, data),

  deleteProduct: (id) =>
    api.delete(`/products/${id}`)
};

export const tasksAPI = {

  getAll: (params) =>
    api.get('/tasks', {
      params
    }),

  getById: (id) =>
    api.get(`/tasks/${id}`),

  create: (data) =>
    api.post('/tasks', data),

  update: (id, data) =>
    api.put(`/tasks/${id}`, data),

  remove: (id) =>
    api.delete(`/tasks/${id}`),

  getRelated: (type) =>
    api.get(`/tasks/related/${type}`)
};

export const meetingsAPI = {

  getAll: (params) =>
      api.get('/meetings', { params }),

  getById: (id) =>
      api.get(`/meetings/${id}`),

  create: (data) =>
      api.post('/meetings', data),

  update: (id, data) =>
      api.put(`/meetings/${id}`, data),

  remove: (id) =>
      api.delete(`/meetings/${id}`),

  clone: (id) =>
      api.post(`/meetings/${id}/clone`),

  getRelated: (type) =>
      api.get(`/meetings/related/${type}`),

  getParticipants: (params) =>
      api.get('/meetings/participants', {
          params
      })
};

export const callsAPI = {
  getAll: (params) =>
      api.get('/calls', { params }),

  getById: (id) =>
      api.get(`/calls/${id}`),

  create: (data) =>
      api.post('/calls', data),

  update: (id, data) =>
      api.put(`/calls/${id}`, data),

  remove: (id) =>
      api.delete(`/calls/${id}`),

  getRelated: (type) =>
      api.get(`/calls/related/${type}`)
};

export const notificationsAPI = {
  push: (data) => api.post('/notifications/push', data),
  getAll: (params) => api.get('/notifications', { params }),
  getUnread: () => api.get('/notifications/unread'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

export const mailAPI = {
  getSettings: () => api.get('/mail/settings'),
  updateSettings: (data) => api.put('/mail/settings', data),
  testMail: (data) => api.post('/mail/test', data),
  getLogs: (params) => api.get('/mail/logs', { params }),
  retryLog: (id) => api.post(`/mail/logs/${id}/retry`),
  retryAll: () => api.post('/mail/logs/retry-all'),
  removeLog: (id) => api.delete(`/mail/logs/${id}`),
  runDailyCheck: () => api.post('/mail/run-daily-check'),
  getTemplates: () => api.get('/mail/templates'),
  getTemplate: (key) => api.get(`/mail/templates/${key}`),
  updateTemplate: (key, data) => api.put(`/mail/templates/${key}`, data),
  resetTemplate: (key) => api.post(`/mail/templates/${key}/reset`),
  previewTemplate: (key, data) => api.post(`/mail/templates/${key}/preview`, data),
};

export default api;
