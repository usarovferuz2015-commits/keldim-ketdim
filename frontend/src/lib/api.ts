import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('Refresh token topilmadi');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  telegramLogin: (telegramData: Record<string, unknown>) =>
    api.post('/auth/telegram', telegramData),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const userApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  getFaceTemplate: (id: string) => api.get(`/users/${id}/face-template`),
  saveFaceTemplate: (id: string, formData: FormData) =>
    api.post(`/users/${id}/face-template`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const departmentApi = {
  getAll: () => api.get('/departments'),
  getById: (id: string) => api.get(`/departments/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/departments', data),
  update: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    api.put(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
  getEmployees: (id: string) => api.get(`/departments/${id}/employees`),
};

export const scheduleApi = {
  getAll: () => api.get('/schedules'),
  getMy: () => api.get('/schedules/my'),
  getByUserId: (userId: string) => api.get(`/schedules/${userId}`),
  create: (userId: string, data: Record<string, unknown>) =>
    api.post(`/schedules/${userId}`, data),
  update: (userId: string, data: Record<string, unknown>) =>
    api.put(`/schedules/${userId}`, data),
  delete: (userId: string) => api.delete(`/schedules/${userId}`),
};

export const attendanceApi = {
  checkIn: (data: {
    latitude: number;
    longitude: number;
    faceVerified: boolean;
    livenessVerified: boolean;
  }) => api.post('/attendances/check-in', data),
  checkOut: (data: {
    latitude: number;
    longitude: number;
    faceVerified: boolean;
    livenessVerified: boolean;
  }) => api.post('/attendances/check-out', data),
  getMy: (params?: Record<string, unknown>) => api.get('/attendances/my', { params }),
  getTodayStatus: () => api.get('/attendances/today'),
  getMyStats: () => api.get('/attendances/stats'),
  getAll: (params?: Record<string, unknown>) => api.get('/attendances', { params }),
};

export const leaveApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/leaves', { params }),
  getMy: () => api.get('/leaves/my'),
  getById: (id: string) => api.get(`/leaves/${id}`),
  create: (data: { leaveType: string; startDate: string; endDate: string; reason?: string }) =>
    api.post('/leaves', data),
  updateStatus: (id: string, data: { status: string; rejectedReason?: string }) =>
    api.put(`/leaves/${id}/status`, data),
  delete: (id: string) => api.delete(`/leaves/${id}`),
};

export const holidayApi = {
  getAll: () => api.get('/holidays'),
  getById: (id: string) => api.get(`/holidays/${id}`),
  create: (data: { name: string; date: string; description?: string; isRecurring?: boolean }) =>
    api.post('/holidays', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/holidays/${id}`, data),
  delete: (id: string) => api.delete(`/holidays/${id}`),
};

export const reportApi = {
  daily: (params?: Record<string, unknown>) => api.get('/reports/daily', { params }),
  weekly: (params?: Record<string, unknown>) => api.get('/reports/weekly', { params }),
  monthly: (params?: Record<string, unknown>) => api.get('/reports/monthly', { params }),
  employee: (userId: string, params?: Record<string, unknown>) =>
    api.get(`/reports/employee/${userId}`, { params }),
  exportExcel: (params?: Record<string, unknown>) =>
    api.get('/reports/export/excel', { params, responseType: 'blob' }),
  exportPdf: (params?: Record<string, unknown>) =>
    api.get('/reports/export/pdf', { params, responseType: 'blob' }),
};

export const locationApi = {
  getAll: () => api.get('/locations'),
  getActive: () => api.get('/locations/active'),
  getById: (id: string) => api.get(`/locations/${id}`),
  create: (data: { name: string; latitude: number; longitude: number; radiusMeters?: number; departmentId?: string }) =>
    api.post('/locations', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/locations/${id}`, data),
  delete: (id: string) => api.delete(`/locations/${id}`),
};

export const faceApi = {
  verify: (data: { descriptor: number[]; image?: string }) =>
    api.post('/face/verify', data),
  register: (data: { descriptor: number[]; image?: string }) =>
    api.post('/face/register', data),
  detectLiveness: (data: { movementData?: number[][] }) =>
    api.post('/face/liveness', data),
  detect: (data: { hasFace?: boolean; confidence?: number }) =>
    api.post('/face/detect', data),
};

export const sheetsApi = {
  syncNow: () => api.post('/sheets/sync'),
  getStatus: () => api.get('/sheets/status'),
  updateConfig: (data: { spreadsheetId?: string; sheetName?: string; isActive?: boolean }) =>
    api.put('/sheets/config', data),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getPresentToday: () => api.get('/dashboard/present-today'),
  getAbsentToday: () => api.get('/dashboard/absent-today'),
  getCurrentlyWorking: () => api.get('/dashboard/currently-working'),
  getLateToday: () => api.get('/dashboard/late-today'),
  getAttendanceRate: () => api.get('/dashboard/attendance-rate'),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getAuditLogs: (params?: Record<string, unknown>) => api.get('/admin/audit-logs', { params }),
  bulkSyncSheets: () => api.post('/admin/bulk-sync-sheets'),
  seedSampleData: () => api.post('/admin/seed-sample-data'),
};

export default api;
