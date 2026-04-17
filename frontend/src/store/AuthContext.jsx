import { useEffect } from 'react';
import useStore from './useStore';
import api from '../services/api';

let hydrationRefreshPromise = null;

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
    const response = await api.post('/auth/login', { username, password });
    store.setAuth(response.data.accessToken, response.data.user);
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
    const accessToken = await refreshAccessTokenSingleFlight();
    // If the API rotated the token successfully
    store.setAuth(accessToken, store.user);
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
          setAuth(accessToken, user);
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
