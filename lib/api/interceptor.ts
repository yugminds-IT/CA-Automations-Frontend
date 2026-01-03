// API Interceptor for automatic token refresh

import { getAccessToken, getRefreshToken, setTokens, clearTokens, ApiError } from './client';

/**
 * Interceptor to handle API requests with automatic token refresh
 * Use this wrapper for apiRequest when you need automatic token refresh on 401
 * Automatically logs out user if tokens are expired
 */
export async function apiRequestWithRefresh<T>(
  endpoint: string,
  options: any,
  retryCount = 0
): Promise<T> {
  const { apiRequest, getAccessToken } = await import('./client');
  
  // Check if access token exists before making request
  if (options.requiresAuth && !getAccessToken()) {
    const refreshTokenValue = getRefreshToken();
    
    // If no access token but we have refresh token, try to refresh first
    if (refreshTokenValue && retryCount === 0) {
      try {
        const { refreshToken } = await import('./auth');
        const refreshResponse = await refreshToken();
        // Keep the same refresh token
        setTokens(refreshResponse.access_token, refreshTokenValue);
        
        // Retry the original request with new token
        return await apiRequestWithRefresh<T>(endpoint, options, retryCount + 1);
      } catch (refreshError) {
        // Refresh failed - tokens expired, logout user
        const { logout } = await import('./auth');
        logout();
        throw new ApiError(401, 'Session expired. Please login again.');
      }
    } else {
      // No tokens at all - logout user
      const { logout } = await import('./auth');
      logout();
      throw new ApiError(401, 'Authentication required. Please login again.');
    }
  }
  
  try {
    return await apiRequest<T>(endpoint, options);
  } catch (error) {
    // If 401 or 403 (unauthorized/forbidden), try to refresh token
    if (error instanceof ApiError && (error.status === 401 || error.status === 403) && retryCount === 0) {
      const refreshTokenValue = getRefreshToken();
      
      if (refreshTokenValue) {
        try {
          const { refreshToken } = await import('./auth');
          const refreshResponse = await refreshToken();
          setTokens(refreshResponse.access_token, refreshTokenValue);
          
          // Retry the original request with new token
          return await apiRequestWithRefresh<T>(endpoint, options, retryCount + 1);
        } catch (refreshError) {
          // Refresh failed - tokens expired, logout user
          const { logout } = await import('./auth');
          logout();
          throw new ApiError(401, 'Session expired. Please login again.');
        }
      } else {
        // No refresh token available - logout user
        const { logout } = await import('./auth');
        logout();
        throw new ApiError(401, 'Authentication required. Please login again.');
      }
    }
    
    // If error is 401 or 403 and we've already retried, tokens are expired
    if (error instanceof ApiError && (error.status === 401 || error.status === 403) && retryCount > 0) {
      const { logout } = await import('./auth');
      logout();
      throw new ApiError(401, 'Session expired. Please login again.');
    }
    
    throw error;
  }
}

