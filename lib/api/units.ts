// Units: the places a business operates from (a plant, an office, a city). Brands (see business-units.ts)
// sit inside a unit and own the leads, forms and mail. Backend: business-units/ (GET/POST/PATCH /units).
import { apiRequestWithRefresh } from './interceptor';

export interface OrgUnit {
  id: number;
  organizationId: number;
  name: string;
  city: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface CreateOrgUnitInput {
  name: string;
  city?: string;
}

/** An empty `city` clears it. */
export interface UpdateOrgUnitInput {
  name?: string;
  city?: string;
  isActive?: boolean;
}

const base = '/units';

export const listOrgUnits = () => apiRequestWithRefresh<OrgUnit[]>(base, { method: 'GET', requiresAuth: true });

export const createOrgUnit = (data: CreateOrgUnitInput) =>
  apiRequestWithRefresh<OrgUnit>(base, { method: 'POST', body: data, requiresAuth: true });

export const updateOrgUnit = (id: number, data: UpdateOrgUnitInput) =>
  apiRequestWithRefresh<OrgUnit>(`${base}/${id}`, { method: 'PATCH', body: data, requiresAuth: true });
