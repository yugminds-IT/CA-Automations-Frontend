// Notifications API

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';

export interface AppNotification {
  id: number;
  type: string;
  organizationId: number | null;
  clientId: number | null;
  clientName: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  total: number;
  unread: number;
}

export async function listNotifications(params?: {
  skip?: number;
  limit?: number;
}): Promise<NotificationsResponse> {
  const qs = new URLSearchParams();
  if (params?.skip != null) qs.set('skip', String(params.skip));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const url = qs.toString()
    ? `${API_CONFIG.endpoints.notifications.base}?${qs}`
    : API_CONFIG.endpoints.notifications.base;
  return apiRequestWithRefresh<NotificationsResponse>(url, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function markNotificationRead(id: number): Promise<AppNotification> {
  return apiRequestWithRefresh<AppNotification>(
    API_CONFIG.endpoints.notifications.markRead(id),
    { method: 'PATCH', requiresAuth: true },
  );
}

export async function markAllNotificationsRead(): Promise<{ message: string }> {
  return apiRequestWithRefresh<{ message: string }>(
    API_CONFIG.endpoints.notifications.readAll,
    { method: 'PATCH', requiresAuth: true },
  );
}
