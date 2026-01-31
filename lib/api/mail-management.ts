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

export async function cancelSchedule(id: number | string): Promise<void> {
  return apiRequestWithRefresh<void>(
    API_CONFIG.endpoints.mailManagement.scheduleById(id),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}
