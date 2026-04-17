import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';
import './Login.css'; // Reusing the same CSS

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#121212', color: '#fff' }}>
        <span className="spinner"></span>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      await api.post('/auth/register', { username, email, password });
      navigate('/login', { replace: true });
    } catch (err) {
      if (err.response?.status === 409) {
        setErrorMsg('Username or email already exists');
      } else if (err.response?.data?.issues) {
        setErrorMsg(err.response.data.issues[0]?.message || 'Validation failed');
      } else {
        setErrorMsg(err.response?.data?.error || 'Failed to register');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">SIEM Home Lab</h2>
        <p className="login-subtitle">Create a new viewer account</p>

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
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
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
            <small style={{ color: '#888', display: 'block', marginTop: '0.5rem', fontSize: '0.75rem' }}>
              Min 8 chars, 1 uppercase, 1 number
            </small>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="forgot-password"
              onClick={() => navigate('/login')}
            >
              Already have an account? Sign in
            </button>
          </div>

          <button type="submit" className="login-btn" disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner"></span> : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
