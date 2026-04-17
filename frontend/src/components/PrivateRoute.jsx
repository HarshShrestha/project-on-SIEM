import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

const roleHierarchy = { viewer: 0, analyst: 1, admin: 2 };

const PrivateRoute = ({ requiredRole = 'viewer' }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1a1a1a', color: '#fff' }}>
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4d4f', background: '#1a1a1a', height: '100vh' }}>
        <h2>Access Denied</h2>
        <p>You do not have the required permissions ({requiredRole}) to view this page.</p>
        <p>Current role: {user.role}</p>
      </div>
    );
  }

  return <Outlet />;
};

export default PrivateRoute;
