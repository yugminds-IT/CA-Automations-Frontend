// React Hooks for API Integration

'use client';

import { useState, useCallback } from 'react';
import {
  login as loginApi,
  signupOrganization as signupOrganizationApi,
  createOrganization,
  createEmployee,
  healthCheck,
  isAuthenticated,
} from './index';
import type { LoginRequest, SignupOrganizationRequest } from './types';
import { ApiError } from './client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | void>;
  reset: () => void;
}

function useApi<T>(apiFunction: (...args: unknown[]) => Promise<T>): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: unknown[]) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await apiFunction(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError ? err.detail : 'An error occurred';
        setState({ data: null, loading: false, error: errorMessage });
        throw err;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export function useLogin() {
  return useApi<Awaited<ReturnType<typeof loginApi>>>(loginApi as (data: LoginRequest) => Promise<unknown>);
}

export function useSignupOrganization() {
  return useApi<Awaited<ReturnType<typeof signupOrganizationApi>>>(
    signupOrganizationApi as (data: SignupOrganizationRequest) => Promise<unknown>
  );
}

export function useCreateOrganization() {
  return useApi<Awaited<ReturnType<typeof createOrganization>>>(createOrganization);
}

export function useCreateEmployee() {
  return useApi<Awaited<ReturnType<typeof createEmployee>>>(createEmployee);
}

export function useHealthCheck() {
  return useApi<Awaited<ReturnType<typeof healthCheck>>>(healthCheck);
}

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  const checkAuth = useCallback(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  const handleLogout = useCallback(async () => {
    const { logout } = await import('./auth');
    logout();
    setAuthenticated(false);
  }, []);

  return {
    authenticated,
    checkAuth,
    logout: handleLogout,
  };
}
