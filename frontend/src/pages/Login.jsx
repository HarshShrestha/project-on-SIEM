import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import './Login.css';

const getSafeRedirectPath = (path) => {
  if (!path || path === '/login' || path === '/register' || path === '/dashboard') {
    return '/';
  }

  return path;
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      await login(username, password);
      const from = getSafeRedirectPath(location.state?.from?.pathname);
      navigate(from, { replace: true });
    } catch (err) {
      if (!err.response) {
        setErrorMsg('Cannot reach API server. Start backend on port 3001 and try again.');
      } else if (err.response?.status === 423) {
        setErrorMsg(err.response.data.error || 'Account locked. Try again later.');
      } else if (err.response?.status === 401) {
        setErrorMsg('Invalid credentials');
      } else if (err.response?.status >= 500) {
        setErrorMsg(`Backend is unavailable (HTTP ${err.response.status}). Check API/nginx deployment logs.`);
      } else {
        setErrorMsg(err.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated && !isLoading) {
    const from = getSafeRedirectPath(location.state?.from?.pathname);
    return <Navigate to={from} replace />;
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#121212', color: '#fff' }}>
        <span className="spinner"></span>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">SIEM Home Lab</h2>
        <p className="login-subtitle">Sign in to your account</p>

        {errorMsg && <div className="login-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input 
              id="username"
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              disabled={isSubmitting}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-input">
              <input 
                id="password"
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                disabled={isSubmitting}
              />
              <button 
                type="button" 
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="forgot-password"
              onClick={() => navigate('/register')}
            >
              Need an account? Sign up
            </button>
          </div>

          <button type="submit" className="login-btn" disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner"></span> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
