// API Configuration
// Set NEXT_PUBLIC_API_BASE_URL in .env.local (dev) and in your host (e.g. Coolify) for production.

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  endpoints: {
    auth: {
      signup: '/api/v1/auth/signup',
      login: '/api/v1/auth/login',
      refresh: '/api/v1/auth/refresh',
    },
    org: {
      create: '/api/v1/org/',
      list: '/api/v1/org/',
    },
    user: {
      create: '/api/v1/user/',
    },
    client: {
      base: '/api/v1/client/',
      export: '/api/v1/client/export/excel',
      services: '/api/v1/client/services/',
      emailConfig: (clientId: number | string) => `/api/v1/client/${clientId}/email-config`,
      deleteEmailFromConfig: (clientId: number | string, email: string) => `/api/v1/client/${clientId}/email-config/emails/${encodeURIComponent(email)}`,
      scheduledEmails: (clientId: number | string) => `/api/v1/client/${clientId}/scheduled-emails`,
      cancelScheduledEmail: (clientId: number | string, emailId: number | string) => `/api/v1/client/${clientId}/scheduled-emails/${emailId}`,
      retryScheduledEmail: (clientId: number | string, emailId: number | string) => `/api/v1/client/${clientId}/scheduled-emails/${emailId}/retry`,
      enums: {
        status: '/api/v1/client/enums/status/',
        businessType: '/api/v1/client/enums/business-type/',
        serviceType: '/api/v1/client/enums/service-type/',
      },
    },
    emailTemplates: {
      list: '/api/v1/email-templates/',
      get: (id: number | string) => `/api/v1/email-templates/${id}`,
      create: '/api/v1/email-templates/',
      update: (id: number | string) => `/api/v1/email-templates/${id}`,
      delete: (id: number | string) => `/api/v1/email-templates/${id}`,
      customize: (id: number | string) => `/api/v1/email-templates/${id}/customize`,
      masterTemplates: '/api/v1/email-templates/master/',
    },
    uploads: {
      upload: '/api/v1/uploads/',
      list: '/api/v1/uploads/',
      delete: (id: number | string) => `/api/v1/uploads/${id}`,
      download: (id: number | string) => `/api/v1/uploads/${id}/download`,
    },
    masterAdmin: {
      auth: {
        signup: '/api/v1/master-admin/auth/signup',
        login: '/api/v1/master-admin/auth/login',
        refresh: '/api/v1/master-admin/auth/refresh',
      },
      org: {
        list: '/api/v1/master-admin/org/',
        get: (id: number) => `/api/v1/master-admin/org/${id}`,
        create: '/api/v1/master-admin/org/',
        update: (id: number) => `/api/v1/master-admin/org/${id}`,
        delete: (id: number) => `/api/v1/master-admin/org/${id}`,
      },
      user: {
        list: '/api/v1/master-admin/user/',
        get: (id: number) => `/api/v1/master-admin/user/${id}`,
        create: '/api/v1/master-admin/user/',
        update: (id: number) => `/api/v1/master-admin/user/${id}`,
        delete: (id: number) => `/api/v1/master-admin/user/${id}`,
      },
      emailTemplates: {
        list: '/api/v1/master-admin/email-templates/',
        get: (id: number | string) => `/api/v1/master-admin/email-templates/${id}`,
        create: '/api/v1/master-admin/email-templates/',
        update: (id: number | string) => `/api/v1/master-admin/email-templates/${id}`,
        delete: (id: number | string) => `/api/v1/master-admin/email-templates/${id}`,
      },
    },
    health: '/health',
  },
} as const;

// Token storage keys
export const TOKEN_KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
} as const;

