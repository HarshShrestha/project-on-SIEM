// src/store/useStore.js
import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Auth
  token: null,
  user: JSON.parse(localStorage.getItem('siem_user') || 'null'),
  isAuthenticated: !!localStorage.getItem('siem_user'),
  isLoading: false, // Changed to false to prevent initial spinner flashes!
  
  setAuth: (token, user) => {
    localStorage.setItem('siem_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true, isLoading: false });
  },
  clearAuth: () => {
    localStorage.removeItem('siem_user');
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
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
