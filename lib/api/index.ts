// API Integration - Main Export File

import { getUserData } from './client';
import { UserRole } from './types';

// Types
export type * from './types';
// Enums (exported as values, not just types)
export { UserRole, TokenType } from './types';
// Email Config Types
export type {
  EmailConfig,
  EmailConfigRequest,
  EmailConfigResponse,
  EmailTemplateSelection,
  ServiceEmailConfig,
  DateType,
  ScheduledEmail,
  GetScheduledEmailsParams,
  GetScheduledEmailsResponse,
} from './types';

// Configuration
export { API_CONFIG, TOKEN_KEYS } from './config';

// Client & Utilities
export {
  apiRequest,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  setTokenExpiration,
  getTokenExpiration,
  isTokenExpired,
  clearTokenExpiration,
  setUserData,
  getUserData,
  setOrganizationData,
  getOrganizationData,
  ApiError,
} from './client';

// Auth APIs
export {
  signup,
  login,
  loginAsMasterAdmin,
  refreshToken,
  refreshTokenAsMasterAdmin,
  logout,
  isAuthenticated,
  restoreAutoLogoutTimer,
} from './auth';

// Organization APIs
export { createOrganization, getOrganizations } from './org';

// User APIs
export { createUser } from './user';

// Master Admin APIs
export {
  masterAdminSignup,
  masterAdminLogin,
  masterAdminRefreshToken,
} from './master-admin-auth';

export {
  masterAdminGetOrganizations,
  masterAdminGetOrganizationById,
  masterAdminCreateOrganization,
  masterAdminUpdateOrganization,
  masterAdminDeleteOrganization,
} from './master-admin-org';

export {
  masterAdminGetUsers,
  masterAdminGetUserById,
  masterAdminCreateUser,
  masterAdminUpdateUser,
  masterAdminDeleteUser,
} from './master-admin-user';

export {
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  getMasterEmailTemplates,
  getOrgEmailTemplates,
  customizeMasterTemplate,
  createOrgEmailTemplate,
  updateOrgEmailTemplate,
  deleteOrgEmailTemplate,
  getOrgEmailTemplateById,
  EmailTemplateCategory,
  EmailTemplateType,
  TEMPLATE_VARIABLES,
  type EmailTemplate,
  type CreateEmailTemplateRequest,
  type UpdateEmailTemplateRequest,
  type GetEmailTemplatesParams,
  type GetEmailTemplatesResponse,
  type CustomizeTemplateRequest,
} from './email-templates';

// Client APIs
export {
  createClient,
  getClients,
  getClientById,
  updateClient,
  updateClientLogin,
  deleteClient,
  exportClientsToExcel,
  getServices,
  createService,
  getClientStatusEnum,
  getBusinessTypeEnum,
  getServiceTypeEnum,
  createEmailConfig,
  updateEmailConfig,
  getEmailConfig,
  deleteEmailConfig,
  deleteEmailFromConfig,
  getScheduledEmails,
  cancelScheduledEmail,
  retryScheduledEmail,
  sendTestEmail,
  type SendTestEmailRequest,
} from './clients';

// Health Check
export { healthCheck } from './health';

// Upload APIs
export {
  uploadFilesToServer,
  getUploadedFiles,
  deleteUploadedFile,
  getFileDownloadUrl,
  downloadFile,
  getFilePreviewBlobUrl,
  type UploadResponse,
  type UploadFilesResponse,
} from './uploads';

// React Hooks (Optional)
export * from './hooks';

// Constants and Utilities
export * from './constants';

/**
 * Get role from login response - checks both response.role and response.user.role
 */
export function getRoleFromResponse(response: any): string | null {
  if (!response) return null;
  
  // Check top-level role first
  if (response.role) {
    return String(response.role).toLowerCase();
  }
  
  // Check user.role
  if (response.user && response.user.role) {
    return String(response.user.role).toLowerCase();
  }
  
  return null;
}

// Helper function to check if current user is master admin
export function isMasterAdminUser(): boolean {
  const userData = getUserData();
  if (!userData || !userData.role) return false;
  const role = String(userData.role).toLowerCase();
  return role === 'master_admin' || role === UserRole.MASTER_ADMIN;
}

