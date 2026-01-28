// Email Templates API Functions
// 
// API endpoints match Backend_CAA_API.postman_collection.json
// 
// Master Admin Endpoints:
// - GET    /api/v1/master-admin/email-templates/          - List all master templates
// - GET    /api/v1/master-admin/email-templates/{id}      - Get master template by ID
// - POST   /api/v1/master-admin/email-templates/          - Create master template
// - PUT    /api/v1/master-admin/email-templates/{id}      - Update master template
// - DELETE /api/v1/master-admin/email-templates/{id}      - Delete master template
//
// Org Admin Endpoints:
// - GET    /api/v1/email-templates/master/                - View master templates (read-only)
// - GET    /api/v1/email-templates/                      - List org-specific templates
// - GET    /api/v1/email-templates/{id}                 - Get org template by ID
// - POST   /api/v1/email-templates/{id}/customize        - Customize master template for org
// - POST   /api/v1/email-templates/                      - Create custom org template
// - PUT    /api/v1/email-templates/{id}                 - Update org template
// - DELETE /api/v1/email-templates/{id}                  - Delete org template

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import type { ApiError } from './client';

// Email Template Types
export enum EmailTemplateCategory {
  SERVICE = 'service',
  LOGIN = 'login',
  NOTIFICATION = 'notification',
  FOLLOW_UP = 'follow_up',
  REMINDER = 'reminder',
}

export enum EmailTemplateType {
  // Service Templates
  GST_FILING = 'gst_filing',
  INCOME_TAX_RETURN = 'income_tax_return',
  TDS = 'tds',
  AUDIT = 'audit',
  ROC_FILING = 'roc_filing',
  PF_ESIC = 'pf_esic',
  ACCOUNTING = 'accounting',
  BOOK_KEEPING = 'book_keeping',
  COMPANY_REGISTRATION = 'company_registration',
  LLP_REGISTRATION = 'llp_registration',
  TRADEMARK = 'trademark',
  ISO_CERTIFICATION = 'iso_certification',
  LABOUR_COMPLIANCE = 'labour_compliance',
  CUSTOM_SERVICE = 'custom_service',
  
  // Login Templates
  LOGIN_CREDENTIALS = 'login_credentials',
  PASSWORD_RESET = 'password_reset',
  WELCOME_EMAIL = 'welcome_email',
  
  // Notification Templates
  CLIENT_ONBOARDED = 'client_onboarded',
  SERVICE_ASSIGNED = 'service_assigned',
  DOCUMENT_UPLOADED = 'document_uploaded',
  PAYMENT_RECEIVED = 'payment_received',
  
  // Follow-up Templates
  FOLLOW_UP_DOCUMENTS = 'follow_up_documents',
  FOLLOW_UP_PAYMENT = 'follow_up_payment',
  FOLLOW_UP_MEETING = 'follow_up_meeting',
  
  // Reminder Templates
  REMINDER_DEADLINE = 'reminder_deadline',
  REMINDER_SUBMISSION = 'reminder_submission',
  REMINDER_RENEWAL = 'reminder_renewal',
}

export interface EmailTemplate {
  id: number;
  name: string;
  category: EmailTemplateCategory;
  type: EmailTemplateType;
  subject: string;
  body: string;
  is_default: boolean;
  org_id?: number | null; // null for master templates, set for org-specific
  master_template_id?: number | null; // links customized template to master
  variables?: string[]; // Available variables like {{client_name}}, {{service_name}}, etc.
  created_at?: string;
  updated_at?: string;
}

export interface CreateEmailTemplateRequest {
  name: string;
  category: EmailTemplateCategory;
  type: EmailTemplateType;
  subject: string;
  body: string;
  is_default?: boolean;
  variables?: string[];
}

export interface UpdateEmailTemplateRequest {
  name?: string;
  subject?: string;
  body?: string;
  variables?: string[];
}

export interface GetEmailTemplatesParams {
  skip?: number;
  limit?: number;
  category?: EmailTemplateCategory;
  type?: EmailTemplateType;
  search?: string;
}

export interface GetEmailTemplatesResponse {
  templates: EmailTemplate[];
  total: number;
  skip: number;
  limit: number;
}

// Default template variables
export const TEMPLATE_VARIABLES = {
  // Client variables
  CLIENT_NAME: '{{client_name}}',
  CLIENT_EMAIL: '{{client_email}}',
  CLIENT_PHONE: '{{client_phone}}',
  COMPANY_NAME: '{{company_name}}',
  
  // Organization variables
  ORG_NAME: '{{org_name}}',
  ORG_EMAIL: '{{org_email}}',
  ORG_PHONE: '{{org_phone}}',
  
  // Service variables
  SERVICE_NAME: '{{service_name}}',
  SERVICE_DESCRIPTION: '{{service_description}}',
  
  // Date variables
  CURRENT_DATE: '{{current_date}}',
  DATE: '{{date}}',
  TODAY: '{{today}}',
  DEADLINE_DATE: '{{deadline_date}}',
  FOLLOW_UP_DATE: '{{follow_up_date}}',
  
  // Login variables
  LOGIN_EMAIL: '{{login_email}}',
  LOGIN_PASSWORD: '{{login_password}}',
  LOGIN_URL: '{{login_url}}',
  
  // Other variables
  ADDITIONAL_NOTES: '{{additional_notes}}',
  AMOUNT: '{{amount}}',
  DOCUMENT_NAME: '{{document_name}}',
} as const;

/**
 * Get all email templates
 */
export async function getEmailTemplates(
  params?: GetEmailTemplatesParams
): Promise<GetEmailTemplatesResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.skip !== undefined) {
    queryParams.append('skip', params.skip.toString());
  }
  if (params?.limit !== undefined) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params?.category) {
    queryParams.append('category', params.category);
  }
  if (params?.type) {
    queryParams.append('type', params.type);
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }

  const queryString = queryParams.toString();
  const endpoint = queryString 
    ? `${API_CONFIG.endpoints.masterAdmin.emailTemplates.list}?${queryString}`
    : API_CONFIG.endpoints.masterAdmin.emailTemplates.list;

  const response = await apiRequestWithRefresh<GetEmailTemplatesResponse>(
    endpoint,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get a specific email template by ID
 */
export async function getEmailTemplateById(
  templateId: number | string
): Promise<EmailTemplate> {
  const response = await apiRequestWithRefresh<EmailTemplate>(
    API_CONFIG.endpoints.masterAdmin.emailTemplates.get(templateId),
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  data: CreateEmailTemplateRequest
): Promise<EmailTemplate> {
  const response = await apiRequestWithRefresh<EmailTemplate>(
    API_CONFIG.endpoints.masterAdmin.emailTemplates.create,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Update an email template
 */
export async function updateEmailTemplate(
  templateId: number | string,
  data: UpdateEmailTemplateRequest
): Promise<EmailTemplate> {
  const response = await apiRequestWithRefresh<EmailTemplate>(
    API_CONFIG.endpoints.masterAdmin.emailTemplates.update(templateId),
    {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Delete an email template
 */
export async function deleteEmailTemplate(
  templateId: number | string
): Promise<void> {
  await apiRequestWithRefresh<void>(
    API_CONFIG.endpoints.masterAdmin.emailTemplates.delete(templateId),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

// ========== ORG ADMIN EMAIL TEMPLATE FUNCTIONS ==========

/**
 * Get master admin templates (for org admins to view)
 */
export async function getMasterEmailTemplates(
  params?: GetEmailTemplatesParams
): Promise<GetEmailTemplatesResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.skip !== undefined) {
    queryParams.append('skip', params.skip.toString());
  }
  if (params?.limit !== undefined) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params?.category) {
    queryParams.append('category', params.category);
  }
  if (params?.type) {
    queryParams.append('type', params.type);
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }

  const queryString = queryParams.toString();
  const endpoint = queryString 
    ? `${API_CONFIG.endpoints.emailTemplates.masterTemplates}?${queryString}`
    : API_CONFIG.endpoints.emailTemplates.masterTemplates;

  const response = await apiRequestWithRefresh<GetEmailTemplatesResponse>(
    endpoint,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get org-specific email templates (customized templates for the org)
 */
export async function getOrgEmailTemplates(
  params?: GetEmailTemplatesParams
): Promise<GetEmailTemplatesResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.skip !== undefined) {
    queryParams.append('skip', params.skip.toString());
  }
  if (params?.limit !== undefined) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params?.category) {
    queryParams.append('category', params.category);
  }
  if (params?.type) {
    queryParams.append('type', params.type);
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }

  const queryString = queryParams.toString();
  const endpoint = queryString 
    ? `${API_CONFIG.endpoints.emailTemplates.list}?${queryString}`
    : API_CONFIG.endpoints.emailTemplates.list;

  const response = await apiRequestWithRefresh<GetEmailTemplatesResponse>(
    endpoint,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Customize a master admin template for the org
 */
export interface CustomizeTemplateRequest {
  subject?: string;
  body?: string;
}

export async function customizeMasterTemplate(
  masterTemplateId: number | string,
  data: CustomizeTemplateRequest
): Promise<EmailTemplate> {
  const response = await apiRequestWithRefresh<EmailTemplate>(
    API_CONFIG.endpoints.emailTemplates.customize(masterTemplateId),
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Create a custom email template for the org
 */
export async function createOrgEmailTemplate(
  data: CreateEmailTemplateRequest
): Promise<EmailTemplate> {
  const response = await apiRequestWithRefresh<EmailTemplate>(
    API_CONFIG.endpoints.emailTemplates.create,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Update an org-specific email template
 */
export async function updateOrgEmailTemplate(
  templateId: number | string,
  data: UpdateEmailTemplateRequest
): Promise<EmailTemplate> {
  const response = await apiRequestWithRefresh<EmailTemplate>(
    API_CONFIG.endpoints.emailTemplates.update(templateId),
    {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Delete an org-specific email template
 */
export async function deleteOrgEmailTemplate(
  templateId: number | string
): Promise<void> {
  await apiRequestWithRefresh<void>(
    API_CONFIG.endpoints.emailTemplates.delete(templateId),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

/**
 * Get a specific org email template by ID
 */
export async function getOrgEmailTemplateById(
  templateId: number | string
): Promise<EmailTemplate> {
  const response = await apiRequestWithRefresh<EmailTemplate>(
    API_CONFIG.endpoints.emailTemplates.get(templateId),
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

