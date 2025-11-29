// Authentication API Functions

import { apiRequest, setTokens, clearTokens, getRefreshToken, getAccessToken, setUserData, setOrganizationData } from './client';
import { API_CONFIG } from './config';
import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from './types';

/**
 * Signup - Create organization and admin user
 */
export async function signup(data: SignupRequest): Promise<SignupResponse> {
  const response = await apiRequest<SignupResponse>(
    API_CONFIG.endpoints.auth.signup,
    {
      method: 'POST',
      body: data,
    }
  );
  return response;
}

/**
 * Login - Get access token and refresh token
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>(
    API_CONFIG.endpoints.auth.login,
    {
      method: 'POST',
      body: credentials,
      formData: true, // Login uses form-urlencoded
    }
  );
  
  // Auto-store tokens
  if (response.access_token && response.refresh_token) {
    setTokens(response.access_token, response.refresh_token);
  }
  
  // Store user and organization data
  if (response.user) {
    setUserData(response.user);
  }
  if (response.organization) {
    setOrganizationData(response.organization);
  }
  
  return response;
}

/**
 * Refresh Token - Get new access token
 */
export async function refreshToken(): Promise<RefreshTokenResponse> {
  const refreshTokenValue = getRefreshToken();
  
  if (!refreshTokenValue) {
    throw new Error('No refresh token available');
  }

  const response = await apiRequest<RefreshTokenResponse>(
    API_CONFIG.endpoints.auth.refresh,
    {
      method: 'POST',
      body: {
        refresh_token: refreshTokenValue,
      },
    }
  );
  
  // Update stored access token
  if (response.access_token && typeof window !== 'undefined') {
    localStorage.setItem('access_token', response.access_token);
  }
  
  return response;
}

/**
 * Logout - Clear stored tokens and user data
 */
export function logout(): void {
  clearTokens();
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

