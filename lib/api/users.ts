// Users API - Backend endpoints only

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import type { CreateEmployeeRequest, User } from './types';

export async function createEmployee(data: CreateEmployeeRequest): Promise<User> {
  return apiRequestWithRefresh<User>(API_CONFIG.endpoints.users.employees, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

export async function listUsers(organizationId?: number): Promise<User[]> {
  const url = organizationId
    ? `${API_CONFIG.endpoints.users.base}?organizationId=${organizationId}`
    : API_CONFIG.endpoints.users.base;
  return apiRequestWithRefresh<User[]>(url, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function getUserById(id: number | string): Promise<User> {
  return apiRequestWithRefresh<User>(API_CONFIG.endpoints.users.byId(id), {
    method: 'GET',
    requiresAuth: true,
  });
}
