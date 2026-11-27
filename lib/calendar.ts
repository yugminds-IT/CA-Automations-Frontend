// Month-grid helpers for the leads calendar. Everything uses the user's local time zone.

export interface CalendarItem {
  key: string;
  /** The moment the item is due (follow-up or task due time). */
  date: Date;
  title: string;
  href: string;
  kind: "follow_up" | "task";
}

/** Six Monday-first weeks (42 days) that contain the month of `anchor`. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i));
}

/** The query range covering the whole grid, as ISO strings: [from, to). */
export function monthRange(anchor: Date): { from: string; to: string } {
  const grid = monthGrid(anchor);
  const from = grid[0];
  const to = new Date(grid[grid.length - 1].getFullYear(), grid[grid.length - 1].getMonth(), grid[grid.length - 1].getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** "2026-11-05" in local time. */
export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Items keyed by local day, earliest first within a day. */
export function groupByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const item of [...items].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const k = dayKey(item.date);
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}
