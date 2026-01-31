// Organizations API - Backend endpoints only

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import type {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
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
