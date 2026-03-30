// Dashboard API

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';

export interface DashboardStats {
  totalClients: number;
  pendingEmails: number;
  sentEmails: number;
  failedEmails: number;
  totalTemplates: number;
  successRate: number;
  recentActivity: {
    id: number;
    status: 'sent' | 'failed' | 'pending' | 'cancelled';
    recipientEmails: string[];
    templateName: string | null;
    isCustom: boolean;
    scheduledAt: string;
    sentAt: string | null;
  }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiRequestWithRefresh<DashboardStats>(API_CONFIG.endpoints.dashboard.stats, {
    method: 'GET',
    requiresAuth: true,
  });
}
