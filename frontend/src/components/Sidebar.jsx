// src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Server, BookOpen, Settings,
  ChevronLeft, ChevronRight, Shield, Activity
} from 'lucide-react';
import useStore from '../store/useStore';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview & live feed' },
  { path: '/alerts', icon: AlertTriangle, label: 'Alerts', description: 'Investigate threats', hasBadge: true },
  { path: '/agents', icon: Server, label: 'Agents', description: 'Endpoint status' },
  { path: '/rules', icon: BookOpen, label: 'Rules', description: 'Detection analytics' },
  { path: '/settings', icon: Settings, label: 'Settings', description: 'Configuration' },
];

export default function Sidebar({ currentPath }) {
  const { sidebarCollapsed, toggleSidebar, liveAlertCount, resetAlertCount } = useStore();
  const navigate = useNavigate();

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={toggleSidebar} title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Clickable logo — navigates home */}
      <div className="sidebar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <div className="logo-icon">
          <Shield size={18} color="#0d1117" />
        </div>
        <span className="logo-text">SIEM Lab</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              // Reset alert count when navigating to alerts page
              if (item.path === '/alerts') resetAlertCount();
            }}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon className="nav-icon" size={20} />
            <span className="nav-label">{item.label}</span>

            {/* Live badge on Alerts nav item */}
            {item.hasBadge && liveAlertCount > 0 && (
              <span className="nav-badge">
                {liveAlertCount > 99 ? '99+' : liveAlertCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status footer */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border-default)' }}>
        <div
          className="nav-item"
          style={{ fontSize: '0.8rem', cursor: 'pointer' }}
          onClick={() => navigate('/settings')}
          title="System status"
        >
          <Activity size={16} color="var(--accent)" />
          <span className="sidebar-footer-text" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Demo Mode
          </span>
        </div>
      </div>
    </aside>
  );
}
