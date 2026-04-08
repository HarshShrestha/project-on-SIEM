// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, Lock, User } from 'lucide-react';
import useStore from '../store/useStore';
import { login } from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { token, setAuth } = useStore();
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      setAuth(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      // In demo mode, accept admin/admin123
      if (username === 'admin' && password === 'admin123') {
        const demoToken = 'demo-jwt-token-' + Date.now();
        setAuth(demoToken, { username: 'admin', role: 'admin' });
        navigate('/', { replace: true });
      } else {
        setError(err.message || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div className="logo-icon" style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, var(--accent), #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={28} color="#0d1117" />
          </div>
        </div>
        <h1>SIEM Home Lab</h1>
        <p>Security Operations Center Dashboard</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8, fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Demo: admin / admin123
        </p>
      </div>
    </div>
  );
}
