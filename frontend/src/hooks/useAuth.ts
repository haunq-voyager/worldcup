'use client';

import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';
import type { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
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

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name: string, email: string, password: string, password_confirmation: string) => {
    const data = await authApi.register({ name, email, password, password_confirmation });
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  const updateProfile = async (name: string) => {
    const updated = await authApi.updateProfile(name);
    setUser(updated);
    return updated;
  };

  return { user, loading, login, register, logout, updateProfile, refresh: loadUser };
}
