// Health Check API

import { apiRequest } from './client';
import { API_CONFIG } from './config';
import type { HealthResponse } from './types';

/**
 * Health Check - Verify API server is running
 */
export async function healthCheck(): Promise<HealthResponse> {
  const response = await apiRequest<HealthResponse>(
    API_CONFIG.endpoints.health,
    {
      method: 'GET',
    }
  );
  return response;
}

