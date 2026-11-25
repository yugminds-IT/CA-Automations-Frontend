import type { PricingPlan, PricingPlanInput } from "@/lib/api/pricing-plans";

export type FormState = Omit<PricingPlanInput, "features" | "badge" | "trialText"> & {
  badge: string;
  trialText: string;
  features: string; // one per line
};

export const EMPTY_FORM: FormState = {
  name: "",
  price: "",
  period: "/month",
  description: "",
  badge: "",
  trialText: "",
  buttonText: "Start Free Trial",
  buttonLink: "/signup",
  features: "",
  isHighlighted: false,
  sortOrder: 0,
  isActive: true,
};

export function planToForm(p: PricingPlan): FormState {
  return { ...p, badge: p.badge ?? "", trialText: p.trialText ?? "", features: p.features.join("\n") };
}

export function formToInput(f: FormState): PricingPlanInput {
  return {
    ...f,
    badge: f.badge.trim() || null,
    trialText: f.trialText.trim() || null,
    features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
    sortOrder: Number(f.sortOrder) || 0,
  };
}

