// src/pages/Settings.jsx
import { useState } from 'react';
import { Save, RefreshCw, Bell, BellOff, Copy, Check } from 'lucide-react';
import useStore from '../store/useStore';

export default function Settings() {
  const { token, settings, updateSettings, notificationsEnabled, toggleNotifications } = useStore();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    wazuhHost: settings.wazuhHost || 'https://localhost',
    wazuhPort: settings.wazuhPort || '55000',
    wazuhUser: settings.wazuhUser || 'wazuh-wui',
    wazuhPass: settings.wazuhPass || '',
  });

  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(token || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNotificationToggle = () => {
    if (!notificationsEnabled && 'Notification' in window) {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') toggleNotifications();
      });
    } else {
      toggleNotifications();
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640 }}>
      {/* Connection config */}
      <div className="chart-container" style={{ marginBottom: 24 }}>
        <div className="chart-header" style={{ marginBottom: 20 }}>
          <h3>Wazuh Connection</h3>
        </div>

        <div className="form-group">
          <label className="form-label">Host</label>
          <input
            type="text"
            className="form-input"
            value={form.wazuhHost}
            onChange={(e) => setForm({ ...form, wazuhHost: e.target.value })}
            placeholder="https://localhost"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Port</label>
          <input
            type="text"
            className="form-input"
            value={form.wazuhPort}
            onChange={(e) => setForm({ ...form, wazuhPort: e.target.value })}
            placeholder="55000"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            className="form-input"
            value={form.wazuhUser}
            onChange={(e) => setForm({ ...form, wazuhUser: e.target.value })}
            placeholder="wazuh-wui"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            value={form.wazuhPass}
            onChange={(e) => setForm({ ...form, wazuhPass: e.target.value })}
            placeholder="••••••••"
          />
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Settings</>}
        </button>
      </div>

      {/* JWT Token */}
      <div className="chart-container" style={{ marginBottom: 24 }}>
        <div className="chart-header" style={{ marginBottom: 16 }}>
          <h3>Authentication Token</h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            value={token || 'No token'}
            readOnly
            style={{ fontFamily: 'monospace', fontSize: '0.8rem', flex: 1 }}
          />
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Token expires in 1 hour from login. Click refresh to get a new token.
        </div>
      </div>

      {/* Notifications */}
      <div className="chart-container">
        <div className="chart-header" style={{ marginBottom: 16 }}>
          <h3>Notifications</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-muted)' }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Browser Notifications</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Receive alerts for critical security events
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {notificationsEnabled ? <Bell size={18} color="var(--accent)" /> : <BellOff size={18} color="var(--text-muted)" />}
            <div
              className={`toggle ${notificationsEnabled ? 'active' : ''}`}
              onClick={handleNotificationToggle}
            />
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Critical alerts (level 12+) will trigger a desktop notification immediately.
        </div>
      </div>
    </div>
  );
}
