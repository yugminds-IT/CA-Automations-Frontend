// The guided setup for a new workspace: units, an industry pipeline, a sending account, the team and a form.
// Progress is kept on the device. Two steps are detected from the server; the rest are marked by hand.

import type { UnitStructure } from "./unit-structure";

export type OnboardingStepId = "units" | "pipeline" | "mail" | "team" | "form";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: "units", title: "Set up your units and brands", description: "A unit is a place, like a plant or an office. Add each unit, then the brands that run inside it." },
  { id: "pipeline", title: "Pick an industry pipeline", description: "Start from stages written for your kind of business. You can change them later." },
  { id: "mail", title: "Connect a sending account", description: "Send and receive email from your own domain, not a shared address." },
  { id: "team", title: "Invite your team", description: "Add colleagues and choose what each person can see." },
  { id: "form", title: "Put a form on your website", description: "Every enquiry lands in the CRM and is assigned automatically." },
];

const UNITS_COPY = {
  multi_unit: {
    title: "Set up your units and brands",
    description: "A unit is a place, like a plant or an office. Add each unit, then the brands that run inside it.",
  },
  brands: {
    title: "Set up your brands",
    description: "Add the brands your business runs. Each one has its own leads, pipeline and sending address.",
  },
};

/**
 * The steps this workspace sees. A single-brand layout has no units or brands to set up, so that step
 * is dropped. The wording of the setup step follows the layout the business chose at signup.
 */
export function onboardingSteps(adminPanel: boolean = true, structure: UnitStructure = "multi_unit"): OnboardingStep[] {
  if (!adminPanel) return ONBOARDING_STEPS.filter((s) => s.id !== "units");
  const copy = structure === "multi_unit" ? UNITS_COPY.multi_unit : UNITS_COPY.brands;
  return ONBOARDING_STEPS.map((s) => (s.id === "units" ? { ...s, ...copy } : s));
}

/**
 * Has the setup step been done? Multiple units: a second unit, or brands under the first. One unit with
 * several brands: a second brand. The default unit and brand are created for you, so they never count.
 */
export function unitsStepDetected(structure: UnitStructure, activeUnits: number, activeBrands: number): boolean {
  if (structure === "multi_unit") return activeUnits > 1 || activeBrands > 1;
  if (structure === "one_unit_multi_brand") return activeBrands > 1;
  return true;
}

export type OnboardingProgress = Partial<Record<OnboardingStepId, boolean>>;

const KEY = "lekvya.onboarding.v1";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadOnboarding(store: KeyValueStore | null): OnboardingProgress {
  if (!store) return {};
  try {
    const raw = store.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: OnboardingProgress = {};
    for (const step of ONBOARDING_STEPS) {
      if (typeof (parsed as Record<string, unknown>)[step.id] === "boolean") out[step.id] = (parsed as Record<string, boolean>)[step.id];
    }
    return out;
  } catch {
    return {};
  }
}

export function saveOnboarding(store: KeyValueStore | null, progress: OnboardingProgress): void {
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage blocked. The wizard still works for this visit.
  }
}

/** A step counts as done if it was marked, or if the server shows it is already in place. */
export function isStepDone(id: OnboardingStepId, marked: OnboardingProgress, detected: OnboardingProgress): boolean {
  return Boolean(marked[id] || detected[id]);
}

export function progressOf(marked: OnboardingProgress, detected: OnboardingProgress, steps: OnboardingStep[] = ONBOARDING_STEPS) {
  const done = steps.filter((s) => isStepDone(s.id, marked, detected)).length;
  return { done, total: steps.length, complete: done === steps.length };
}

/** The first step not yet done, or null when everything is finished. */
export function nextOpenStep(
  marked: OnboardingProgress,
  detected: OnboardingProgress,
  steps: OnboardingStep[] = ONBOARDING_STEPS,
): OnboardingStepId | null {
  return steps.find((s) => !isStepDone(s.id, marked, detected))?.id ?? null;
}
