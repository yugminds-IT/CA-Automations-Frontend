// Health Check API - Backend endpoint only

import { apiRequest } from './client';
import { API_CONFIG } from './config';

export async function healthCheck(): Promise<unknown> {
  return apiRequest(API_CONFIG.endpoints.health, { method: 'GET' });
}

