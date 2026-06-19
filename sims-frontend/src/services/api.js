import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token
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
  },
);

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';

      // Dispatch toast or notification (if toast context is available)
      const event = new CustomEvent('showToast', {
        detail: {
          message: 'Session expired. Please login again.',
          type: 'error',
        },
      });
      window.dispatchEvent(event);
    }

    if (error.response?.status === 403) {
      const event = new CustomEvent('showToast', {
        detail: {
          message: 'Access denied. You do not have permission for this action.',
          type: 'error',
        },
      });
      window.dispatchEvent(event);
    }

    // Generic error handling
    if (error.response?.data?.message) {
      const event = new CustomEvent('showToast', {
        detail: {
          message: error.response.data.message,
          type: 'error',
        },
      });
      window.dispatchEvent(event);
    }

    return Promise.reject(error);
  },
);

// Export API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  register: (data) => api.post('/auth/register', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
};

export const productAPI = {
  getAll:    (params) => api.get('/products', { params }),
  getById:   (id)     => api.get(`/products/${id}`),
  create:    (data)   => api.post('/products', data),
  update:    (id, data) => api.put(`/products/${id}`, data),
  delete:    (id)     => api.delete(`/products/${id}`),
  uploadImage: (id, formData) =>
    api.post(`/products/${id}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const categoryAPI = {
  getAll:  ()     => api.get('/products/categories'),
  create:  (data) => api.post('/products/categories', data),
};

export const inventoryAPI = {
  getAll:       (params)     => api.get('/inventory', { params }),
  getById:      (id)         => api.get(`/inventory/${id}`),
  getLowStock:  (params)     => api.get('/inventory/low-stock', { params }),
  getValuation: (params)     => api.get('/inventory/valuation', { params }),
  getSummary:   ()           => api.get('/inventory/summary'),
  stockIn:      (data)       => api.post('/inventory/stock-in', data),
  stockOut:     (data)       => api.post('/inventory/stock-out', data),
  adjust:       (data)       => api.post('/inventory/adjust', data),
  transfer:     (data)       => api.post('/inventory/transfer', data),
  updateStock:  (id, data)   => api.put(`/inventory/${id}`, data),
};

export const warehouseAPI = {
  getAll:        (params)   => api.get('/warehouses', { params }),
  getById:       (id)       => api.get(`/warehouses/${id}`),
  getStats:      (id)       => api.get(`/warehouses/${id}/stats`),
  getInventory:  (id, p)    => api.get(`/warehouses/${id}/inventory`, { params: p }),
  getManagers:   ()         => api.get('/warehouses/managers'),
  create:        (data)     => api.post('/warehouses', data),
  update:        (id, data) => api.put(`/warehouses/${id}`, data),
  delete:        (id)       => api.delete(`/warehouses/${id}`),
};

export const supplierAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

export const purchaseOrderAPI = {
  getAll:    (params)   => api.get('/purchase-orders', { params }),
  getById:   (id)       => api.get(`/purchase-orders/${id}`),
  create:    (data)     => api.post('/purchase-orders', data),
  update:    (id, data) => api.put(`/purchase-orders/${id}`, data),
  submit:    (id)       => api.post(`/purchase-orders/${id}/submit`),
  approve:   (id)       => api.patch(`/purchase-orders/${id}/approve`),
  ship:      (id)       => api.post(`/purchase-orders/${id}/ship`),
  receive:   (id, data) => api.post(`/purchase-orders/${id}/receive`, data),
  cancel:    (id)       => api.patch(`/purchase-orders/${id}/cancel`),
};

export const salesOrderAPI = {
  getAll: (params) => api.get('/sales-orders', { params }),
  getById: (id) => api.get(`/sales-orders/${id}`),
  create: (data) => api.post('/sales-orders', data),
  update: (id, data) => api.put(`/sales-orders/${id}`, data),
  delete: (id) => api.delete(`/sales-orders/${id}`),
};

export const reportAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getInventoryReport: (params) => api.get('/reports/inventory', { params }),
};

export const dashboardAPI = {
  getStats:  () => api.get('/dashboard/stats'),
  getCharts: () => api.get('/dashboard/charts'),
};

export const requestAPI = {
  getCatalog: (params) => api.get('/catalog', { params }),
  create: (data) => api.post('/requests', data),
  getMyRequests: (params) => api.get('/requests/my', { params }),
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  cancel: (id) => api.patch(`/requests/${id}/cancel`),
  approve: (id, data) => api.patch(`/requests/${id}/approve`, data),
  reject: (id, data) => api.patch(`/requests/${id}/reject`, data),
  fulfill: (id, data) => api.patch(`/requests/${id}/fulfill`, data),
};

export const importAPI = {
  // Dedicated endpoints
  uploadProducts:   (formData) => api.post('/imports/products',   formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadInventory:  (formData) => api.post('/imports/inventory',  formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadWarehouses: (formData) => api.post('/imports/warehouses', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  // Legacy unified
  upload:           (formData) => api.post('/imports/upload',     formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getJobStatus:     (jobId)    => api.get(`/imports/${jobId}`),
  getHistory:       (params)   => api.get('/imports', { params }),
  downloadTemplate: (type)     => api.get(`/imports/template/${type}`, { responseType: 'blob' }),
};

export const automationAPI = {
  getLogs: (params) => api.get('/automation/logs', { params }),
  getReorderRules: (params) => api.get('/automation/reorder-rules', { params }),
  createReorderRule: (data) => api.post('/automation/reorder-rules', data),
  updateReorderRule: (id, data) => api.put(`/automation/reorder-rules/${id}`, data),
  toggleReorderRule: (id) => api.patch(`/automation/reorder-rules/${id}/toggle`),
  triggerJob: (jobName) => api.post(`/automation/trigger/${jobName}`),
  generateBarcodes: () => api.post('/automation/admin/generate-barcodes'),
};

export const barcodeAPI = {
  scan: (data) => api.post('/barcodes/scan', data),
  lookup: (barcode) => api.get('/barcodes/lookup', { params: { barcode } }),
  getScanHistory: (params) => api.get('/barcodes/history', { params }),
  getUnrecognised: (params) => api.get('/barcodes/unrecognised', { params }),
  linkScan: (scanId, product_id) => api.patch(`/barcodes/${scanId}/link`, { product_id }),
};

export default api;
