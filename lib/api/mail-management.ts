// Mail Management API - Backend endpoints only

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG, TOKEN_KEYS } from './config';
import type { MailAttachment, SavedSegment, ScheduleEmailRequest, SegmentSend } from './types';

export async function getRecipients(
  organizationId?: number
): Promise<unknown> {
  const url = organizationId
    ? `${API_CONFIG.endpoints.mailManagement.recipients}?organizationId=${organizationId}`
    : API_CONFIG.endpoints.mailManagement.recipients;
  return apiRequestWithRefresh(url, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function getOrgMails(
  organizationId?: number
): Promise<unknown> {
  const url = organizationId
    ? `${API_CONFIG.endpoints.mailManagement.orgMails}?organizationId=${organizationId}`
    : API_CONFIG.endpoints.mailManagement.orgMails;
  return apiRequestWithRefresh(url, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function getMailTemplates(): Promise<unknown> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.mailManagement.templates, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function scheduleEmail(data: ScheduleEmailRequest): Promise<unknown> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.mailManagement.schedule, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

/** Upload one file (max 10 MB) to attach to a send. */
export async function uploadMailAttachment(file: File): Promise<MailAttachment> {
  const form = new FormData()
  form.append('file', file)
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEYS.accessToken) : null
  const res = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.mailManagement.attachments}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null) as { message?: string | string[] } | null
    const msg = Array.isArray(err?.message) ? err.message.join(', ') : err?.message
    throw new Error(res.status === 413 ? 'Files can be up to 10 MB each.' : msg || `Upload failed (${res.status})`)
  }
  return res.json()
}

/** One message to many recipients, queued and sent by the server (the tab can be closed). */
/** Which of these addresses are unsubscribed or bounced for the org. */
export async function checkSuppressions(emails: string[]): Promise<{ suppressed: { email: string; reason: string }[] }> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.mailManagement.suppressionCheck, {
    method: 'POST',
    body: { emails },
    requiresAuth: true,
  });
}

export async function sendBulkEmail(data: {
  templateId?: number;
  subject?: string;
  body?: string;
  recipients: { email: string; variables?: Record<string, string>; attachments?: MailAttachment[] }[];
  cc?: string;
  bcc?: string;
  attachments?: MailAttachment[];
  segment?: SegmentSend;
}): Promise<{ id: number; queued: number }> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.mailManagement.sendBulk, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  }) as Promise<{ id: number; queued: number }>;
}

/** An unsent email saved from Send Mails; `data` is whatever that page stored */
export interface ServerDraft {
  id: number;
  title: string;
  data: unknown;
  updatedAt: string;
}

/** The signed-in person's unsent emails, newest first */
export async function listDrafts(): Promise<ServerDraft[]> {
  return apiRequestWithRefresh<ServerDraft[]>(API_CONFIG.endpoints.mailManagement.drafts, { method: 'GET', requiresAuth: true });
}

export async function createDraft(title: string, data: unknown): Promise<ServerDraft> {
  return apiRequestWithRefresh<ServerDraft>(API_CONFIG.endpoints.mailManagement.drafts, { method: 'POST', body: { title, data }, requiresAuth: true });
}

export async function updateDraft(id: number, body: { title?: string; data?: unknown }): Promise<ServerDraft> {
  return apiRequestWithRefresh<ServerDraft>(`${API_CONFIG.endpoints.mailManagement.drafts}/${id}`, { method: 'PATCH', body, requiresAuth: true });
}

export async function deleteDraft(id: number): Promise<void> {
  return apiRequestWithRefresh<void>(`${API_CONFIG.endpoints.mailManagement.drafts}/${id}`, { method: 'DELETE', requiresAuth: true });
}

/** Saved groups of the organization */
export async function listSegments(): Promise<SavedSegment[]> {
  return apiRequestWithRefresh<SavedSegment[]>(API_CONFIG.endpoints.clients.segments, { method: 'GET', requiresAuth: true });
}

export async function saveSegment(name: string, rules: SegmentSend['rules']): Promise<SavedSegment> {
  return apiRequestWithRefresh<SavedSegment>(API_CONFIG.endpoints.clients.segments, { method: 'POST', body: { name, rules }, requiresAuth: true });
}

export async function updateSegment(id: number, data: { name?: string; rules?: SegmentSend['rules'] }): Promise<SavedSegment> {
  return apiRequestWithRefresh<SavedSegment>(`${API_CONFIG.endpoints.clients.segments}/${id}`, { method: 'PATCH', body: data, requiresAuth: true });
}

export async function deleteSegment(id: number): Promise<void> {
  return apiRequestWithRefresh<void>(`${API_CONFIG.endpoints.clients.segments}/${id}`, { method: 'DELETE', requiresAuth: true });
}

export async function listSchedules(status?: string): Promise<unknown> {
  const url = status
    ? `${API_CONFIG.endpoints.mailManagement.schedules}?status=${encodeURIComponent(status)}`
    : API_CONFIG.endpoints.mailManagement.schedules;
  return apiRequestWithRefresh(url, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function getScheduleById(id: number | string): Promise<unknown> {
  return apiRequestWithRefresh(
    API_CONFIG.endpoints.mailManagement.scheduleById(id),
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
}

export async function updateSchedule(
  id: number | string,
  data: { scheduledAt?: string; recipientEmails?: string[]; variables?: Record<string, string>; subject?: string; body?: string }
): Promise<unknown> {
  return apiRequestWithRefresh(
    API_CONFIG.endpoints.mailManagement.scheduleById(id),
    {
      method: 'PATCH',
      body: data,
      requiresAuth: true,
    }
  );
}

/** What happened to one recipient of a send */
export interface Delivery {
  id: number;
  email: string;
  status: 'sent' | 'failed' | 'skipped';
  reason: string | null;
  at: string;
}

export async function getDeliveries(scheduleId: number | string): Promise<Delivery[]> {
  return apiRequestWithRefresh<Delivery[]>(`${API_CONFIG.endpoints.mailManagement.scheduleById(scheduleId)}/deliveries`, { method: 'GET', requiresAuth: true });
}

/** Send the same email again now, to the recipients it failed for */
export async function resendFailed(scheduleId: number | string): Promise<{ id: number; queued: number }> {
  return apiRequestWithRefresh<{ id: number; queued: number }>(`${API_CONFIG.endpoints.mailManagement.scheduleById(scheduleId)}/resend-failed`, { method: 'POST', requiresAuth: true });
}

export async function cancelSchedule(id: number | string): Promise<void> {
  return apiRequestWithRefresh<void>(
    API_CONFIG.endpoints.mailManagement.scheduleById(id),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

export async function listRecurringSchedules(): Promise<unknown> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.mailManagement.recurring, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function stopRecurringSchedule(id: number | string): Promise<unknown> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.mailManagement.recurringStop(id), {
    method: 'PATCH',
    requiresAuth: true,
  });
}

export async function startRecurringSchedule(id: number | string): Promise<unknown> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.mailManagement.recurringStart(id), {
    method: 'PATCH',
    requiresAuth: true,
  });
}

export async function updateRecurringSchedule(
  id: number | string,
  data: { months?: number[]; days?: number[]; times?: string[]; recipientEmails?: string[] }
): Promise<unknown> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.mailManagement.recurringById(id), {
    method: 'PATCH',
    body: data,
    requiresAuth: true,
  });
}

export async function deleteRecurringSchedule(id: number | string): Promise<void> {
  return apiRequestWithRefresh<void>(API_CONFIG.endpoints.mailManagement.recurringById(id), {
    method: 'DELETE',
    requiresAuth: true,
  });
}
