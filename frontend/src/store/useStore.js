// src/store/useStore.js
import { create } from 'zustand';

const isHostedFrontend = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
const hasConfiguredApi = Boolean(import.meta.env.VITE_API_URL);
const defaultAuthMode = isHostedFrontend && !hasConfiguredApi ? 'demo' : 'real';

const useStore = create((set, get) => ({
  // Auth
  // token is always null on page load; isAuthenticated is only true when a real
  // in-memory access token exists. localStorage stores user profile for display only.
  token: null,
  user: JSON.parse(localStorage.getItem('siem_user') || 'null'),
  authMode: localStorage.getItem('siem_auth_mode') || defaultAuthMode,
  isAuthenticated: false, // Always starts false; set to true only after a valid token is obtained
  isLoading: !!localStorage.getItem('siem_user'), // Show spinner only if we have a stored session to restore

  setAuth: (token, user, authMode = 'real') => {
    if (user) localStorage.setItem('siem_user', JSON.stringify(user));
    localStorage.setItem('siem_auth_mode', authMode);
    set({ token, user: user ?? JSON.parse(localStorage.getItem('siem_user') || 'null'), authMode, isAuthenticated: !!token, isLoading: false });
  },
  clearAuth: () => {
    localStorage.removeItem('siem_user');
    localStorage.removeItem('siem_auth_mode');
    set({ token: null, user: null, authMode: 'real', isAuthenticated: false, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Theme
  theme: localStorage.getItem('siem_theme') || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('siem_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('siem_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    set({ theme: next });
  },

  // Live alert count
  liveAlertCount: 0,
  incrementAlertCount: (n = 1) => set((s) => ({ liveAlertCount: s.liveAlertCount + n })),
  resetAlertCount: () => set({ liveAlertCount: 0 }),

  // WebSocket connection status
  wsConnected: false,
  setWsConnected: (val) => set({ wsConnected: val }),

  // Live alerts buffer (for dashboard feed)
  liveAlerts: [],
  addLiveAlerts: (alerts) =>
    set((s) => ({
      liveAlerts: [...alerts, ...s.liveAlerts].slice(0, 100),
    })),

  // Filters
  alertFilters: {
    search: '',
    level: '',
    agent_id: '',
    from: '',
    to: '',
    page: 1,
    limit: 50,
  },
  setAlertFilters: (filters) =>
    set((s) => ({
      alertFilters: { ...s.alertFilters, ...filters },
    })),
  resetAlertFilters: () =>
    set({
      alertFilters: { search: '', level: '', agent_id: '', from: '', to: '', page: 1, limit: 50 },
    }),

  // Settings
  settings: JSON.parse(localStorage.getItem('siem_settings') || '{}'),
  updateSettings: (newSettings) => {
    const merged = { ...get().settings, ...newSettings };
    localStorage.setItem('siem_settings', JSON.stringify(merged));
    set({ settings: merged });
  },

  // Notifications
  notificationsEnabled: localStorage.getItem('siem_notifications') === 'true',
  toggleNotifications: () => {
    const next = !get().notificationsEnabled;
    localStorage.setItem('siem_notifications', String(next));
    set({ notificationsEnabled: next });
  },
}));

export default useStore;
