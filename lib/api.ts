/**
 * API Utility for making HTTP requests
 *
 * Set NEXT_PUBLIC_API_URL in .env.local (dev) and in your host for production.
 * No default URL – must be set for API calls to work.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface ApiError {
  message: string
  status?: number
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    // Get token from localStorage if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        const error: ApiError = {
          message: data.message || data.error || 'An error occurred',
          status: response.status,
        }
        throw error
      }

      return data
    } catch (error) {
      if (error instanceof Error) {
        throw { message: error.message } as ApiError
      }
      throw error
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Create API client instance
export const api = new ApiClient(API_BASE_URL)

// Auth API functions
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post<{ token: string; user: unknown }>('/auth/login', {
      email,
      password,
    })
    
    // Store token in localStorage
    if (typeof window !== 'undefined' && response.token) {
      localStorage.setItem('auth_token', response.token)
    }
    
    return response
  },

  signup: async (data: {
    organization_name: string
    admin_email: string
    admin_password: string
    admin_full_name: string
    admin_phone: string
    city: string
    state: string
    country: string
    pincode: string
  }) => {
    const response = await api.post<{ token: string; user: unknown }>('/auth/signup', data)
    
    // Store token in localStorage
    if (typeof window !== 'undefined' && response.token) {
      localStorage.setItem('auth_token', response.token)
    }
    
    return response
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  },
}

