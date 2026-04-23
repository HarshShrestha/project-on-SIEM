import axios from 'axios';
import mockData from './mockData';

let getTokens = () => ({ accessToken: null });
let refreshInterceptorFn = null;
let refreshRequestPromise = null;

const refreshAccessTokenOnce = async () => {
  if (!refreshInterceptorFn) {
    throw new Error('Refresh interceptor is not initialized');
  }

  if (!refreshRequestPromise) {
    refreshRequestPromise = refreshInterceptorFn().finally(() => {
      refreshRequestPromise = null;
    });
  }

  return refreshRequestPromise;
};

export const injectAuthHooks = (getTokensFn, refreshFn) => {
  getTokens = getTokensFn;
  refreshInterceptorFn = refreshFn;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true // Extremely important to let cookie pass through for refresh
});

api.interceptors.request.use((config) => {
  const { accessToken } = getTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
}, Promise.reject);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if it's 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Prevent infinite loop if the failure was on /auth/refresh
      if (originalRequest.url.includes('/auth/refresh')) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      if (refreshInterceptorFn) {
        try {
          const newAccessToken = await refreshAccessTokenOnce();
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

export const fetchAlerts = async (params) => {
  try {
    const res = await api.get('/alerts', { params });
    return res.data;
  } catch (e) {
    console.warn("Backend /alerts unavailable, using mock data...");
    const page = Number(params?.page) || 1;
    const limit = Math.min(Number(params?.limit) || 50, 500);
    const alerts = mockData.generateMockAlerts(limit);
    return {
      alerts,
      total: alerts.length,
      page,
      pages: 1,
    };
  }
};

export const fetchAgents = async () => {
  try {
    const res = await api.get('/agents');
    return res.data;
  } catch (e) {
    console.warn("Backend /agents unavailable, using mock data...");
    return { agents: mockData.generateMockAgents() };
  }
};

export const fetchStats = async (range) => {
  try {
    const res = await api.get('/stats', { params: { range } });
    return res.data;
  } catch (e) {
    console.warn("Backend /stats unavailable, using mock data...");
    return mockData.generateMockStats(range);
  }
};

export const fetchRules = async () => {
  try {
    const res = await api.get('/rules');
    return res.data;
  } catch (e) {
    console.warn("Backend /rules unavailable, using mock data...");
    return { rules: mockData.generateMockRules() };
  }
};

export const fetchAgentLogs = async (agentId) => {
  try {
    const res = await api.get(`/agent/${agentId}/logs`);
    return res.data;
  } catch (e) {
    console.warn(`Backend /agent/${agentId}/logs unavailable, using mock data...`);
    return { logs: mockData.generateMockAgentLogs(agentId) };
  }
};
