// Master Admin Organization API Functions

import { apiRequest } from './client';
import { API_CONFIG } from './config';
import type {
  MasterAdminCreateOrganizationRequest,
  MasterAdminCreateOrganizationResponse,
  MasterAdminUpdateOrganizationRequest,
  MasterAdminGetOrganizationsParams,
  MasterAdminGetOrganizationsResponse,
  Organization,
} from './types';

/**
 * List all organizations with pagination and optional search
 */
export async function masterAdminGetOrganizations(
  params: MasterAdminGetOrganizationsParams = {}
): Promise<MasterAdminGetOrganizationsResponse> {
  const { skip = 0, limit = 100, search = '' } = params;
  
  const queryParams = new URLSearchParams();
  if (skip !== undefined) queryParams.append('skip', skip.toString());
  if (limit !== undefined) queryParams.append('limit', limit.toString());
  if (search) queryParams.append('search', search);
  
  const queryString = queryParams.toString();
  const endpoint = `${API_CONFIG.endpoints.masterAdmin.org.list}${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiRequest<MasterAdminGetOrganizationsResponse>(
    endpoint,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get organization by ID
 */
export async function masterAdminGetOrganizationById(id: number): Promise<Organization> {
  const response = await apiRequest<Organization>(
    API_CONFIG.endpoints.masterAdmin.org.get(id),
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Create a new organization
 */
export async function masterAdminCreateOrganization(
  data: MasterAdminCreateOrganizationRequest
): Promise<MasterAdminCreateOrganizationResponse> {
  const response = await apiRequest<MasterAdminCreateOrganizationResponse>(
    API_CONFIG.endpoints.masterAdmin.org.create,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Update an organization
 */
export async function masterAdminUpdateOrganization(
  id: number,
  data: MasterAdminUpdateOrganizationRequest
): Promise<Organization> {
  const response = await apiRequest<Organization>(
    API_CONFIG.endpoints.masterAdmin.org.update(id),
    {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Delete an organization
 */
export async function masterAdminDeleteOrganization(id: number): Promise<void> {
  await apiRequest<void>(
    API_CONFIG.endpoints.masterAdmin.org.delete(id),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

