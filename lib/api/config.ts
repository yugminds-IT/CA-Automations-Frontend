// API Configuration - Backend endpoints from FRONTEND_INTEGRATION.md
// Set NEXT_PUBLIC_API_BASE_URL in .env.local (default: http://localhost:3000)

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  endpoints: {
    auth: {
      login: '/auth/login',
      refresh: '/auth/refresh',
      me: '/auth/me',
      roles: '/auth/roles',
      organizations: '/auth/organizations',
      register: '/auth/register',
      signupMasterAdmin: '/auth/signup/master-admin',
      signupOrganization: '/auth/signup/organization',
      signupOrgAdmin: '/auth/signup/org-admin',
      forgotPassword: '/auth/forgot-password',
      resetPassword: '/auth/reset-password',
    },
    organizations: {
      base: '/organizations',
      byId: (id: number | string) => `/organizations/${id}`,
    },
    users: {
      base: '/users',
      employees: '/users/employees',
      byId: (id: number | string) => `/users/${id}`,
    },
    clients: {
      base: '/clients',
      withLogin: '/clients/with-login',
      onboard: '/clients/onboard',
      checkLoginEmail: '/clients/email-exists',
      byId: (id: number | string) => `/clients/${id}`,
      directors: (id: number | string) => `/clients/${id}/directors`,
      directorById: (clientId: number | string, dirId: number | string) =>
        `/clients/${clientId}/directors/${dirId}`,
    },
    businessTypes: {
      base: '/business-types',
    },
    services: {
      base: '/services',
    },
    clientFiles: {
      upload: '/client-files/upload',
      list: '/client-files',
      byClient: (clientId: number | string) => `/client-files/client/${clientId}`,
      downloadUrl: (id: number | string) => `/client-files/${id}/download-url`,
    },
    emailTemplates: {
      base: '/email-templates',
      categories: '/email-templates/categories',
      types: '/email-templates/types',
      variables: '/email-templates/variables',
      send: '/email-templates/send',
      byId: (id: number | string) => `/email-templates/${id}`,
    },
    mailManagement: {
      recipients: '/mail-management/recipients',
      orgMails: '/mail-management/org-mails',
      templates: '/mail-management/templates',
      schedule: '/mail-management/schedule',
      schedules: '/mail-management/schedules',
      scheduleById: (id: number | string) => `/mail-management/schedules/${id}`,
    },
    health: '/',
  },
} as const;

export const TOKEN_KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
} as const;
