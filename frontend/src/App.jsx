// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import useWebSocket from './hooks/useWebSocket';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Agents from './pages/Agents';
import Rules from './pages/Rules';
import Settings from './pages/Settings';
import UsersPage from './pages/admin/UsersPage';
import { AuthProvider, useAuth } from './store/AuthContext';
import { injectAuthHooks } from './services/api';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  },
});

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/alerts': 'Alerts',
  '/agents': 'Agents',
  '/rules': 'Rules',
  '/settings': 'Settings',
  '/admin/users': 'User Management',
};

const PAGE_DESCRIPTIONS = {
  '/': 'Real-time security overview',
  '/alerts': 'Search, filter & investigate alerts',
  '/agents': 'Monitor connected endpoints',
  '/rules': 'Detection rules & frequencies',
  '/settings': 'Connection & notification config',
  '/admin/users': 'Manage RBAC and account status',
};

// Component to inject hooks since it needs to use hook functions inside
function AuthHooksInjector({ children }) {
  const auth = useAuth();
  
  useEffect(() => {
    injectAuthHooks(
      () => ({ accessToken: auth.accessToken }),
      auth.refreshAccessToken
    );
  }, [auth.accessToken, auth.refreshAccessToken]);

  return children;
}

function ProtectedLayout() {
  useWebSocket();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Dashboard';
  const description = PAGE_DESCRIPTIONS[location.pathname] || '';

  return (
    <div className="app-layout">
      <Sidebar currentPath={location.pathname} />
      <div className="main-content">
        <TopBar title={title} description={description} />
        <div className="page-content">
          <Routes>
            <Route element={<PrivateRoute requiredRole="viewer" />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route element={<PrivateRoute requiredRole="analyst" />}>
              <Route path="/rules" element={<Rules />} />
            </Route>

            <Route element={<PrivateRoute requiredRole="admin" />}>
              <Route path="/admin/users" element={<UsersPage />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthHooksInjector>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/*" element={<ProtectedLayout />} />
              </Routes>
            </BrowserRouter>
          </AuthHooksInjector>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
