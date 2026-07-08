'use client';

import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';
import type { User } from '@/types';

const USER_UPDATED_EVENT = 'auth:user-updated';
const isLocalDevAuth = () =>
  process.env.NODE_ENV === 'development' &&
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

function notifyUserUpdated(user: User | null) {
  window.dispatchEvent(new CustomEvent<User | null>(USER_UPDATED_EVENT, { detail: user }));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      if (isLocalDevAuth()) {
        try {
          const data = await authApi.devLogin();
          localStorage.setItem('auth_token', data.token);
          setUser(data.user);
          notifyUserUpdated(data.user);
        } catch {
          localStorage.removeItem('auth_token');
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const handleUserUpdated = (event: Event) => {
      setUser((event as CustomEvent<User | null>).detail);
    };

    window.addEventListener(USER_UPDATED_EVENT, handleUserUpdated);
    return () => window.removeEventListener(USER_UPDATED_EVENT, handleUserUpdated);
  }, []);

  const googleLogin = async (credential: string) => {
    const data = await authApi.googleLogin(credential);
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    notifyUserUpdated(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      notifyUserUpdated(null);
    }
  };

  const updateProfile = async (name: string) => {
    const updated = await authApi.updateProfile(name);
    setUser(updated);
    notifyUserUpdated(updated);
    return updated;
  };

  const updateAvatar = async (avatar: File) => {
    const updated = await authApi.updateAvatar(avatar);
    setUser(updated);
    notifyUserUpdated(updated);
    return updated;
  };

  return { user, loading, googleLogin, logout, updateProfile, updateAvatar, refresh: loadUser };
}
