import { useEffect } from 'react';
import useStore from './useStore';
import api, { findHostedDemoUser, shouldUseHostedDemoMode } from '../services/api';

let hydrationRefreshPromise = null;

const DEMO_USERS = {
  admin: { password: 'admin123', role: 'admin', email: 'admin@siem.local' },
  analyst: { password: 'analyst123', role: 'analyst', email: 'analyst@siem.local' },
  viewer: { password: 'viewer123', role: 'viewer', email: 'viewer@siem.local' },
};

const createDemoAuthError = (message) => {
  const error = new Error(message);
  error.response = { status: 401, data: { error: message } };
  return error;
};

const refreshAccessTokenSingleFlight = async () => {
  if (!hydrationRefreshPromise) {
    hydrationRefreshPromise = api
      .post('/auth/refresh')
      .then((response) => response.data.accessToken)
      .finally(() => {
        hydrationRefreshPromise = null;
      });
  }

  return hydrationRefreshPromise;
};

export const useAuth = () => {
  const store = useStore();

  const login = async (username, password) => {
    if (shouldUseHostedDemoMode()) {
      const normalizedUsername = String(username || '').trim().toLowerCase();
      const demoUser = findHostedDemoUser(normalizedUsername) || DEMO_USERS[normalizedUsername];

      if (demoUser && password === demoUser.password) {
        store.setAuth(`demo-${normalizedUsername}`, {
          username: normalizedUsername,
          email: demoUser.email,
          role: demoUser.role,
        }, 'demo');
        return;
      }

      throw createDemoAuthError('Demo login failed. Use admin/admin123, analyst/analyst123, or viewer/viewer123.');
    }

    try {
      const response = await api.post('/auth/login', { username, password });
      store.setAuth(response.data.accessToken, response.data.user, 'real');
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error', e);
    }
    store.clearAuth();
  };

  const refreshAccessToken = async () => {
    if (store.authMode === 'demo') {
      return store.token;
    }

    const accessToken = await refreshAccessTokenSingleFlight();
    // If the API rotated the token successfully
    store.setAuth(accessToken, store.user, 'real');
    return accessToken;
  };

  return {
    accessToken: store.token,
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    login,
    logout,
    refreshAccessToken
  };
};

export const AuthProvider = ({ children }) => {
  const { setAuth, clearAuth, setLoading, user } = useStore();

  useEffect(() => {
    if (shouldUseHostedDemoMode() && !user) {
      setLoading(false);
      return;
    }

    if (useStore.getState().authMode === 'demo') {
      setLoading(false);
      return;
    }

    // Only attempt silent token refresh if we have a stored user session.
    // isLoading starts `true` in the store when a session exists, so PrivateRoute
    // will show a spinner until this resolves.
    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const hydrate = async () => {
      setLoading(true);
      try {
        const accessToken = await refreshAccessTokenSingleFlight();
        if (mounted) {
          // Got a fresh access token — mark fully authenticated
          setAuth(accessToken, user, 'real');
        }
      } catch {
        // Refresh cookie gone/expired — clear stale localStorage entry
        if (mounted) clearAuth();
      }
    };

    hydrate();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
};
