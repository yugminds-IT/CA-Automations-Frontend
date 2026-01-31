// Business Types API - Backend endpoints only

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import type { BusinessType, CreateBusinessTypeRequest } from './types';

export async function listBusinessTypes(organizationId?: number): Promise<BusinessType[]> {
  const url = organizationId
    ? `${API_CONFIG.endpoints.businessTypes.base}?organizationId=${organizationId}`
    : API_CONFIG.endpoints.businessTypes.base;
  return apiRequestWithRefresh<BusinessType[]>(url, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function createBusinessType(
  data: CreateBusinessTypeRequest
): Promise<BusinessType> {
  return apiRequestWithRefresh<BusinessType>(API_CONFIG.endpoints.businessTypes.base, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}
