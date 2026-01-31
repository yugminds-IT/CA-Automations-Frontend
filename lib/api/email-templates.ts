// Email Templates API - Backend endpoints only

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import type {
  CreateEmailTemplateRequest,
  UpdateEmailTemplateRequest,
  SendEmailRequest,
  EmailTemplate,
} from './types';

export async function getCategories(): Promise<unknown> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.emailTemplates.categories, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function getTypesByCategory(category: string): Promise<unknown> {
  return apiRequestWithRefresh(
    `${API_CONFIG.endpoints.emailTemplates.types}?category=${encodeURIComponent(category)}`,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
}

export async function getVariables(): Promise<unknown> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.emailTemplates.variables, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function createTemplate(
  data: CreateEmailTemplateRequest
): Promise<EmailTemplate> {
  return apiRequestWithRefresh<EmailTemplate>(
    API_CONFIG.endpoints.emailTemplates.base,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
}

export async function listTemplates(params?: { category?: string; organizationId?: number; limit?: number }): Promise<EmailTemplate[]> {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.organizationId != null) search.set('organizationId', String(params.organizationId));
  const query = search.toString();
  const url = query ? `${API_CONFIG.endpoints.emailTemplates.base}?${query}` : API_CONFIG.endpoints.emailTemplates.base;
  return apiRequestWithRefresh<EmailTemplate[]>(url, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function getTemplateById(
  id: number | string
): Promise<EmailTemplate> {
  return apiRequestWithRefresh<EmailTemplate>(
    API_CONFIG.endpoints.emailTemplates.byId(id),
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
}

export async function updateTemplate(
  id: number | string,
  data: UpdateEmailTemplateRequest
): Promise<EmailTemplate> {
  return apiRequestWithRefresh<EmailTemplate>(
    API_CONFIG.endpoints.emailTemplates.byId(id),
    {
      method: 'PATCH',
      body: data,
      requiresAuth: true,
    }
  );
}

export async function deleteTemplate(id: number | string): Promise<void> {
  return apiRequestWithRefresh<void>(
    API_CONFIG.endpoints.emailTemplates.byId(id),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

export async function sendEmail(data: SendEmailRequest): Promise<unknown> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.emailTemplates.send, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}
