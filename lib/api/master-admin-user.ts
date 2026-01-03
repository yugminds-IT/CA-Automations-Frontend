// Master Admin User API Functions

import { apiRequest } from './client';
import { API_CONFIG } from './config';
import type {
  MasterAdminCreateUserRequest,
  MasterAdminCreateUserResponse,
  MasterAdminUpdateUserRequest,
  MasterAdminGetUsersParams,
  MasterAdminGetUsersResponse,
  User,
} from './types';

/**
 * List all users across all organizations with pagination and optional filters
 */
export async function masterAdminGetUsers(
  params: MasterAdminGetUsersParams = {}
): Promise<MasterAdminGetUsersResponse> {
  const { skip = 0, limit = 100, org_id, role, search = '' } = params;
  
  const queryParams = new URLSearchParams();
  if (skip !== undefined) queryParams.append('skip', skip.toString());
  if (limit !== undefined) queryParams.append('limit', limit.toString());
  if (org_id !== undefined) queryParams.append('org_id', org_id.toString());
  if (role) queryParams.append('role', role);
  if (search) queryParams.append('search', search);
  
  const queryString = queryParams.toString();
  const endpoint = `${API_CONFIG.endpoints.masterAdmin.user.list}${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiRequest<MasterAdminGetUsersResponse>(
    endpoint,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get user by ID
 */
export async function masterAdminGetUserById(id: number): Promise<User> {
  const response = await apiRequest<User>(
    API_CONFIG.endpoints.masterAdmin.user.get(id),
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Create a new user
 */
export async function masterAdminCreateUser(
  data: MasterAdminCreateUserRequest
): Promise<MasterAdminCreateUserResponse> {
  const response = await apiRequest<MasterAdminCreateUserResponse>(
    API_CONFIG.endpoints.masterAdmin.user.create,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Update a user
 */
export async function masterAdminUpdateUser(
  id: number,
  data: MasterAdminUpdateUserRequest
): Promise<User> {
  const response = await apiRequest<User>(
    API_CONFIG.endpoints.masterAdmin.user.update(id),
    {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Delete a user
 */
export async function masterAdminDeleteUser(id: number): Promise<void> {
  await apiRequest<void>(
    API_CONFIG.endpoints.masterAdmin.user.delete(id),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

