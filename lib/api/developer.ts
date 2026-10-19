import { apiRequest } from './client';

export interface ApiKeyItem {
  id: number;
  name: string;
  keyType: 'public' | 'secret';
  keyPrefix: string;
  publicKey?: string;
  key?: string; // only present on immediate creation
  allowedDomains: string[];
  rateLimitPerMinute: number;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export interface FormSubmissionItem {
  id: number;
  formName: string | null;
  senderName: string | null;
  senderEmail: string | null;
  senderPhone: string | null;
  message: string | null;
  data: Record<string, any>;
  origin: string | null;
  ipAddress: string | null;
  status: 'new' | 'read' | 'replied' | 'converted' | 'spam';
  createdAt: string;
  isExistingClient?: boolean;
  convertedClientId?: number | null;
  matchedClientName?: string | null;
}

export interface EmailLogItem {
  id: number;
  messageId: string;
  from: string;
  to: string;
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounced';
  source: 'api' | 'form' | 'dashboard' | 'schedule';
  openCount: number;
  clickCount: number;
  errorMessage?: string;
  openedAt?: string;
  clickedAt?: string;
  createdAt: string;
}

export interface IndustryOption {
  key: string;
  name: string;
  description: string;
  icon: string;
  variables: { key: string; label: string; example: string }[];
}

export async function getIndustries(): Promise<IndustryOption[]> {
  return apiRequest<IndustryOption[]>('/developer/industries', { method: 'GET' });
}

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  return apiRequest<ApiKeyItem[]>('/developer/api-keys', { method: 'GET', requiresAuth: true });
}

export async function createApiKey(dto: {
  name: string;
  keyType: 'public' | 'secret';
  allowedDomains?: string[];
}): Promise<ApiKeyItem> {
  return apiRequest<ApiKeyItem>('/developer/api-keys', {
    method: 'POST',
    body: dto,
    requiresAuth: true,
  });
}

export async function revokeApiKey(id: number): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/developer/api-keys/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

export async function getFormSubmissions(status?: string): Promise<FormSubmissionItem[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<FormSubmissionItem[]>(`/developer/inbox${query}`, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function updateSubmissionStatus(
  id: number,
  status: 'new' | 'read' | 'replied' | 'converted' | 'spam',
): Promise<FormSubmissionItem> {
  return apiRequest<FormSubmissionItem>(`/developer/inbox/${id}/status`, {
    method: 'PATCH',
    body: { status },
    requiresAuth: true,
  });
}

export async function convertSubmissionToClient(id: number): Promise<{
  success: boolean;
  alreadyExists: boolean;
  client: any;
  message: string;
}> {
  return apiRequest<{
    success: boolean;
    alreadyExists: boolean;
    client: any;
    message: string;
  }>(`/developer/inbox/${id}/convert-to-client`, {
    method: 'POST',
    requiresAuth: true,
  });
}

export async function deleteFormSubmission(id: number): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/developer/inbox/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

export async function getDeliveryLogs(status?: string): Promise<EmailLogItem[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<EmailLogItem[]>(`/developer/logs${query}`, {
    method: 'GET',
    requiresAuth: true,
  });
}

export interface WebhookItem {
  id: number;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export async function getWebhooks(): Promise<WebhookItem[]> {
  return apiRequest<WebhookItem[]>('/developer/webhooks', { method: 'GET', requiresAuth: true });
}

export async function createWebhook(dto: { url: string; events: string[] }): Promise<WebhookItem> {
  return apiRequest<WebhookItem>('/developer/webhooks', {
    method: 'POST',
    body: dto,
    requiresAuth: true,
  });
}

export async function deleteWebhook(id: number): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/developer/webhooks/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

export interface DomainCheckResult {
  domain: string;
  spf: { valid: boolean; record: string | null };
  dmarc: { valid: boolean; record: string | null };
  recommendedRecords: {
    spf: string;
    dmarc: string;
  };
}

export async function verifyDomainRecords(domain: string): Promise<DomainCheckResult> {
  return apiRequest<DomainCheckResult>(
    `/api/v1/compliance/verify-domain?domain=${encodeURIComponent(domain)}`,
    {
      method: 'GET',
      requiresAuth: false,
    },
  );
}

