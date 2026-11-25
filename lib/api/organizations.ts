// Organizations API - Backend endpoints only

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import type {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  SmtpConfigResponse,
  SmtpConfigRequest,
  SmtpTestRequest,
  SmtpTestResponse,
} from './types';

export async function createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
  return apiRequestWithRefresh<Organization>(API_CONFIG.endpoints.organizations.base, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

export async function listOrganizations(): Promise<Organization[]> {
  return apiRequestWithRefresh<Organization[]>(API_CONFIG.endpoints.organizations.base, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function getOrganizationById(id: number | string): Promise<Organization> {
  return apiRequestWithRefresh<Organization>(API_CONFIG.endpoints.organizations.byId(id), {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function updateOrganization(
  id: number | string,
  data: UpdateOrganizationRequest
): Promise<Organization> {
  return apiRequestWithRefresh<Organization>(API_CONFIG.endpoints.organizations.byId(id), {
    method: 'PATCH',
    body: data,
    requiresAuth: true,
  });
}

export async function deleteOrganization(id: number | string): Promise<void> {
  return apiRequestWithRefresh<void>(API_CONFIG.endpoints.organizations.byId(id), {
    method: 'DELETE',
    requiresAuth: true,
  });
}

// ─── SMTP Config ─────────────────────────────────────────────────────────────

export async function getSmtpConfig(id: number | string): Promise<SmtpConfigResponse> {
  return apiRequestWithRefresh<SmtpConfigResponse>(API_CONFIG.endpoints.organizations.smtpConfig(id), {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function saveSmtpConfig(
  id: number | string,
  data: SmtpConfigRequest,
): Promise<{ message: string }> {
  return apiRequestWithRefresh<{ message: string }>(API_CONFIG.endpoints.organizations.smtpConfig(id), {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

export async function clearSmtpConfig(id: number | string): Promise<{ message: string }> {
  return apiRequestWithRefresh<{ message: string }>(API_CONFIG.endpoints.organizations.smtpConfig(id), {
    method: 'DELETE',
    requiresAuth: true,
  });
}

export async function testSmtpConfig(
  id: number | string,
  data: SmtpTestRequest,
): Promise<SmtpTestResponse> {
  return apiRequestWithRefresh<SmtpTestResponse>(API_CONFIG.endpoints.organizations.smtpConfigTest(id), {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

// ─── Reply-to and signature ──────────────────────────────────────────────────

export interface MailIdentity {
  /** Where client replies go; empty = to the sender */
  replyTo: string
  /** Plain-text sign-off added to every email to clients */
  signature: string
}

export async function getMailIdentity(id: number | string): Promise<MailIdentity> {
  return apiRequestWithRefresh<MailIdentity>(`${API_CONFIG.endpoints.organizations.byId(id)}/mail-identity`, { method: 'GET', requiresAuth: true })
}

export async function saveMailIdentity(id: number | string, data: Partial<MailIdentity>): Promise<MailIdentity> {
  return apiRequestWithRefresh<MailIdentity>(`${API_CONFIG.endpoints.organizations.byId(id)}/mail-identity`, { method: 'PUT', body: data, requiresAuth: true })
}
