import axios from 'axios';
import {
  Competitor,
  CompetitorOverviewCard,
  ProductListResponse,
  PriceHistoryPoint,
  PriceHistoryRecord,
  NewArrivalTrendPoint,
  ScrapeLog
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor for API calls
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

// Response interceptor for handling 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }).then(res => res.data),
  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

export const competitorService = {
  getCompetitors: () => api.get<Competitor[]>('/competitors').then(res => res.data),
  getOverview: () => api.get<CompetitorOverviewCard[]>('/dashboard/overview').then(res => res.data),
  triggerScrape: (name?: string) => api.post('/scrape/trigger', null, { params: { competitor_name: name } }).then(res => res.data),
  stopScrape: () => api.post('/scrape/stop').then(res => res.data),
  createCompetitor: (data: any) => api.post<Competitor>('/competitors', data).then(res => res.data),
  updateCompetitor: (id: number, data: any) => api.put<Competitor>(`/competitors/${id}`, data).then(res => res.data),
  deleteCompetitor: (id: number) => api.delete(`/competitors/${id}`).then(res => res.data),
};

export const productService = {
  listProducts: (params: {
    competitor_id?: number;
    category?: string;
    min_price?: number;
    max_price?: number;
    is_bestseller?: boolean;
    is_new_launch?: boolean;
    page?: number;
    page_size?: number;
    date?: string;
    search?: string;
    sort_by?: string;
    sort_dir?: string;
  }) => api.get<ProductListResponse>('/products', { params }).then(res => res.data),
};

export const analyticsService = {
  getPriceTrend: (params: {
    competitor_id: number;
    days?: number;
    is_new_launch?: boolean;
  }) => api.get<PriceHistoryPoint[]>('/analytics/price-trend', { params }).then(res => res.data),
  getProductHistory: (sku: string) => api.get<PriceHistoryRecord[]>(`/analytics/product/${sku}/history`).then(res => res.data),
  getProductSizeHistory: (source: string, id: number) => api.get<any[]>(`/analytics/product/${source}/${id}/size-history`).then(res => res.data),
  getNewArrivalsTrend: (params: {
    competitor_id?: number;
    days?: number;
    is_new_launch?: boolean;
  }) => api.get<NewArrivalTrendPoint[]>('/analytics/new-arrivals-trend', { params }).then(res => res.data),
};

export const logService = {
  getScrapeLogs: (competitor_id?: number, limit = 20) =>
    api.get<ScrapeLog[]>('/logs/scrape', { params: { competitor_id, limit } }).then(res => res.data),
};

export const userService = {
  getUsers: () => api.get<any[]>('/users').then(res => res.data),
  createUser: (data: any) => api.post<any>('/users', data).then(res => res.data),
  updateUser: (id: number, data: any) => api.put<any>(`/users/${id}`, data).then(res => res.data),
  deleteUser: (id: number) => api.delete(`/users/${id}`).then(res => res.data),
};

export const roleService = {
  getRoles: () => api.get<any[]>('/roles').then(res => res.data),
  createRole: (data: any) => api.post<any>('/roles', data).then(res => res.data),
};

export const employeeService = {
  getEmployees: () => api.get<any[]>('/employees').then(res => res.data),
  createEmployee: (data: any) => api.post<any>('/employees', data).then(res => res.data),
  updateEmployee: (id: number, data: any) => api.put<any>(`/employees/${id}`, data).then(res => res.data),
  deleteEmployee: (id: number) => api.delete(`/employees/${id}`).then(res => res.data),
};

export default api;
