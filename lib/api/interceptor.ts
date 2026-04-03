// API Interceptor for automatic token refresh

import { getAccessToken, getRefreshToken, ApiError } from './client';

function forceLogout(): void {
  // Dynamically import to avoid circular deps — fire and forget (sync redirect after)
  import('./auth').then(({ logout }) => logout()).catch(() => {});
  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }
}

/**
 * Interceptor to handle API requests with automatic token refresh.
 * Use this wrapper for apiRequest when you need automatic token refresh on 401.
 * Automatically logs out user and hard-redirects to /login if tokens are expired.
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

    if (refreshTokenValue && retryCount === 0) {
      try {
        const { refreshToken } = await import('./auth');
        await refreshToken();
        return await apiRequestWithRefresh<T>(endpoint, options, retryCount + 1);
      } catch {
        forceLogout();
        throw new ApiError(401, 'Session expired. Please login again.');
      }
    } else {
      forceLogout();
      throw new ApiError(401, 'Authentication required. Please login again.');
    }
  }

  try {
    return await apiRequest<T>(endpoint, options);
  } catch (error) {
    // Only 401 means token invalid/expired — try refresh.
    // 403 = Forbidden (no permission), do NOT refresh or logout.
    if (error instanceof ApiError && error.status === 401 && retryCount === 0) {
      const refreshTokenValue = getRefreshToken();

      if (refreshTokenValue) {
        try {
          const { refreshToken } = await import('./auth');
          await refreshToken();
          return await apiRequestWithRefresh<T>(endpoint, options, retryCount + 1);
        } catch {
          forceLogout();
          throw new ApiError(401, 'Session expired. Please login again.');
        }
      } else {
        forceLogout();
        throw new ApiError(401, 'Authentication required. Please login again.');
      }
    }

    if (error instanceof ApiError && error.status === 401 && retryCount > 0) {
      forceLogout();
      throw new ApiError(401, 'Session expired. Please login again.');
    }

    // Notify the global NetworkStatus component when the server is unreachable
    if (error instanceof ApiError && error.status === 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('api-network-error'));
    }
    throw error;
  }
}
