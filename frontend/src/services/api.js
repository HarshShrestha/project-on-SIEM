import axios from 'axios';
import mockData from './mockData';

let getTokens = () => ({ accessToken: null });
let refreshInterceptorFn = null;

export const injectAuthHooks = (getTokensFn, refreshFn) => {
  getTokens = getTokensFn;
  refreshInterceptorFn = refreshFn;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
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
          const newAccessToken = await refreshInterceptorFn();
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
    return mockData.generateMockAlerts(50);
  }
};

export const fetchAgents = async () => {
  try {
    const res = await api.get('/agents');
    return res.data;
  } catch (e) {
    console.warn("Backend /agents unavailable, using mock data...");
    return mockData.generateMockAgents();
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
    return mockData.generateMockRules();
  }
};

export const fetchAgentLogs = async (agentId) => {
  try {
    const res = await api.get(`/agent/${agentId}/logs`);
    return res.data;
  } catch (e) {
    console.warn(`Backend /agent/${agentId}/logs unavailable, using mock data...`);
    return mockData.generateMockAgentLogs(agentId);
  }
};
