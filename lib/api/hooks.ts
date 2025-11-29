// React Hooks for API Integration (Optional - for easier React integration)

'use client';

import { useState, useCallback } from 'react';
import { 
  signup as signupApi, 
  login as loginApi, 
  refreshToken as refreshTokenApi,
  logout as logoutApi,
  createOrganization,
  createUser,
  healthCheck,
  isAuthenticated,
} from './index';
import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  CreateOrganizationRequest,
  CreateUserRequest,
} from './types';
import { ApiError } from './client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | void>;
  reset: () => void;
}

/**
 * Generic API hook
 */
function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]) => {
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

/**
 * Signup Hook
 */
export function useSignup() {
  return useApi<SignupResponse>(signupApi);
}

/**
 * Login Hook
 */
export function useLogin() {
  return useApi<LoginResponse>(loginApi);
}

/**
 * Refresh Token Hook
 */
export function useRefreshToken() {
  return useApi<Awaited<ReturnType<typeof refreshTokenApi>>>(refreshTokenApi);
}

/**
 * Create Organization Hook
 */
export function useCreateOrganization() {
  return useApi<Awaited<ReturnType<typeof createOrganization>>>(createOrganization);
}

/**
 * Create User Hook
 */
export function useCreateUser() {
  return useApi<Awaited<ReturnType<typeof createUser>>>(createUser);
}

/**
 * Health Check Hook
 */
export function useHealthCheck() {
  return useApi<Awaited<ReturnType<typeof healthCheck>>>(healthCheck);
}

/**
 * Auth status hook
 */
export function useAuth() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  const checkAuth = useCallback(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  const handleLogout = useCallback(() => {
    logoutApi();
    setAuthenticated(false);
  }, []);

  return {
    authenticated,
    checkAuth,
    logout: handleLogout,
  };
}

