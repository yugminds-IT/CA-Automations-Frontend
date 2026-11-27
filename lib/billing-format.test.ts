import { describe, expect, it } from "vitest";
import { featureRows, limitLabel, planBlockers, planMove, usagePercent } from "./billing-format";

describe("billing format", () => {
  it("shows used against the cap, or unlimited", () => {
    expect(limitLabel(12, 15)).toBe("12 of 15");
    expect(limitLabel(12, null)).toBe("12 · Unlimited");
  });

  it("caps the usage bar at 100 and keeps unlimited empty", () => {
    expect(usagePercent(3, 15)).toBe(20);
    expect(usagePercent(30, 15)).toBe(100);
    expect(usagePercent(3, null)).toBe(0);
    expect(usagePercent(0, 0)).toBe(0);
  });

  it("lists every plan entitlement in plain words", () => {
    const rows = featureRows({
      units: null,
      users: 3,
      customFields: 10,
      aiCreditsPerMonth: 0,
      automations: false,
      whiteLabel: true,
      apiRequestsPerDay: null,
    });
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.value]));
    expect(byLabel["Business units"]).toBe("Unlimited");
    expect(byLabel["Active staff"]).toBe("3");
    expect(byLabel["Automations"]).toBe("Not included");
    expect(byLabel["White-label footer"]).toBe("Included");
  });

  it("tells an upgrade from a downgrade", () => {
    expect(planMove("starter", "growth")).toBe("upgrade");
    expect(planMove("premium", "starter")).toBe("downgrade");
    expect(planMove("growth", "growth")).toBe("current");
  });

  it("lists what is over a smaller plan, and nothing when it fits", () => {
    const starter = { name: "Starter", units: 1, users: 3, customFields: 10, aiCreditsPerMonth: 0, automations: false, whiteLabel: false, apiRequestsPerDay: 1000 };
    expect(planBlockers(starter, { units: 1, users: 3, customFields: 10 })).toEqual([]);
    expect(planBlockers(starter, { units: 2, users: 5, customFields: 0 })).toEqual([
      "You have 2 business units, and Starter allows 1.",
      "You have 5 active staff, and Starter allows 3.",
    ]);
    expect(planBlockers({ ...starter, name: "Enterprise", units: null, users: null, customFields: null }, { units: 99, users: 99, customFields: 99 })).toEqual([]);
  });
});
