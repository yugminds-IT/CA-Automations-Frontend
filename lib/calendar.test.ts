import { describe, expect, it } from "vitest"
import { dayKey, groupByDay, monthGrid, monthRange, type CalendarItem } from "./calendar"

describe("monthGrid", () => {
  it("starts on the Monday on or before the 1st, and runs 42 days", () => {
    // 1 Nov 2026 is a Sunday, so the grid starts Monday 26 Oct.
    const grid = monthGrid(new Date(2026, 10, 15))
    expect(grid).toHaveLength(42)
    expect(dayKey(grid[0])).toBe("2026-10-26")
    expect(grid[0].getDay()).toBe(1)
    expect(dayKey(grid[41])).toBe("2026-12-06")
  })

  it("starts on the 1st when the month begins on a Monday", () => {
    // 1 Jun 2026 is a Monday.
    expect(dayKey(monthGrid(new Date(2026, 5, 1))[0])).toBe("2026-06-01")
  })
})

describe("monthRange", () => {
  it("covers the whole grid with [from, to)", () => {
    const { from, to } = monthRange(new Date(2026, 10, 15))
    expect(dayKey(new Date(from))).toBe("2026-10-26")
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(42 * 24 * 60 * 60 * 1000)
  })
})

describe("groupByDay", () => {
  it("groups by local day and sorts within a day", () => {
    const items: CalendarItem[] = [
      { key: "b", date: new Date(2026, 10, 5, 15), title: "Later", href: "/leads/2", kind: "task" },
      { key: "a", date: new Date(2026, 10, 5, 9), title: "Early", href: "/leads/1", kind: "follow_up" },
      { key: "c", date: new Date(2026, 10, 6, 9), title: "Next day", href: "/leads/3", kind: "follow_up" },
    ]
    const map = groupByDay(items)
    expect(map.get("2026-11-05")?.map((i) => i.key)).toEqual(["a", "b"])
    expect(map.get("2026-11-06")?.map((i) => i.key)).toEqual(["c"])
  })
})
