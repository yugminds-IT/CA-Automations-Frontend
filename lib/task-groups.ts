import type { LeadTask } from "@/lib/api/leads";

export type TaskGroupKey = "overdue" | "today" | "tomorrow" | "later" | "undated";

export interface TaskGroup {
  key: TaskGroupKey;
  label: string;
  tasks: LeadTask[];
}

const LABELS: Record<TaskGroupKey, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  later: "Later",
  undated: "No due date",
};

const ORDER: TaskGroupKey[] = ["overdue", "today", "tomorrow", "later", "undated"];

/** Local calendar day as a number, so the comparison ignores the time of day. */
const dayNumber = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);

/** Groups open tasks by how far off their due day is from `now`, in the device's local time. Empty groups are dropped. */
export function groupTasksByDay(tasks: LeadTask[], now: Date): TaskGroup[] {
  const today = dayNumber(now);
  const buckets: Record<TaskGroupKey, LeadTask[]> = { overdue: [], today: [], tomorrow: [], later: [], undated: [] };
  for (const t of tasks) {
    if (!t.dueAt) {
      buckets.undated.push(t);
      continue;
    }
    const due = new Date(t.dueAt);
    if (Number.isNaN(due.getTime())) {
      buckets.undated.push(t);
      continue;
    }
    const diff = dayNumber(due) - today;
    const key: TaskGroupKey = diff < 0 ? "overdue" : diff === 0 ? "today" : diff === 1 ? "tomorrow" : "later";
    buckets[key].push(t);
  }
  for (const key of ORDER) {
    buckets[key].sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  }
  return ORDER.filter((k) => buckets[k].length > 0).map((k) => ({ key: k, label: LABELS[k], tasks: buckets[k] }));
}
