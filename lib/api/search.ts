// Global search across leads, lead tasks, clients and contacts. Backend: search/ (GET /search).
import { apiRequestWithRefresh } from './interceptor';

export interface SearchHit {
  id: number;
  label: string;
  sublabel: string | null;
  businessUnitId: number | null;
  href: string;
}

export interface GlobalSearchResult {
  query: string;
  leads: SearchHit[];
  tasks: SearchHit[];
  clients: SearchHit[];
  contacts: SearchHit[];
}

export const globalSearch = (q: string, businessUnitId?: number | null) => {
  const params = new URLSearchParams({ q, limit: '5' });
  if (businessUnitId) params.set('businessUnitId', String(businessUnitId));
  return apiRequestWithRefresh<GlobalSearchResult>(`/search?${params.toString()}`, { method: 'GET', requiresAuth: true });
};
