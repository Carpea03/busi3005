'use client';

import { useCallback, useEffect, useState } from 'react';
import { ADMIN_PASSWORD_STORAGE_KEY } from '../../lib/quiz-core';

export default function useAdminPassword() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(true);

  const verifyPassword = useCallback(async (candidate, { persist } = {}) => {
    if (!candidate) {
      setAuthenticated(false);
      setVerifying(false);
      return false;
    }

    setVerifying(true);
    setAuthError('');

    try {
      const response = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: candidate }),
      });

      if (!response.ok) {
        throw new Error('Incorrect password. Please try again.');
      }

      setPassword(candidate);
      setAuthenticated(true);
      if (persist) {
        localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, candidate);
      }
      return true;
    } catch (error) {
      setAuthenticated(false);
      setAuthError(error.message || 'Connection error.');
      localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
      return false;
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
      if (!stored) {
        setVerifying(false);
        return;
      }

      setPassword(stored);
      void verifyPassword(stored);
    } catch {
      localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
      setVerifying(false);
    }
  }, [verifyPassword]);

  const login = useCallback(async () => verifyPassword(password, { persist: true }), [password, verifyPassword]);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
    setPassword('');
    setAuthenticated(false);
    setAuthError('');
  }, []);

  const getAdminHeaders = useCallback((candidate) => ({ 'x-admin-password': candidate || password }), [password]);

  return {
    password,
    setPassword,
    authenticated,
    authError,
    verifying,
    login,
    logout,
    getAdminHeaders,
  };
}