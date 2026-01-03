// Master Admin Authentication API Functions

import { apiRequest, setTokens, clearTokens, getRefreshToken, getAccessToken, setUserData, setOrganizationData, setTokenExpiration } from './client';
import { setupAutoLogoutTimer } from './auth';
import { API_CONFIG } from './config';
import type {
  MasterAdminSignupRequest,
  MasterAdminSignupResponse,
  MasterAdminLoginRequest,
  MasterAdminLoginResponse,
  MasterAdminRefreshTokenRequest,
  MasterAdminRefreshTokenResponse,
} from './types';

/**
 * Master Admin Signup - Create master admin user
 */
export async function masterAdminSignup(data: MasterAdminSignupRequest): Promise<MasterAdminSignupResponse> {
  const response = await apiRequest<MasterAdminSignupResponse>(
    API_CONFIG.endpoints.masterAdmin.auth.signup,
    {
      method: 'POST',
      body: data,
    }
  );
  return response;
}

/**
 * Master Admin Login - Get access token and refresh token
 */
export async function masterAdminLogin(credentials: MasterAdminLoginRequest): Promise<MasterAdminLoginResponse> {
  // Validate credentials before making request
  if (!credentials.username || !credentials.password) {
    throw new Error('Email and password are required');
  }

  if (credentials.username.trim() === '' || credentials.password.trim() === '') {
    throw new Error('Email and password cannot be empty');
  }

  const response = await apiRequest<MasterAdminLoginResponse>(
    API_CONFIG.endpoints.masterAdmin.auth.login,
    {
      method: 'POST',
      body: credentials,
      formData: true, // Login uses form-urlencoded
    }
  );
  
  // Validate that we received tokens
  if (!response.access_token || !response.refresh_token) {
    clearTokens();
    throw new Error('Login failed: Invalid response from server. Access token or refresh token missing.');
  }

  // Validate token format
  if (typeof response.access_token !== 'string' || response.access_token.trim() === '') {
    clearTokens();
    throw new Error('Login failed: Invalid access token received.');
  }

  if (typeof response.refresh_token !== 'string' || response.refresh_token.trim() === '') {
    clearTokens();
    throw new Error('Login failed: Invalid refresh token received.');
  }
  
  // Auto-store tokens only after validation
  setTokens(response.access_token, response.refresh_token);
  
  // Store token expiration time and set auto-logout timer
  if (response.expires_in) {
    setTokenExpiration(response.expires_in);
    setupAutoLogoutTimer(response.expires_in);
  }
  
  // Store user and organization data
  if (response.user) {
    // If role is at top level, merge it into user object
    const userData = { ...response.user };
    if (response.role && !userData.role) {
      userData.role = response.role;
    }
    setUserData(userData);
  } else if (response.role) {
    // If no user object but role exists at top level, create minimal user data
    setUserData({ role: response.role });
  }
  
  if (response.organization) {
    setOrganizationData(response.organization);
  }
  
  return response;
}

/**
 * Master Admin Refresh Token - Get new access token
 */
export async function masterAdminRefreshToken(): Promise<MasterAdminRefreshTokenResponse> {
  const refreshTokenValue = getRefreshToken();
  
  if (!refreshTokenValue) {
    throw new Error('No refresh token available');
  }

  const response = await apiRequest<MasterAdminRefreshTokenResponse>(
    API_CONFIG.endpoints.masterAdmin.auth.refresh,
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
  
  // Update token expiration time and set auto-logout timer
  if (response.expires_in) {
    setTokenExpiration(response.expires_in);
    setupAutoLogoutTimer(response.expires_in);
  }
  
  return response;
}

