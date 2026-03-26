// Master Admin API — real endpoints served by /master-admin/* (MASTER_ADMIN role only)

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import { getAccessToken } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MasterAdminStats {
  totalUsers: number;
  totalOrganizations: number;
  totalEmailTemplates: number;
  usersByRole: Record<string, number>;
  recentUsers: number;
  recentOrganizations: number;
  monthlyRegistrations: Array<{
    month: string;
    year: number;
    users: number;
    organizations: number;
  }>;
}

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  entityType: string;
  entityId: number;
  timestamp: string;
}

export interface MasterAdminAnalytics extends MasterAdminStats {
  userGrowthPercent: number;
  newOrganizationsThisMonth: number;
  emailsSentThisWeek: number;
  usersByRolePercent: Record<string, number>;
}

export interface ActivityLog {
  id: number;
  type: string; // 'login' | 'logout' | 'login_failed' | 'error' | 'info'
  userId: number | null;
  userEmail: string | null;
  userRole: string | null;
  organizationId: number | null;
  orgName: string | null;
  method: string | null;
  path: string | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  statusCode: number | null;
  durationMs: number | null;
  isError: boolean;
  createdAt: string;
}

export interface ActivityLogsResponse {
  logs: ActivityLog[];
  total: number;
}

export interface MasterAdminNotification {
  id: string;
  type: string;
  title: string;
  description: string;
  entityType: string;
  entityId: number;
  timestamp: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function getMasterAdminStats(): Promise<MasterAdminStats> {
  return apiRequestWithRefresh<MasterAdminStats>(
    API_CONFIG.endpoints.masterAdmin.stats,
    { method: 'GET', requiresAuth: true },
  );
}

export function getMasterAdminActivity(limit = 20): Promise<ActivityEvent[]> {
  return apiRequestWithRefresh<ActivityEvent[]>(
    `${API_CONFIG.endpoints.masterAdmin.activity}?limit=${limit}`,
    { method: 'GET', requiresAuth: true },
  );
}

export function getMasterAdminAnalytics(): Promise<MasterAdminAnalytics> {
  return apiRequestWithRefresh<MasterAdminAnalytics>(
    API_CONFIG.endpoints.masterAdmin.analytics,
    { method: 'GET', requiresAuth: true },
  );
}

export function getMasterAdminNotifications(
  limit = 20,
): Promise<MasterAdminNotification[]> {
  return apiRequestWithRefresh<MasterAdminNotification[]>(
    `${API_CONFIG.endpoints.masterAdmin.notifications}?limit=${limit}`,
    { method: 'GET', requiresAuth: true },
  );
}

/**
 * Trigger a CSV download by navigating to the export URL with the auth token.
 * Opens in the same tab; browser will download the file directly.
 */
export function downloadMasterAdminCsv(type: 'users' | 'organizations'): void {
  const token = getAccessToken();
  const baseUrl = API_CONFIG.baseUrl;
  const path =
    type === 'users'
      ? API_CONFIG.endpoints.masterAdmin.exportUsers
      : API_CONFIG.endpoints.masterAdmin.exportOrganizations;

  // Create a temporary anchor with the Bearer token as a query param.
  // (Backend reads Authorization header; for file downloads we use a short-lived
  //  fetch + blob approach instead.)
  const url = `${baseUrl}${path}`;
  fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    });
}

export function getActivityLogs(opts?: {
  type?: string;
  limit?: number;
  offset?: number;
  since?: string;
}): Promise<ActivityLogsResponse> {
  const params = new URLSearchParams();
  if (opts?.type && opts.type !== 'all') params.set('type', opts.type);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.since) params.set('since', opts.since);
  const qs = params.toString();
  return apiRequestWithRefresh<ActivityLogsResponse>(
    `${API_CONFIG.endpoints.masterAdmin.activityLogs}${qs ? `?${qs}` : ''}`,
    { method: 'GET', requiresAuth: true },
  );
}

export function deleteUser(userId: number): Promise<void> {
  return apiRequestWithRefresh<void>(
    `${API_CONFIG.endpoints.users.byId(userId)}`,
    { method: 'DELETE', requiresAuth: true },
  );
}
