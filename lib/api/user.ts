// User API Functions

import { apiRequest } from './client';
import { API_CONFIG } from './config';
import type {
  CreateUserRequest,
  CreateUserResponse,
} from './types';

/**
 * Create User (Employee)
 * Admin can create employee users for their organization
 */
export async function createUser(
  data: CreateUserRequest
): Promise<CreateUserResponse> {
  const response = await apiRequest<CreateUserResponse>(
    API_CONFIG.endpoints.user.create,
    {
      method: 'POST',
      body: data,
      requiresAuth: true, // If auth is required in future
    }
  );
  return response;
}

