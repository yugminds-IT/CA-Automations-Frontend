// API Configuration

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  endpoints: {
    auth: {
      signup: '/api/v1/auth/signup',
      login: '/api/v1/auth/login',
      refresh: '/api/v1/auth/refresh',
    },
    org: {
      create: '/api/v1/org/',
    },
    user: {
      create: '/api/v1/user/',
    },
    health: '/health',
  },
} as const;

// Token storage keys
export const TOKEN_KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
} as const;

