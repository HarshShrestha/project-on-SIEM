import React, { useEffect } from 'react';
import useStore from './useStore';
import api from '../services/api';

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
    const response = await api.post('/auth/refresh');
    // If the API rotated the token successfully
    store.setAuth(response.data.accessToken, store.user);
    return response.data.accessToken;
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
  const { setAuth, clearAuth, setLoading } = useStore();

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const response = await api.get('/auth/me');
        if (mounted) {
          // The interceptor might have called refresh internally.
          // By the time it gets here, the request was successful.
          // However, we need to know the new token if it was refreshed?
          // The interceptor doesn't mutate getState if we only passed functions.
          // But actually, we don't strictly need to do this manually if the browser gets the session.
          // We can just rely on the API.
          setAuth(response.data.accessToken || null, response.data);
        }
      } catch (err) {
        if (mounted) clearAuth();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUser();
    return () => { mounted = false; };
  }, [setAuth, clearAuth, setLoading]);

  return <>{children}</>;
};
