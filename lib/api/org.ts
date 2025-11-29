// Organization API Functions

import { apiRequest } from './client';
import { API_CONFIG } from './config';
import type {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
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
      requiresAuth: true, // If auth is required in future
    }
  );
  return response;
}

