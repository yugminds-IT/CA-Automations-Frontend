// API Integration - Main Export File
// APIs and enums from backend only (FRONTEND_INTEGRATION.md, CAA-Backend-API.postman_collection.json)

// Types & Enums
export type * from './types';
export {
  RoleName,
  TemplateCategory,
  type ClientStatus,
  type EmailScheduleStatus,
  type ScheduleType,
  type ScheduledEmail,
  type GetScheduledEmailsParams,
} from './types';

// Compatibility: UserRole = RoleName
export { RoleName as UserRole } from './types';

// Compatibility: EmailTemplateCategory = TemplateCategory
export { TemplateCategory as EmailTemplateCategory } from './types';

// Compatibility: EmailTemplateType - use getTypesByCategory() for dynamic types from backend
export const EmailTemplateType = {
  GST_FILING: 'gst_filing',
  INCOME_TAX_RETURN: 'income_tax_return',
  TDS: 'tds',
  AUDIT: 'audit',
  ROC_FILING: 'roc_filing',
  PF_ESIC: 'pf_esic',
  ACCOUNTING: 'accounting',
  BOOK_KEEPING: 'book_keeping',
  COMPANY_REGISTRATION: 'company_registration',
  LLP_REGISTRATION: 'llp_registration',
  TRADEMARK: 'trademark',
  ISO_CERTIFICATION: 'iso_certification',
  LABOUR_COMPLIANCE: 'labour_compliance',
  CUSTOM_SERVICE: 'custom_service',
  LOGIN_CREDENTIALS: 'login_credentials',
  PASSWORD_RESET: 'password_reset',
  WELCOME_EMAIL: 'welcome_email',
  CLIENT_ONBOARDED: 'client_onboarded',
  SERVICE_ASSIGNED: 'service_assigned',
  DOCUMENT_UPLOADED: 'document_uploaded',
  PAYMENT_RECEIVED: 'payment_received',
  FOLLOW_UP_DOCUMENTS: 'follow_up_documents',
  FOLLOW_UP_PAYMENT: 'follow_up_payment',
  FOLLOW_UP_MEETING: 'follow_up_meeting',
  REMINDER_DEADLINE: 'reminder_deadline',
  REMINDER_SUBMISSION: 'reminder_submission',
  REMINDER_RENEWAL: 'reminder_renewal',
} as const;

// Template type strings (from backend - fetch /email-templates/types?category=X for dynamic)
export const TEMPLATE_VARIABLES = {
  CLIENT_NAME: '{{client_name}}',
  CLIENT_EMAIL: '{{client_email}}',
  CLIENT_PHONE: '{{client_phone}}',
  COMPANY_NAME: '{{company_name}}',
  ORG_NAME: '{{org_name}}',
  ORG_EMAIL: '{{org_email}}',
  ORG_PHONE: '{{org_phone}}',
  SERVICE_NAME: '{{service_name}}',
  SERVICE_DESCRIPTION: '{{service_description}}',
  CURRENT_DATE: '{{current_date}}',
  DATE: '{{date}}',
  TODAY: '{{today}}',
  DEADLINE_DATE: '{{deadline_date}}',
  FOLLOW_UP_DATE: '{{follow_up_date}}',
  LOGIN_EMAIL: '{{login_email}}',
  LOGIN_PASSWORD: '{{login_password}}',
  LOGIN_URL: '{{login_url}}',
  ADDITIONAL_NOTES: '{{additional_notes}}',
  AMOUNT: '{{amount}}',
  DOCUMENT_NAME: '{{document_name}}',
} as const;

// Compatibility aliases for email templates
export {
  listTemplates as getEmailTemplates,
  listTemplates as getMasterEmailTemplates,
  createTemplate as createEmailTemplate,
  createTemplate as createOrgEmailTemplate,
  updateTemplate as updateEmailTemplate,
  updateTemplate as updateOrgEmailTemplate,
  deleteTemplate as deleteEmailTemplate,
  deleteTemplate as deleteOrgEmailTemplate,
  getTemplateById as getEmailTemplateById,
  getTemplateById as getOrgEmailTemplateById,
} from './email-templates';

/** List templates for the current org (passes user's organizationId so backend returns global + org templates). */
export async function getOrgEmailTemplates(params?: { limit?: number; category?: string }) {
  const { listTemplates } = await import('./email-templates');
  const { getUserData } = await import('./client');
  const user = getUserData();
  const organizationId = user?.organizationId != null ? Number(user.organizationId) : undefined;
  return listTemplates({ ...params, organizationId });
}

export async function customizeMasterTemplate(
  templateId: number | string,
  data: { subject?: string; body?: string }
) {
  const { updateTemplate } = await import('./email-templates');
  return updateTemplate(templateId, data);
}

export type { CreateEmailTemplateRequest, UpdateEmailTemplateRequest } from './types';
export type { UpdateEmailTemplateRequest as CustomizeTemplateRequest } from './types';

// Configuration
export { API_CONFIG, TOKEN_KEYS } from './config';

// Client & Utilities
export {
  apiRequest,
  uploadFiles,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  setUserData,
  getUserData,
  setOrganizationData,
  getOrganizationData,
  ApiError,
} from './client';

// Auth APIs
export {
  login,
  refreshToken,
  getMe,
  getRoles,
  getAuthOrganizations,
  register,
  signupMasterAdmin,
  signupOrganization,
  signupOrgAdmin,
  forgotPassword,
  resetPassword,
  logout,
  isAuthenticated,
} from './auth';

// Compatibility: signup (maps to signupOrganization)
export async function signup(data: {
  organization_name: string;
  admin_email: string;
  admin_password: string;
  admin_full_name: string;
  admin_phone?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}): Promise<unknown> {
  const { signupOrganization } = await import('./auth');
  return signupOrganization({
    organization: {
      name: data.organization_name,
      city: data.city ?? '',
      state: data.state ?? '',
      country: data.country ?? '',
      pincode: data.pincode ?? '',
    },
    admin: {
      name: data.admin_full_name,
      email: data.admin_email,
      password: data.admin_password,
      phone: data.admin_phone ?? '',
    },
  });
}

// Organization APIs
export {
  createOrganization,
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from './organizations';

// Compatibility: master admin org APIs
export {
  listOrganizations as masterAdminGetOrganizations,
  getOrganizationById as masterAdminGetOrganizationById,
  createOrganization as masterAdminCreateOrganization,
  updateOrganization as masterAdminUpdateOrganization,
  deleteOrganization as masterAdminDeleteOrganization,
} from './organizations';

// User APIs
export {
  createEmployee,
  listUsers,
  getUserById,
} from './users';

// Compatibility: master admin user APIs (backend: GET/POST only for users)
export {
  listUsers as masterAdminGetUsers,
  getUserById as masterAdminGetUserById,
  createEmployee as masterAdminCreateUser,
} from './users';
export async function masterAdminUpdateUser(
  _id: number,
  _data: Record<string, unknown>
): Promise<never> {
  throw new Error('PATCH /users/:id not in backend - add if needed');
}
export async function masterAdminDeleteUser(_id: number): Promise<never> {
  throw new Error('DELETE /users/:id not in backend - add if needed');
}

// Client APIs
export {
  createClient,
  createClientWithLogin,
  onboardClient,
  listClients,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  listDirectors,
  addDirector,
  updateDirector,
  deleteDirector,
  getServices,
  getClientStatusEnum,
  getBusinessTypeEnum,
  updateClientLogin,
} from './clients';

// Business Types APIs
export { listBusinessTypes, createBusinessType } from './business-types';

// Services APIs
export { listServices, createService } from './services';

// Client Files APIs
export {
  uploadClientFiles,
  listMyFiles,
  listClientFiles,
  getFileDownloadUrl,
  getFilePreviewBlobUrl,
  downloadFile,
  type UploadResponse,
} from './client-files';

// Compatibility aliases
export { uploadClientFiles as uploadFilesToServer } from './client-files';
export async function getUploadedFiles(): Promise<unknown[]> {
  const { listMyFiles } = await import('./client-files');
  const result = await listMyFiles();
  return Array.isArray(result) ? result : (result as { files?: unknown[] })?.files ?? [];
}
export async function deleteUploadedFile(_id: number | string): Promise<void> {
  throw new Error('Delete file not in backend - use client-files API');
}

// Email Templates APIs
export {
  getCategories,
  getTypesByCategory,
  getVariables,
  createTemplate,
  listTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  sendEmail,
} from './email-templates';

// Mail Management APIs
export {
  getRecipients,
  getOrgMails,
  getMailTemplates,
  scheduleEmail,
  listSchedules,
  getScheduleById,
  cancelSchedule,
} from './mail-management';

// Compatibility: client email config - not in new backend (use mail-management)
export async function createEmailConfig(
  _clientId: number | string,
  _data: unknown
): Promise<never> {
  throw new Error('createEmailConfig not in backend - use mail-management scheduleEmail');
}
export async function updateEmailConfig(
  _clientId: number | string,
  _data: unknown
): Promise<never> {
  throw new Error('updateEmailConfig not in backend - use mail-management scheduleEmail');
}
/** No backend store for client email config; returns empty config so UI loads without error. */
export async function getEmailConfig(_clientId: number | string): Promise<{
  emails: string[];
  emailTemplates: Record<string, unknown>;
  services: Record<string, unknown>;
}> {
  return Promise.resolve({
    emails: [],
    emailTemplates: {},
    services: {},
  });
}
/** No backend store for client email config; removal is local only. Resolves so UI optimistic update sticks. */
export async function deleteEmailConfig(_clientId: number | string): Promise<void> {
  return Promise.resolve();
}
/** No backend store for per-email config; removal is local only. Resolves so UI optimistic update sticks. */
export async function deleteEmailFromConfig(
  _clientId: number | string,
  _email: string
): Promise<void> {
  return Promise.resolve();
}
export async function sendTestEmail(_data: unknown): Promise<never> {
  throw new Error('sendTestEmail not in backend - use email-templates sendEmail');
}

// Compatibility: getScheduledEmails (new API uses listSchedules from mail-management)
// Backend returns schedules with camelCase (scheduledAt, recipientEmails, template); normalize to shape UI expects.
export async function getScheduledEmails(
  _clientId?: number | string,
  params?: { status?: string; limit?: number }
) {
  const { listSchedules } = await import('./mail-management');
  const result = await listSchedules(params?.status);
  const raw = Array.isArray(result) ? result : (result as { schedules?: unknown[] })?.schedules ?? result;
  const items = Array.isArray(raw) ? raw : [];
  const scheduled_emails = items.map((s: Record<string, unknown>) => {
    const scheduledAt = s.scheduledAt ?? s.scheduled_at;
    const date = scheduledAt ? new Date(scheduledAt as string) : null;
    // Use local date/time for display so "Scheduled Time" matches user's clock and "Remaining Time" is consistent
    let dateStr = '';
    let timeStr = '';
    if (date && !Number.isNaN(date.getTime())) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${d}`;
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      timeStr = `${h}:${min}`;
    }
    return {
      id: s.id,
      template_id: s.templateId ?? s.template_id,
      template_name: (s.template as Record<string, unknown>)?.name ?? s.template_name,
      recipient_emails: s.recipientEmails ?? s.recipient_emails ?? [],
      scheduled_datetime: scheduledAt ? new Date(scheduledAt as string).toISOString() : '',
      scheduled_date: dateStr,
      scheduled_time: timeStr,
      status: s.status ?? 'pending',
      ...s,
    };
  });
  return { scheduled_emails, total: scheduled_emails.length };
}

// Health Check
export { healthCheck } from './health';

// Constants
export * from './constants';

// React Hooks
export * from './hooks';

// Compatibility helpers
export { isMasterAdminUser, getRoleFromResponse, getRoleFromUser, restoreAutoLogoutTimer } from './compat';

// Default email templates (reference for forms)
export {
  DEFAULT_EMAIL_TEMPLATES,
  getDefaultTemplateByType,
} from './default-email-templates';
