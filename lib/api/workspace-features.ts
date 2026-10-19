import { apiRequest } from './client';

export interface WorkspaceFeatureItem {
  id: number;
  key: string;
  name: string;
  badge: string;
  description: string;
  icon: string;
  gradient: string;
  colSpan?: string | null;
  priority: number;
  isLocked: boolean;
  lockReason?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getPublicWorkspaceFeatures(): Promise<WorkspaceFeatureItem[]> {
  try {
    return await apiRequest<WorkspaceFeatureItem[]>('/api/v1/workspace-features', {
      method: 'GET',
    });
  } catch (err) {
    console.warn('Failed to fetch workspace features from backend, using default fallback', err);
    return [];
  }
}

export async function getMasterAdminWorkspaceFeatures(): Promise<WorkspaceFeatureItem[]> {
  return apiRequest<WorkspaceFeatureItem[]>('/master-admin/workspace-features', {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function updateWorkspaceFeature(
  key: string,
  data: Partial<Omit<WorkspaceFeatureItem, 'id' | 'key' | 'createdAt' | 'updatedAt'>>,
): Promise<WorkspaceFeatureItem> {
  return apiRequest<WorkspaceFeatureItem>(`/master-admin/workspace-features/${key}`, {
    method: 'PATCH',
    body: data,
    requiresAuth: true,
  });
}

export async function reorderWorkspaceFeatures(
  items: { key: string; priority: number }[],
): Promise<WorkspaceFeatureItem[]> {
  return apiRequest<WorkspaceFeatureItem[]>('/master-admin/workspace-features/reorder', {
    method: 'PATCH',
    body: { items },
    requiresAuth: true,
  });
}

export async function resetWorkspaceFeatures(): Promise<WorkspaceFeatureItem[]> {
  return apiRequest<WorkspaceFeatureItem[]>('/master-admin/workspace-features/reset-defaults', {
    method: 'POST',
    requiresAuth: true,
  });
}
