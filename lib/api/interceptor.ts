// API Interceptor for automatic token refresh

import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './client';
import { refreshToken } from './auth';
import { ApiError } from './client';

/**
 * Interceptor to handle API requests with automatic token refresh
 * Use this wrapper for apiRequest when you need automatic token refresh on 401
 */
export async function apiRequestWithRefresh<T>(
  endpoint: string,
  options: any,
  retryCount = 0
): Promise<T> {
  const { apiRequest } = await import('./client');
  
  try {
    return await apiRequest<T>(endpoint, options);
  } catch (error) {
    // If 401 and we have a refresh token, try to refresh
    if (error instanceof ApiError && error.status === 401 && retryCount === 0) {
      const refreshTokenValue = getRefreshToken();
      
      if (refreshTokenValue) {
        try {
          const refreshResponse = await refreshToken();
          setTokens(refreshResponse.access_token, refreshTokenValue);
          
          // Retry the original request with new token
          return await apiRequestWithRefresh<T>(endpoint, options, retryCount + 1);
        } catch (refreshError) {
          // Refresh failed, clear tokens and logout
          clearTokens();
          throw new ApiError(401, 'Session expired. Please login again.');
        }
      }
    }
    
    throw error;
  }
}

