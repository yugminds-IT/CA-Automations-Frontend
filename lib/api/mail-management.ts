// Mail Management API - Backend endpoints only

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import type { ScheduleEmailRequest } from './types';

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
