import { describe, expect, it } from "vitest";
import { ONBOARDING_STEPS, loadOnboarding, nextOpenStep, onboardingSteps, progressOf, saveOnboarding, unitsStepDetected, type KeyValueStore } from "./onboarding";

function memory(): KeyValueStore & { raw: Map<string, string> } {
  const raw = new Map<string, string>();
  return { raw, getItem: (k) => raw.get(k) ?? null, setItem: (k, v) => void raw.set(k, v) };
}

describe("onboarding progress", () => {
  it("counts a step as done when marked or detected", () => {
    expect(progressOf({ team: true }, { units: true })).toEqual({ done: 2, total: ONBOARDING_STEPS.length, complete: false });
  });

  it("is complete only when every step is done", () => {
    const all = Object.fromEntries(ONBOARDING_STEPS.map((s) => [s.id, true]));
    expect(progressOf(all, {}).complete).toBe(true);
    expect(nextOpenStep(all, {})).toBeNull();
  });

  it("points at the first open step, in order", () => {
    expect(nextOpenStep({}, {})).toBe("units");
    expect(nextOpenStep({ units: true }, { pipeline: true })).toBe("mail");
  });

  it("drops the business units step for a single-branch workspace", () => {
    expect(onboardingSteps(true)).toEqual(ONBOARDING_STEPS);
    const steps = onboardingSteps(false);
    expect(steps.map((s) => s.id)).toEqual(["pipeline", "mail", "team", "form"]);
    // A hidden step neither counts toward progress nor blocks completion.
    expect(progressOf({}, {}, steps)).toEqual({ done: 0, total: 4, complete: false });
    expect(nextOpenStep({}, {}, steps)).toBe("pipeline");
    const all = Object.fromEntries(steps.map((s) => [s.id, true]));
    expect(progressOf(all, {}, steps).complete).toBe(true);
  });

  it("words the setup step after the chosen layout", () => {
    const multi = onboardingSteps(true, "multi_unit").find((s) => s.id === "units");
    const brands = onboardingSteps(true, "one_unit_multi_brand").find((s) => s.id === "units");
    expect(multi?.title).toBe("Set up your units and brands");
    expect(brands?.title).toBe("Set up your brands");
    // The other steps are untouched.
    expect(onboardingSteps(true, "one_unit_multi_brand").map((s) => s.id)).toEqual(["units", "pipeline", "mail", "team", "form"]);
  });

  it("detects the setup step from the units and brands that exist", () => {
    // multiple units: a second unit, or brands under the first, counts. The defaults alone do not.
    expect(unitsStepDetected("multi_unit", 1, 1)).toBe(false);
    expect(unitsStepDetected("multi_unit", 2, 2)).toBe(true);
    expect(unitsStepDetected("multi_unit", 1, 3)).toBe(true);
    // one unit with several brands: needs a second brand
    expect(unitsStepDetected("one_unit_multi_brand", 1, 1)).toBe(false);
    expect(unitsStepDetected("one_unit_multi_brand", 1, 2)).toBe(true);
    // single-brand layouts have nothing to set up
    expect(unitsStepDetected("one_unit_one_brand", 1, 1)).toBe(true);
    expect(unitsStepDetected("one_unit_no_brand", 1, 1)).toBe(true);
  });

  it("round-trips marks through storage and ignores junk", () => {
    const store = memory();
    saveOnboarding(store, { units: true, form: false });
    expect(loadOnboarding(store)).toEqual({ units: true, form: false });
    store.raw.set("lekvya.onboarding.v1", "not json");
    expect(loadOnboarding(store)).toEqual({});
    store.raw.set("lekvya.onboarding.v1", JSON.stringify({ units: "yes", team: true }));
    expect(loadOnboarding(store)).toEqual({ team: true });
  });
});
