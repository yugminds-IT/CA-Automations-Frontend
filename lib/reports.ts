// Pure helpers for the reports screens: labels, which groupings each chart type allows, and number formats.
// The groupings mirror ca-backend-nest/src/reports/reports.rules.ts; the server is the source of truth.
import type { GroupBy, Metric, WidgetSpec, WidgetType } from "@/lib/api/reports";

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  kpi: "Single number",
  bar: "Bar chart",
  line: "Line chart (by day)",
  table: "Table",
  funnel: "Funnel (by stage)",
};

export const METRIC_LABELS: Record<Metric, string> = {
  lead_count: "Leads",
  won_count: "Won leads",
  pipeline_value: "Open pipeline value",
  won_value: "Won value",
};

export const GROUP_LABELS: Record<GroupBy, string> = {
  none: "Total",
  source: "Source",
  stage: "Stage",
  owner: "Owner",
  unit: "Business unit",
  day: "Day created",
  lost_reason: "Lost reason",
};

const ALLOWED_GROUPS: Record<WidgetType, GroupBy[]> = {
  kpi: ["none"],
  funnel: ["stage"],
  line: ["day"],
  bar: ["source", "stage", "owner", "unit", "lost_reason"],
  table: ["none", "source", "stage", "owner", "unit", "day", "lost_reason"],
};

export function groupsFor(type: WidgetType): GroupBy[] {
  return ALLOWED_GROUPS[type];
}

/** Whether a metric is a rupee amount (shown with the rupee sign) rather than a count. */
export function isMoneyMetric(metric: Metric): boolean {
  return metric === "pipeline_value" || metric === "won_value";
}

export function formatMetric(metric: Metric, value: number): string {
  if (isMoneyMetric(metric)) return formatRupees(value);
  return Math.round(value).toLocaleString("en-IN");
}

export function formatRupees(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** A percentage with one decimal, or a dash when there is nothing to divide by. */
export function formatPercent(value: number | null | undefined): string {
  return value == null ? "—" : `${value}%`;
}

/** Minutes as a short phrase: 45 min, 3 h 20 min, 2 days. */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 48) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  return `${Math.round(minutes / 1440)} days`;
}

/** A new widget of a type, with the first grouping that type allows. */
export function newWidget(type: WidgetType, id: string, title = "New widget"): WidgetSpec {
  return { id, title, type, metric: "lead_count", groupBy: groupsFor(type)[0] };
}

/** A dashboard-builder widget is valid when its grouping suits its type (the server repeats this check). */
export function widgetProblem(w: WidgetSpec): string | null {
  if (!w.title.trim()) return "Give the widget a title";
  if (!groupsFor(w.type).includes(w.groupBy)) {
    return `A ${WIDGET_TYPE_LABELS[w.type].toLowerCase()} cannot group by ${GROUP_LABELS[w.groupBy].toLowerCase()}`;
  }
  return null;
}

/** Labels for the scheduled-email hour (IST, 0 to 23). */
export function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${hour < 12 ? "am" : "pm"} IST`;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** A schedule's timing as a readable line, for example "Every Monday at 9:00 am IST". */
export function describeSchedule(s: { frequency: string; dayOfWeek: number | null; dayOfMonth: number | null; hourIst: number }): string {
  if (s.frequency === "daily") return `Every day at ${hourLabel(s.hourIst)}`;
  if (s.frequency === "weekly") return `Every ${WEEKDAYS[s.dayOfWeek ?? 1]} at ${hourLabel(s.hourIst)}`;
  return `On day ${s.dayOfMonth ?? 1} of each month at ${hourLabel(s.hourIst)}`;
}

/** Recipients typed as commas, spaces or new lines, cleaned and de-duplicated. */
export function parseRecipients(text: string): string[] {
  const list = text
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(list)];
}
