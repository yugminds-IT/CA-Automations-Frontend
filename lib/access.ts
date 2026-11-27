// Small pure helpers for the staff and permission screens.
import type { PermissionProfile, StaffMember } from "./api/access";

export function togglePermission(selected: string[], key: string): string[] {
  return selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
}

export function permissionSummary(selected: string[], total: number): string {
  if (total > 0 && selected.length === total) return "All permissions";
  if (selected.length === 0) return "No permissions";
  return `${selected.length} of ${total}`;
}

export function staffStatus(member: Pick<StaffMember, "isActive" | "inviteStatus">): {
  label: string;
  tone: "ok" | "muted" | "pending";
} {
  if (!member.isActive) return { label: "Deactivated", tone: "muted" };
  if (member.inviteStatus === "pending") return { label: "Invite pending", tone: "pending" };
  return { label: "Active", tone: "ok" };
}

/**
 * The profile a new staff member gets by default: "Manager" if present, then "Sales Executive".
 * Manager sees the records of the brands someone is assigned to. In a single-branch workspace
 * (no admin panel) the server widens that to the whole workspace, so one default fits both.
 */
export function defaultProfileId(profiles: PermissionProfile[]): number | undefined {
  return (
    profiles.find((p) => p.name === "Manager")?.id ??
    profiles.find((p) => p.name === "Sales Executive")?.id ??
    profiles[0]?.id
  );
}

/** Errors for a profile form. Empty means it can be saved. */
export function profileProblems(input: { name: string; permissions: string[] }): string[] {
  const problems: string[] = [];
  if (!input.name.trim()) problems.push("Give the profile a name");
  if (input.name.trim().length > 100) problems.push("Name must be 100 characters or fewer");
  if (input.permissions.length === 0) problems.push("Pick at least one permission");
  return problems;
}

/**
 * Teams a team can be moved under: every team except itself and the teams below it (moving it under
 * one of those would create a loop). The backend checks this too.
 */
export function parentTeamChoices<T extends { id: number; parentTeamId: number | null }>(
  teams: T[],
  teamId: number | null,
): T[] {
  if (teamId === null) return teams;
  const below = new Set<number>([teamId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of teams) {
      if (t.parentTeamId !== null && below.has(t.parentTeamId) && !below.has(t.id)) {
        below.add(t.id);
        grew = true;
      }
    }
  }
  return teams.filter((t) => !below.has(t.id));
}

/** A short, readable label for a browser user agent, e.g. "Chrome on macOS". */
export function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(userAgent)
      ? "macOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /iPhone|iPad|iOS/.test(userAgent)
          ? "iOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

export function signInOutcome(event: { type: string; isError: boolean }): { label: string; tone: "ok" | "bad" | "muted" } {
  if (event.type === "login" && !event.isError) return { label: "Signed in", tone: "ok" };
  if (event.type === "logout") return { label: "Signed out", tone: "muted" };
  return { label: "Failed", tone: "bad" };
}
