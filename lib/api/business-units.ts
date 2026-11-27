// Business units: the sub-brands / divisions inside one organization (e.g. Tavaro's
// Resorts, Residences, Experiences, Wellness, MÀRE). Each unit has its own optional
// business profile (GSTIN, PAN, address). Records belong to exactly one unit.
import { apiRequestWithRefresh } from './interceptor';

export interface BusinessUnit {
  id: number;
  organizationId: number;
  name: string;
  slug: string;
  /** The unit (place) this brand sits in. */
  unitId: number | null;
  /** The name of that unit, so a brand list can tell repeated brand names apart. */
  unitName?: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  timezone: string;
  isDefault: boolean;
  isActive: boolean;
  businessProfileEnabled: boolean;
  legalName: string | null;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  invoicePrefix: string | null;
}

/** `null` clears an optional field on update. `undefined` leaves it unchanged. */
export interface CreateBusinessUnitInput {
  name: string;
  /** The unit to put the brand in. Defaults to the default unit. */
  unitId?: number;
  logoUrl?: string | null;
  brandColor?: string | null;
  timezone?: string;
  businessProfileEnabled?: boolean;
  legalName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  invoicePrefix?: string | null;
}

export type UpdateBusinessUnitInput = Partial<CreateBusinessUnitInput> & { isActive?: boolean };

const base = '/business-units';

export const listBusinessUnits = () =>
  apiRequestWithRefresh<BusinessUnit[]>(base, { method: 'GET', requiresAuth: true });

export const createBusinessUnit = (data: CreateBusinessUnitInput) =>
  apiRequestWithRefresh<BusinessUnit>(base, { method: 'POST', body: data, requiresAuth: true });

export const updateBusinessUnit = (id: number, data: UpdateBusinessUnitInput) =>
  apiRequestWithRefresh<BusinessUnit>(`${base}/${id}`, { method: 'PATCH', body: data, requiresAuth: true });

export const setDefaultBusinessUnit = (id: number) =>
  apiRequestWithRefresh<BusinessUnit>(`${base}/${id}/default`, { method: 'PATCH', requiresAuth: true });
