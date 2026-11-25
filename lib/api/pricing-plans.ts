import { apiRequest } from './client';

export interface PricingPlan {
  id: number;
  name: string;
  price: string;
  period: string;
  description: string;
  badge: string | null;
  trialText: string | null;
  buttonText: string;
  buttonLink: string;
  features: string[];
  isHighlighted: boolean;
  sortOrder: number;
  isActive: boolean;
}

export type PricingPlanInput = Omit<PricingPlan, 'id'>;

/** Shown when the backend is unreachable, so the marketing page never loses its pricing. Mirrors the DB seed. */
export const DEFAULT_PRICING_PLANS: PricingPlan[] = [
  {
    id: -1,
    name: 'Basic',
    price: '₹499',
    period: '/month',
    badge: 'Most Popular',
    trialText: '7-day Free Trial',
    description: 'Perfect for individual CAs and small firms getting started.',
    buttonText: 'Start Free Trial',
    buttonLink: '/signup',
    isHighlighted: true,
    sortOrder: 1,
    isActive: true,
    features: [
      'Client Onboarding System',
      'Bulk Email Scheduler',
      '5 Custom Email Templates',
      'Pre-built Templates Library',
      'Organization Login',
      'Client Document Submission',
      'Basic Dashboard',
    ],
  },
  {
    id: -2,
    name: 'Pro',
    price: '₹699',
    period: '/month',
    badge: 'Coming Soon',
    trialText: null,
    description: 'For growing firms that need advanced automation and analytics.',
    buttonText: 'Join Waitlist',
    buttonLink: '/#contact',
    isHighlighted: false,
    sortOrder: 2,
    isActive: true,
    features: [
      'Everything in Basic, plus:',
      'Unlimited Custom Templates',
      'Advanced Email Analytics',
      'Priority Email Delivery',
      'Client Portal Login',
      'Team Collaboration',
      'API Access',
    ],
  },
  {
    id: -3,
    name: 'Premium',
    price: '₹999',
    period: '/month',
    badge: 'Coming Soon',
    trialText: null,
    description: 'Enterprise-grade features for large organizations.',
    buttonText: 'Join Waitlist',
    buttonLink: '/#contact',
    isHighlighted: false,
    sortOrder: 3,
    isActive: true,
    features: [
      'Everything in Pro, plus:',
      'White-label Branding',
      'Dedicated Account Manager',
      'Custom Integrations',
      'SLA Guarantee',
      'Advanced Security',
      'Unlimited Users',
    ],
  },
];

export async function getPublicPricingPlans(): Promise<PricingPlan[]> {
  try {
    return await apiRequest<PricingPlan[]>('/api/v1/pricing-plans');
  } catch (err) {
    console.warn('Failed to fetch pricing plans, using defaults', err);
    return DEFAULT_PRICING_PLANS;
  }
}

export function getAllPricingPlans(): Promise<PricingPlan[]> {
  return apiRequest<PricingPlan[]>('/master-admin/pricing-plans', { requiresAuth: true });
}

export function createPricingPlan(data: PricingPlanInput): Promise<PricingPlan> {
  return apiRequest<PricingPlan>('/master-admin/pricing-plans', {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

export function updatePricingPlan(id: number, data: Partial<PricingPlanInput>): Promise<PricingPlan> {
  return apiRequest<PricingPlan>(`/master-admin/pricing-plans/${id}`, {
    method: 'PATCH',
    body: data,
    requiresAuth: true,
  });
}

export function deletePricingPlan(id: number): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/master-admin/pricing-plans/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}
