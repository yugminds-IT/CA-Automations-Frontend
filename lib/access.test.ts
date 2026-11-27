import { describe, expect, it } from "vitest";
import {
  defaultProfileId,
  deviceLabel,
  parentTeamChoices,
  permissionSummary,
  profileProblems,
  signInOutcome,
  staffStatus,
  togglePermission,
} from "./access";

describe("togglePermission", () => {
  it("adds and removes a key without touching the others", () => {
    expect(togglePermission(["a"], "b")).toEqual(["a", "b"]);
    expect(togglePermission(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("permissionSummary", () => {
  it("says all, none, or how many", () => {
    expect(permissionSummary(["a", "b"], 2)).toBe("All permissions");
    expect(permissionSummary([], 2)).toBe("No permissions");
    expect(permissionSummary(["a"], 2)).toBe("1 of 2");
  });
});

describe("staffStatus", () => {
  it("shows deactivated before pending before active", () => {
    expect(staffStatus({ isActive: false, inviteStatus: "pending" }).label).toBe("Deactivated");
    expect(staffStatus({ isActive: true, inviteStatus: "pending" }).label).toBe("Invite pending");
    expect(staffStatus({ isActive: true, inviteStatus: "accepted" }).label).toBe("Active");
  });
});

describe("defaultProfileId", () => {
  it("prefers Manager, then Sales Executive, then the first profile", () => {
    const profiles = [
      { id: 1, name: "Admin" },
      { id: 2, name: "Manager" },
      { id: 3, name: "Sales Executive" },
    ] as never[];
    expect(defaultProfileId(profiles)).toBe(2);
    expect(defaultProfileId(profiles.filter((p) => (p as { name: string }).name !== "Manager"))).toBe(3);
    expect(defaultProfileId([{ id: 9, name: "Custom" }] as never[])).toBe(9);
    expect(defaultProfileId([])).toBeUndefined();
  });
});

describe("profileProblems", () => {
  it("needs a name and at least one permission", () => {
    expect(profileProblems({ name: " ", permissions: [] })).toHaveLength(2);
    expect(profileProblems({ name: "Tele-caller", permissions: ["leads.view"] })).toEqual([]);
  });
});

describe("parentTeamChoices", () => {
  const teams = [
    { id: 1, parentTeamId: null },
    { id: 2, parentTeamId: 1 },
    { id: 3, parentTeamId: 2 },
    { id: 4, parentTeamId: null },
  ];

  it("offers every team when the team is new", () => {
    expect(parentTeamChoices(teams, null).map((t) => t.id)).toEqual([1, 2, 3, 4]);
  });

  it("hides the team itself and everything below it", () => {
    expect(parentTeamChoices(teams, 1).map((t) => t.id)).toEqual([4]);
    expect(parentTeamChoices(teams, 2).map((t) => t.id)).toEqual([1, 4]);
  });
});

describe("deviceLabel and signInOutcome", () => {
  it("names the browser and system", () => {
    expect(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36")).toBe(
      "Chrome on macOS",
    );
    expect(deviceLabel(null)).toBe("Unknown device");
  });

  it("labels a failed attempt as failed", () => {
    expect(signInOutcome({ type: "login_failed", isError: true }).label).toBe("Failed");
    expect(signInOutcome({ type: "login", isError: false }).label).toBe("Signed in");
  });
});
