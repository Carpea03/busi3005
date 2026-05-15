'use client';

import { useCallback, useEffect, useState } from 'react';

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function useAdminPassword() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(true);

  const verifySession = useCallback(async () => {
    setVerifying(true);

    try {
      const response = await fetch('/api/verify-admin', {
        cache: 'no-store',
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        throw new Error(data.error || 'Unable to verify admin session.');
      }

      setAuthenticated(Boolean(data.authenticated));
      setAuthError('');
      return Boolean(data.authenticated);
    } catch (error) {
      setAuthenticated(false);
      setAuthError(error.message || 'Connection error.');
      return false;
    } finally {
      setVerifying(false);
    }
  }, []);

  const login = useCallback(async () => {
    if (!password) {
      setAuthenticated(false);
      setAuthError('Enter the admin password.');
      return false;
    }

    setVerifying(true);
    setAuthError('');

    try {
      const response = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        throw new Error(data.error || 'Incorrect password. Please try again.');
      }

      setAuthenticated(true);
      setPassword('');
      return true;
    } catch (error) {
      setAuthenticated(false);
      setAuthError(error.message || 'Connection error.');
      return false;
    } finally {
      setVerifying(false);
    }
  }, [password]);

  useEffect(() => {
    void verifySession();
  }, [verifySession]);

  const logout = useCallback(() => {
    void fetch('/api/verify-admin', { method: 'DELETE' }).finally(() => {
      setPassword('');
      setAuthenticated(false);
      setAuthError('');
      setVerifying(false);
    });
  }, []);

  return {
    password,
    setPassword,
    authenticated,
    authError,
    verifying,
    login,
    logout,
    verifySession,
  };
}