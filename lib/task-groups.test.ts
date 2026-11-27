import { describe, expect, it } from "vitest";
import { groupTasksByDay } from "./task-groups";
import type { LeadTask } from "@/lib/api/leads";

const task = (id: number, dueAt: string | null): LeadTask => ({
  id,
  leadId: 100 + id,
  title: `Task ${id}`,
  dueAt,
  assignedToUserId: null,
  completedAt: null,
});

describe("groupTasksByDay", () => {
  // Local noon keeps the test independent of the machine's timezone.
  const now = new Date(2026, 10, 26, 12, 0, 0);

  it("groups by calendar day relative to now", () => {
    const groups = groupTasksByDay(
      [
        task(1, new Date(2026, 10, 25, 9).toISOString()),
        task(2, new Date(2026, 10, 26, 18).toISOString()),
        task(3, new Date(2026, 10, 27, 8).toISOString()),
        task(4, new Date(2026, 11, 10, 8).toISOString()),
        task(5, null),
      ],
      now,
    );
    expect(groups.map((g) => g.key)).toEqual(["overdue", "today", "tomorrow", "later", "undated"]);
    expect(groups.map((g) => g.tasks.map((t) => t.id))).toEqual([[1], [2], [3], [4], [5]]);
  });

  it("sorts inside a group by due time and drops empty groups", () => {
    const groups = groupTasksByDay(
      [task(1, new Date(2026, 10, 26, 17).toISOString()), task(2, new Date(2026, 10, 26, 10).toISOString())],
      now,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].tasks.map((t) => t.id)).toEqual([2, 1]);
  });

  it("treats an unreadable due date as undated", () => {
    const groups = groupTasksByDay([task(1, "not-a-date")], now);
    expect(groups[0].key).toBe("undated");
  });
});
