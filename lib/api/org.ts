// Organization API Functions

import { apiRequest } from './client';
import { API_CONFIG } from './config';
import type {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  Organization,
} from './types';

/**
 * Create Organization
 */
export async function createOrganization(
  data: CreateOrganizationRequest
): Promise<CreateOrganizationResponse> {
  const response = await apiRequest<CreateOrganizationResponse>(
    API_CONFIG.endpoints.org.create,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get all Organizations
 */
export async function getOrganizations(): Promise<Organization[]> {
  const response = await apiRequest<Organization[]>(
    API_CONFIG.endpoints.org.list,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

