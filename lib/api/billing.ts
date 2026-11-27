// Plan entitlements, usage and module state for the signed-in organization. Backend: billing/ (routes under /billing).
import { apiRequest } from './client';
import { apiRequestWithRefresh } from './interceptor';

export type PlanKey = 'starter' | 'growth' | 'premium' | 'enterprise';
export type ModuleKey = 'tds' | 'gst';

export interface PlanLimits {
  units: number | null;
  users: number | null;
  customFields: number | null;
  aiCreditsPerMonth: number;
  automations: boolean;
  whiteLabel: boolean;
  apiRequestsPerDay: number | null;
}

export interface BillingView {
  planKey: PlanKey;
  planName: string;
  limits: PlanLimits;
  usage: { units: number; users: number; customFields: number };
  ai: { used: number; limit: number; remaining: number };
  modules: Record<ModuleKey, boolean>;
  moduleOverrides: Partial<Record<ModuleKey, boolean>>;
}

export interface PlanCatalogItem extends PlanLimits {
  key: PlanKey;
  name: string;
}

export const getMyBilling = () =>
  apiRequestWithRefresh<BillingView>('/billing/me', { method: 'GET', requiresAuth: true });

export const getPlanCatalog = () =>
  apiRequestWithRefresh<PlanCatalogItem[]>('/billing/plans', { method: 'GET', requiresAuth: true });

/** The admin moves their own workspace to another plan. Fails with a plain reason if usage is over the smaller plan. */
export const changeMyPlan = (planKey: PlanKey) =>
  apiRequestWithRefresh<BillingView>('/billing/me/plan', { method: 'PATCH', body: { planKey }, requiresAuth: true });

/** The plans on offer, for the signup page where nobody is signed in yet. */
export const getPublicPlans = () =>
  apiRequest<PlanCatalogItem[]>('/public/plans', { method: 'GET', requiresAuth: false });
