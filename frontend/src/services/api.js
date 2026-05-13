import axios from 'axios';
import mockData from './mockData';

export const isHostedFrontend = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
export const hasConfiguredApi = Boolean(import.meta.env.VITE_API_URL);
export const shouldUseHostedDemoMode = () => isHostedFrontend && !hasConfiguredApi;

const DEMO_USERS_KEY = 'siem_demo_users';
const DEFAULT_DEMO_USERS = {
  admin: { password: 'admin123', role: 'admin', email: 'admin@siem.local' },
  analyst: { password: 'analyst123', role: 'analyst', email: 'analyst@siem.local' },
  viewer: { password: 'viewer123', role: 'viewer', email: 'viewer@siem.local' },
};

const safeLocalStorageRead = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

export const getHostedDemoUsers = () => ({
  ...DEFAULT_DEMO_USERS,
  ...safeLocalStorageRead(DEMO_USERS_KEY, {}),
});

export const registerHostedDemoUser = ({ username, email, password }) => {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const demoUsers = getHostedDemoUsers();

  if (!normalizedUsername || !normalizedEmail || !password) {
    throw new Error('Missing demo signup fields');
  }

  if (demoUsers[normalizedUsername] || Object.values(demoUsers).some((user) => user.email.toLowerCase() === normalizedEmail)) {
    const error = new Error('Username or email already exists');
    error.status = 409;
    throw error;
  }

  demoUsers[normalizedUsername] = {
    password,
    role: 'viewer',
    email: normalizedEmail,
  };

  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(demoUsers));
  return {
    username: normalizedUsername,
    email: normalizedEmail,
    role: 'viewer',
  };
};

export const findHostedDemoUser = (username) => getHostedDemoUsers()[String(username || '').trim().toLowerCase()] || null;

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
    const payload = res?.data || {};
    return {
      alerts: Array.isArray(payload.alerts) ? payload.alerts : [],
      total: Number.isFinite(payload.total) ? payload.total : 0,
      page: Number.isFinite(payload.page) ? payload.page : 1,
      pages: Number.isFinite(payload.pages) ? payload.pages : 1,
    };
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
    const payload = res?.data || {};
    return {
      agents: Array.isArray(payload.agents) ? payload.agents : [],
    };
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
