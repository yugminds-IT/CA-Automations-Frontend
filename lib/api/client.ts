// Base API Client

import { API_CONFIG } from './config';

/**
 * Extract error message from various response formats
 * Always returns a string, never an object
 */
function extractErrorMessage(data: any, fallback: string = 'An error occurred'): string {
  // Ensure fallback is always a string
  const safeFallback = typeof fallback === 'string' ? fallback : 'An error occurred';
  
  if (!data) return safeFallback;
  
  // If data is already a string, return it
  if (typeof data === 'string') return data;
  
  // Try to extract from common error fields
  const errorFields = ['detail', 'message', 'error', 'error_message', 'msg', 'description'];
  
  for (const field of errorFields) {
    const value = data[field];
    if (value !== undefined && value !== null) {
      // If it's a string, return it immediately
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      // If it's an array, join the messages
      if (Array.isArray(value)) {
        const messages = value
          .map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object') {
              // Recursively extract from array items
              return extractErrorMessage(item, '');
            }
            return String(item);
          })
          .filter(msg => msg && msg.trim().length > 0);
        if (messages.length > 0) return messages.join(', ');
      }
      // If it's an object, try to extract nested messages or stringify
      if (typeof value === 'object' && value !== null) {
        // Try to find nested string messages first
        const nestedMessages: string[] = [];
        const extractNested = (obj: any, depth = 0): void => {
          if (depth > 3) return; // Prevent infinite recursion
          if (typeof obj === 'string' && obj.trim().length > 0) {
            nestedMessages.push(obj.trim());
            return;
          }
          if (Array.isArray(obj)) {
            obj.forEach(item => extractNested(item, depth + 1));
            return;
          }
          if (typeof obj === 'object' && obj !== null) {
            Object.values(obj).forEach(v => extractNested(v, depth + 1));
          }
        };
        extractNested(value);
        if (nestedMessages.length > 0) {
          return nestedMessages.join(', ');
        }
        // Otherwise stringify the object
        try {
          const stringified = JSON.stringify(value, null, 2);
          return stringified.length > 500 ? stringified.substring(0, 500) + '...' : stringified;
        } catch {
          return String(value);
        }
      }
      // For other types, convert to string
      const stringValue = String(value);
      if (stringValue && stringValue !== 'null' && stringValue !== 'undefined') {
        return stringValue;
      }
    }
  }
  
  // If data is an array, try to extract messages from it
  if (Array.isArray(data)) {
    const messages = data
      .map(item => {
        if (typeof item === 'string') return item;
        return extractErrorMessage(item, '');
      })
      .filter(msg => msg && msg.trim().length > 0);
    if (messages.length > 0) return messages.join(', ');
  }
  
  // If data is an object but no standard error fields found, stringify it
  if (typeof data === 'object' && data !== null) {
    try {
      const stringified = JSON.stringify(data, null, 2);
      return stringified.length > 500 ? stringified.substring(0, 500) + '...' : stringified;
    } catch {
      return String(data);
    }
  }
  
  // Final fallback - convert to string
  const finalString = String(data);
  return finalString && finalString !== 'null' && finalString !== 'undefined' 
    ? finalString 
    : safeFallback;
}

export class ApiError extends Error {
  public status: number;
  public detail: string;
  public response?: Response;

  constructor(
    status: number,
    detail: string | any,
    response?: Response
  ) {
    // Ensure detail is always a string
    let detailString: string;
    if (typeof detail === 'string') {
      detailString = detail;
    } else if (detail && typeof detail === 'object') {
      // Try to extract error message from object
      detailString = extractErrorMessage(detail, `HTTP ${status} error`);
    } else {
      detailString = String(detail || `HTTP ${status} error`);
    }
    
    super(detailString);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detailString;
    this.response = response;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
  formData?: boolean;
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('access_token');
  } catch {
    return null;
  }
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('refresh_token');
  } catch {
    return null;
  }
}

/**
 * Store tokens in localStorage
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}

/**
 * Store token expiration time in localStorage
 * @param expiresIn Token expiration time in seconds
 */
export function setTokenExpiration(expiresIn: number): void {
  if (typeof window === 'undefined') return;
  const loginTime = Date.now();
  const expiresInMs = expiresIn * 1000; // Convert to milliseconds
  const expirationTime = loginTime + expiresInMs;
  localStorage.setItem('token_expires_at', expirationTime.toString());
}

/**
 * Get token expiration time from localStorage
 * @returns Expiration timestamp in milliseconds, or null if not set
 */
export function getTokenExpiration(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const expirationTime = localStorage.getItem('token_expires_at');
    return expirationTime ? parseInt(expirationTime, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 * @returns true if token is expired or expiration time is not set
 */
export function isTokenExpired(): boolean {
  const expirationTime = getTokenExpiration();
  if (!expirationTime) return true;
  return Date.now() >= expirationTime;
}

/**
 * Clear token expiration time from localStorage
 */
export function clearTokenExpiration(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token_expires_at');
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('organization_data');
  clearTokenExpiration();
}

/**
 * Store user data in localStorage
 */
export function setUserData(user: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user_data', JSON.stringify(user));
  // Dispatch custom event to notify components
  window.dispatchEvent(new Event('userDataUpdated'));
}

/**
 * Get stored user data
 */
export function getUserData(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('user_data');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Store organization data in localStorage
 */
export function setOrganizationData(organization: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('organization_data', JSON.stringify(organization));
  // Dispatch custom event to notify components
  window.dispatchEvent(new Event('userDataUpdated'));
}

/**
 * Get stored organization data
 */
export function getOrganizationData(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('organization_data');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Base API request function
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    requiresAuth = false,
    formData = false,
  } = options;

  const url = `${API_CONFIG.baseUrl}${endpoint}`;
  
  // Prepare headers
  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  // Add auth token if required
  if (requiresAuth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // Prepare request body
  let requestBody: string | URLSearchParams | undefined;
  if (body) {
    if (formData) {
      // Use URLSearchParams for application/x-www-form-urlencoded
      const params = new URLSearchParams();
      Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      requestBody = params;
      requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      requestBody = JSON.stringify(body);
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: any;
    let errorMessage = 'An error occurred';
    
    try {
      if (isJson) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (parseError) {
      // If we can't parse the response, use status text or default message
      errorMessage = response.statusText || 'Failed to parse response';
    }

    if (!response.ok) {
      // Extract error message from response data
      if (data) {
        if (isJson) {
          errorMessage = extractErrorMessage(data, errorMessage);
        } else {
          errorMessage = typeof data === 'string' ? data : errorMessage;
        }
      } else {
        errorMessage = response.statusText || `HTTP ${response.status} error`;
      }
      // Ensure errorMessage is always a string - double check and convert if needed
      let finalErrorMessage: string;
      if (typeof errorMessage === 'string') {
        finalErrorMessage = errorMessage;
      } else {
        // If somehow errorMessage is still not a string, extract it again
        finalErrorMessage = extractErrorMessage(errorMessage, `HTTP ${response.status} error`);
      }
      // Final safety check - if still not a string, use a default message
      if (typeof finalErrorMessage !== 'string') {
        console.warn('Error message extraction failed, using default:', { data, errorMessage, finalErrorMessage });
        finalErrorMessage = `HTTP ${response.status} error: ${response.statusText || 'Unknown error'}`;
      }
      throw new ApiError(response.status, finalErrorMessage, response);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle network errors or other fetch failures
    const message = error instanceof Error ? error.message : 'Network error';
    throw new ApiError(500, message);
  }
}

/**
 * Upload files using FormData (multipart/form-data)
 */
export async function uploadFiles<T>(
  endpoint: string,
  files: File[],
  additionalData?: Record<string, string | number>,
  requiresAuth: boolean = true,
  onProgress?: (progress: number) => void
): Promise<T> {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;
  
  // Prepare headers
  const requestHeaders: Record<string, string> = {};

  // Add auth token if required
  if (requiresAuth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // Create FormData
  const formData = new FormData();
  
  // Add files
  files.forEach((file, index) => {
    formData.append('files', file);
  });
  
  // Add additional data if provided
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
  }

  try {
    // Use XMLHttpRequest for progress tracking
    if (onProgress) {
      return new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = xhr.responseText;
              const contentType = xhr.getResponseHeader('content-type');
              const isJson = contentType?.includes('application/json');
              const data = isJson ? JSON.parse(response) : response;
              resolve(data as T);
            } catch (error) {
              reject(new ApiError(xhr.status, 'Failed to parse response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              const errorMessage = errorData.detail || errorData.message || errorData.error || xhr.statusText;
              reject(new ApiError(xhr.status, errorMessage));
            } catch {
              reject(new ApiError(xhr.status, xhr.statusText || `HTTP ${xhr.status} error`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new ApiError(500, 'Network error'));
        });
        
        xhr.open('POST', url);
        
        // Set headers
        Object.entries(requestHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
        
        xhr.send(formData);
      });
    } else {
      // Use fetch if no progress tracking needed
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      let data: any;
      let errorMessage = 'An error occurred';
      
      try {
        if (isJson) {
          data = await response.json();
        } else {
          data = await response.text();
        }
      } catch (parseError) {
        errorMessage = response.statusText || 'Failed to parse response';
      }

      if (!response.ok) {
        if (data) {
          if (isJson) {
            errorMessage = data.detail || data.message || data.error || errorMessage;
          } else {
            errorMessage = typeof data === 'string' ? data : errorMessage;
          }
        } else {
          errorMessage = response.statusText || `HTTP ${response.status} error`;
        }
        throw new ApiError(response.status, errorMessage, response);
      }

      return data as T;
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Network error';
    throw new ApiError(500, message);
  }
}

