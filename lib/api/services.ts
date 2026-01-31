// Services API - Backend endpoints only

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import type { Service, CreateServiceRequest } from './types';

export async function listServices(organizationId?: number): Promise<Service[]> {
  const url = organizationId
    ? `${API_CONFIG.endpoints.services.base}?organizationId=${organizationId}`
    : API_CONFIG.endpoints.services.base;
  return apiRequestWithRefresh<Service[]>(url, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function createService(data: CreateServiceRequest): Promise<Service> {
  return apiRequestWithRefresh<Service>(API_CONFIG.endpoints.services.base, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}
