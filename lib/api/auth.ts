// Auth API - Backend endpoints only (no frontend handling)

import { apiRequest, setTokens, clearTokens, getRefreshToken, getAccessToken, setUserData, setOrganizationData } from './client';
import { API_CONFIG } from './config';
import type {
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RegisterRequest,
  SignupOrganizationRequest,
  SignupOrgAdminRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from './types';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>(API_CONFIG.endpoints.auth.login, {
    method: 'POST',
    body: data,
  });
  if (response.accessToken && response.refreshToken) {
    setTokens(response.accessToken, response.refreshToken);
  }
  if (response.user) {
    setUserData(response.user);
    if ((response.user as any).organization) {
      setOrganizationData((response.user as any).organization);
    }
  }
  return response;
}

export async function refreshToken(): Promise<{ accessToken: string }> {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) throw new Error('No refresh token available');
  const response = await apiRequest<{ accessToken: string }>(
    API_CONFIG.endpoints.auth.refresh,
    {
      method: 'POST',
      body: { refreshToken: refreshTokenValue } as RefreshRequest,
    }
  );
  if (response.accessToken) {
    setTokens(response.accessToken, refreshTokenValue);
  }
  return response;
}

export async function getMe(): Promise<unknown> {
  return apiRequest(API_CONFIG.endpoints.auth.me, { method: 'GET', requiresAuth: true });
}

export async function getRoles(): Promise<unknown> {
  return apiRequest(API_CONFIG.endpoints.auth.roles, { method: 'GET' });
}

export async function getAuthOrganizations(): Promise<unknown> {
  return apiRequest(API_CONFIG.endpoints.auth.organizations, { method: 'GET' });
}

export async function register(data: RegisterRequest): Promise<unknown> {
  return apiRequest(API_CONFIG.endpoints.auth.register, {
    method: 'POST',
    body: data,
  });
}

export async function signupMasterAdmin(data: { email: string; password: string }): Promise<unknown> {
  return apiRequest(API_CONFIG.endpoints.auth.signupMasterAdmin, {
    method: 'POST',
    body: data,
  });
}

export async function signupOrganization(data: SignupOrganizationRequest): Promise<unknown> {
  return apiRequest(API_CONFIG.endpoints.auth.signupOrganization, {
    method: 'POST',
    body: data,
  });
}

export async function signupOrgAdmin(data: SignupOrgAdminRequest): Promise<unknown> {
  return apiRequest(API_CONFIG.endpoints.auth.signupOrgAdmin, {
    method: 'POST',
    body: data,
  });
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<unknown> {
  return apiRequest(API_CONFIG.endpoints.auth.forgotPassword, {
    method: 'POST',
    body: data,
  });
}

export async function resetPassword(data: ResetPasswordRequest): Promise<unknown> {
  return apiRequest(API_CONFIG.endpoints.auth.resetPassword, {
    method: 'POST',
    body: data,
  });
}

export function logout(): void {
  clearTokens();
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  return !!token && token.trim() !== '';
}
