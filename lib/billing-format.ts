import type { PlanKey, PlanLimits } from "@/lib/api/billing";

/** "12 of 15", or "Unlimited" when the plan has no cap. */
export function limitLabel(used: number, limit: number | null): string {
  return limit === null ? `${used} · Unlimited` : `${used} of ${limit}`;
}

/** Share of a limit in use, 0 to 100. Unlimited shows 0 so the bar stays empty. */
export function usagePercent(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function yesNo(value: boolean): string {
  return value ? "Included" : "Not included";
}

export function featureRows(limits: PlanLimits): Array<{ label: string; value: string }> {
  return [
    { label: "Business units", value: limits.units === null ? "Unlimited" : String(limits.units) },
    { label: "Active staff", value: limits.users === null ? "Unlimited" : String(limits.users) },
    { label: "Custom fields", value: limits.customFields === null ? "Unlimited" : String(limits.customFields) },
    { label: "AI credits per month", value: limits.aiCreditsPerMonth.toLocaleString("en-IN") },
    { label: "Automations", value: yesNo(limits.automations) },
    { label: "White-label footer", value: yesNo(limits.whiteLabel) },
    { label: "API requests per day", value: limits.apiRequestsPerDay === null ? "Unlimited" : limits.apiRequestsPerDay.toLocaleString("en-IN") },
  ];
}

const ORDER: PlanKey[] = ["starter", "growth", "premium", "enterprise"];

/** Whether picking `target` while on `current` is a step up, a step down, or no change. */
export function planMove(current: PlanKey, target: PlanKey): "current" | "upgrade" | "downgrade" {
  if (current === target) return "current";
  return ORDER.indexOf(target) > ORDER.indexOf(current) ? "upgrade" : "downgrade";
}

/** What is already over `target`'s caps. Mirrors the server, which makes the final call. */
export function planBlockers(
  target: PlanLimits & { name: string },
  usage: { units: number; users: number; customFields: number },
): string[] {
  const rows: Array<[number, number | null, string]> = [
    [usage.units, target.units, "business units"],
    [usage.users, target.users, "active staff"],
    [usage.customFields, target.customFields, "custom fields"],
  ];
  return rows
    .filter(([used, limit]) => limit !== null && used > limit)
    .map(([used, limit, noun]) => `You have ${used} ${noun}, and ${target.name} allows ${limit}.`);
}
