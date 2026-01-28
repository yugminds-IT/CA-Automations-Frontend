// Authentication API Functions

import { apiRequest, setTokens, clearTokens, getRefreshToken, getAccessToken, setUserData, setOrganizationData, getUserData, setTokenExpiration, getTokenExpiration, isTokenExpired, clearTokenExpiration, ApiError } from './client';
import { API_CONFIG } from './config';
import { UserRole } from './types';
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
 * Automatically handles master admin users by retrying with master admin endpoint if needed
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  // Validate credentials before making request
  if (!credentials.username || !credentials.password) {
    throw new Error('Email and password are required');
  }

  if (credentials.username.trim() === '' || credentials.password.trim() === '') {
    throw new Error('Email and password cannot be empty');
  }

  try {
    // Try regular login endpoint first
    const response = await apiRequest<LoginResponse>(
      API_CONFIG.endpoints.auth.login,
      {
        method: 'POST',
        body: credentials,
        formData: true, // Login uses form-urlencoded
      }
    );
    
    // Validate that we received tokens - don't allow login without proper tokens
    if (!response.access_token || !response.refresh_token) {
      clearTokens(); // Clear any partial tokens
      throw new Error('Login failed: Invalid response from server. Access token or refresh token missing.');
    }

    // Validate token format (basic check - should start with expected format)
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
  } catch (error: unknown) {
    // Check if error indicates master admin must use different endpoint
    let errorMessage = '';
    if (error instanceof ApiError) {
      errorMessage = error.detail || error.message || '';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'detail' in error) {
      errorMessage = String((error as any).detail);
    }
    
    const isMasterAdminError = errorMessage.includes('Master admin users must use') || 
                              errorMessage.includes('master-admin/auth/login') ||
                              errorMessage.toLowerCase().includes('master admin');
    
    if (isMasterAdminError) {
      // Retry with master admin endpoint
      console.log('Master admin detected, retrying with master admin endpoint');
      return loginAsMasterAdmin(credentials);
    }
    
    // Re-throw original error if not master admin error
    throw error;
  }
}

/**
 * Login as Master Admin - Get access token and refresh token
 */
export async function loginAsMasterAdmin(credentials: LoginRequest): Promise<LoginResponse> {
  // Validate credentials before making request
  if (!credentials.username || !credentials.password) {
    throw new Error('Email and password are required');
  }

  if (credentials.username.trim() === '' || credentials.password.trim() === '') {
    throw new Error('Email and password cannot be empty');
  }

  const response = await apiRequest<LoginResponse>(
    API_CONFIG.endpoints.masterAdmin.auth.login,
    {
      method: 'POST',
      body: credentials,
      formData: true, // Login uses form-urlencoded
    }
  );
  
  // Validate that we received tokens - don't allow login without proper tokens
  if (!response.access_token || !response.refresh_token) {
    clearTokens(); // Clear any partial tokens
    throw new Error('Login failed: Invalid response from server. Access token or refresh token missing.');
  }

  // Validate token format (basic check - should start with expected format)
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
 * Refresh Token - Get new access token
 * Automatically detects user role and uses the appropriate refresh endpoint
 * Works for all user types: master_admin, admin, employee, client
 */
export async function refreshToken(): Promise<RefreshTokenResponse> {
  const refreshTokenValue = getRefreshToken();
  
  if (!refreshTokenValue) {
    // No refresh token available, logout user
    logout();
    throw new Error('No refresh token available. Session expired.');
  }

  // Check user role from stored user data to determine which endpoint to use
  const userData = getUserData();
  const userRole = userData?.role ? String(userData.role).toLowerCase() : null;
  const isMasterAdmin = userRole === 'master_admin' || userRole === UserRole.MASTER_ADMIN;

  // Use master admin endpoint if user is master admin
  if (isMasterAdmin) {
    return refreshTokenAsMasterAdmin();
  }

  // For all other users (admin, employee, client), use regular refresh endpoint
  try {
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
    
    // Update token expiration time and set auto-logout timer
    if (response.expires_in) {
      setTokenExpiration(response.expires_in);
      setupAutoLogoutTimer(response.expires_in);
    }
    
    return response;
  } catch (error: unknown) {
    // Check if error indicates master admin must use different endpoint (fallback)
    let errorMessage = '';
    if (error instanceof ApiError) {
      errorMessage = error.detail || error.message || '';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'detail' in error) {
      errorMessage = String((error as any).detail);
    }
    
    const isMasterAdminError = errorMessage.includes('Master admin') || 
                              errorMessage.includes('master-admin/auth/refresh') ||
                              errorMessage.toLowerCase().includes('master admin');
    
    if (isMasterAdminError) {
      // Retry with master admin refresh endpoint
      return refreshTokenAsMasterAdmin();
    }
    
    // Check if token is expired (401 or 403)
    const isExpired = error instanceof ApiError && (error.status === 401 || error.status === 403);
    if (isExpired) {
      // Token expired, logout user
      logout();
      throw new Error('Session expired. Please login again.');
    }
    
    // Re-throw original error if not expiration or master admin error
    throw error;
  }
}

/**
 * Refresh Token as Master Admin - Get new access token
 */
export async function refreshTokenAsMasterAdmin(): Promise<RefreshTokenResponse> {
  const refreshTokenValue = getRefreshToken();
  
  if (!refreshTokenValue) {
    // No refresh token available, logout user
    logout();
    throw new Error('No refresh token available. Session expired.');
  }

  try {
    const response = await apiRequest<RefreshTokenResponse>(
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
  } catch (error: unknown) {
    // Check if token is expired (401 or 403)
    const isExpired = error instanceof ApiError && (error.status === 401 || error.status === 403);
    if (isExpired) {
      // Token expired, logout user
      logout();
      throw new Error('Session expired. Please login again.');
    }
    
    // Re-throw original error
    throw error;
  }
}

// Store logout timer ID to clear it when needed
let autoLogoutTimerId: NodeJS.Timeout | null = null;

/**
 * Setup auto-logout timer based on token expiration
 * @param expiresIn Token expiration time in seconds
 */
export function setupAutoLogoutTimer(expiresIn: number): void {
  // Clear any existing timer
  if (autoLogoutTimerId !== null) {
    clearTimeout(autoLogoutTimerId);
    autoLogoutTimerId = null;
  }
  
  // Convert to milliseconds and set timer
  const expiresInMs = expiresIn * 1000;
  autoLogoutTimerId = setTimeout(() => {
    logout(); // Auto-logout when token expires
  }, expiresInMs);
}

/**
 * Restore auto-logout timer on page load/refresh
 * Calculates remaining time until token expiration and sets timer
 */
export function restoreAutoLogoutTimer(): void {
  const expirationTime = getTokenExpiration();
  
  if (!expirationTime) {
    return; // No expiration time stored
  }
  
  const now = Date.now();
  const remainingTime = expirationTime - now;
  
  if (remainingTime <= 0) {
    // Token already expired, logout immediately
    logout();
    return;
  }
  
  // Set timer for remaining time
  if (autoLogoutTimerId !== null) {
    clearTimeout(autoLogoutTimerId);
  }
  
  autoLogoutTimerId = setTimeout(() => {
    logout(); // Auto-logout when token expires
  }, remainingTime);
}

/**
 * Clear auto-logout timer
 */
function clearAutoLogoutTimer(): void {
  if (autoLogoutTimerId !== null) {
    clearTimeout(autoLogoutTimerId);
    autoLogoutTimerId = null;
  }
}

/**
 * Logout - Clear stored tokens and user data, then redirect to login
 */
export function logout(redirectToLogin = true): void {
  clearAutoLogoutTimer();
  clearTokens();
  
  // Redirect to login page if in browser environment
  if (redirectToLogin && typeof window !== 'undefined') {
    // Use window.location for a full page reload to clear any state
    window.location.href = '/login';
  }
}

/**
 * Check if user is authenticated
 * Validates that access token exists, is not empty, and is not expired
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token || token.trim() === '') {
    return false;
  }
  
  // Check if token is expired
  // Only check expiration if expiration time is set
  // If expiration time is not set, assume token is valid (for backward compatibility)
  const expirationTime = getTokenExpiration();
  if (expirationTime !== null) {
    // Expiration time is set, check if expired
    if (isTokenExpired()) {
      // Token expired, clear it and return false
      clearTokens();
      clearTokenExpiration();
      return false;
    }
  }
  // If expiration time is not set, token exists so assume valid
  // (This handles cases where expiration wasn't set during login)
  
  return true;
}

