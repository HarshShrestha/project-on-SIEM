// src/components/TopBar.jsx
import { Bell, Wifi, WifiOff, LogOut, Sun, Moon, Search, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import useStore from '../store/useStore';

export default function TopBar({ title, description }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth, liveAlertCount, resetAlertCount, wsConnected, theme, toggleTheme } = useStore();
  const [badgePulse, setBadgePulse] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (liveAlertCount > 0) {
      setBadgePulse(true);
      const timer = setTimeout(() => setBadgePulse(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [liveAlertCount]);

  // Refresh all data
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 1000);
  }, [queryClient]);

  // Bell click → navigate to alerts
  const handleBellClick = () => {
    resetAlertCount();
    navigate('/alerts');
  };

  // Connection dot → navigate to settings
  const handleConnectionClick = () => {
    navigate('/settings');
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <h1>{title}</h1>
          {description && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              {description}
            </span>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {/* Refresh data */}
        <button
          className="btn-ghost topbar-action"
          onClick={handleRefresh}
          title="Refresh all data"
          style={{ padding: 6, borderRadius: 6 }}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>

        {/* Connection status → Settings */}
        <div
          className="topbar-action"
          onClick={handleConnectionClick}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'all 0.2s' }}
          title="Connection settings"
        >
          {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span className={`connection-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
          <span>{wsConnected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Alert badge → Alerts page */}
        <div
          className="alert-badge topbar-action"
          onClick={handleBellClick}
          style={{ cursor: 'pointer', padding: '4px 6px', borderRadius: 6, transition: 'all 0.2s' }}
          title={liveAlertCount > 0 ? `${liveAlertCount} new alerts — click to view` : 'No new alerts'}
        >
          <Bell size={20} color={liveAlertCount > 0 ? 'var(--accent)' : 'var(--text-secondary)'} />
          {liveAlertCount > 0 && (
            <span className={`badge-count ${badgePulse ? 'pulse' : ''}`}>
              {liveAlertCount > 99 ? '99+' : liveAlertCount}
            </span>
          )}
        </div>

        {/* Theme toggle */}
        <button
          className="btn-ghost topbar-action"
          onClick={toggleTheme}
          style={{ padding: 6, borderRadius: 6 }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User section */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'all 0.2s' }}
          onClick={() => navigate('/settings')}
          title="Account settings"
          className="topbar-action"
        >
          <div className="user-avatar">
            {(user?.username || 'A')[0].toUpperCase()}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {user?.username || 'Admin'}
          </span>
        </div>

        {/* Logout */}
        <button
          className="btn-ghost topbar-action"
          onClick={handleLogout}
          style={{ padding: 6, borderRadius: 6 }}
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
