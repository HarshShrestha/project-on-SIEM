// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import useStore from './store/useStore';
import useWebSocket from './hooks/useWebSocket';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Agents from './pages/Agents';
import Rules from './pages/Rules';
import Settings from './pages/Settings';

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
};

const PAGE_DESCRIPTIONS = {
  '/': 'Real-time security overview',
  '/alerts': 'Search, filter & investigate alerts',
  '/agents': 'Monitor connected endpoints',
  '/rules': 'Detection rules & frequencies',
  '/settings': 'Connection & notification config',
};

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
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function AuthGuard({ children }) {
  const { token } = useStore();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <ProtectedLayout />
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
