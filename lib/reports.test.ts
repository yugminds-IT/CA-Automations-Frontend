import { describe, expect, it } from "vitest";
import {
  describeSchedule,
  formatMetric,
  formatMinutes,
  formatPercent,
  groupsFor,
  hourLabel,
  newWidget,
  parseRecipients,
  widgetProblem,
} from "@/lib/reports";
import { filtersQuery, type WidgetSpec } from "@/lib/api/reports";

describe("groupsFor", () => {
  it("keeps each chart type to the groupings the server accepts", () => {
    expect(groupsFor("kpi")).toEqual(["none"]);
    expect(groupsFor("funnel")).toEqual(["stage"]);
    expect(groupsFor("line")).toEqual(["day"]);
    expect(groupsFor("bar")).not.toContain("day");
    expect(groupsFor("table")).toContain("lost_reason");
  });
});

describe("newWidget", () => {
  it("starts with the first grouping its type allows", () => {
    expect(newWidget("funnel", "a")).toMatchObject({ type: "funnel", groupBy: "stage", metric: "lead_count" });
    expect(newWidget("kpi", "b").groupBy).toBe("none");
  });
});

describe("widgetProblem", () => {
  const base: WidgetSpec = { id: "x", title: "Leads", type: "bar", metric: "lead_count", groupBy: "source" };

  it("accepts a valid widget and flags a blank title or a grouping that does not fit", () => {
    expect(widgetProblem(base)).toBeNull();
    expect(widgetProblem({ ...base, title: "  " })).toBe("Give the widget a title");
    expect(widgetProblem({ ...base, type: "kpi" })).toMatch(/cannot group by source/);
  });
});

describe("formatting", () => {
  it("shows money with the rupee sign and Indian digit grouping", () => {
    expect(formatMetric("won_value", 1234567.4)).toBe("₹12,34,567");
    expect(formatMetric("lead_count", 42.2)).toBe("42");
  });

  it("shows missing percentages and durations as a dash", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(33.3)).toBe("33.3%");
    expect(formatMinutes(null)).toBe("—");
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(200)).toBe("3 h 20 min");
    expect(formatMinutes(2880)).toBe("2 days");
  });
});

describe("schedules", () => {
  it("labels the hour in IST and describes the timetable", () => {
    expect(hourLabel(0)).toBe("12:00 am IST");
    expect(hourLabel(9)).toBe("9:00 am IST");
    expect(hourLabel(13)).toBe("1:00 pm IST");
    expect(describeSchedule({ frequency: "weekly", dayOfWeek: 1, dayOfMonth: null, hourIst: 9 })).toBe(
      "Every Monday at 9:00 am IST",
    );
    expect(describeSchedule({ frequency: "monthly", dayOfWeek: null, dayOfMonth: 1, hourIst: 18 })).toBe(
      "On day 1 of each month at 6:00 pm IST",
    );
  });

  it("reads recipients typed with commas, spaces or new lines, once each", () => {
    expect(parseRecipients("Ceo@x.com, cfo@x.com\nceo@x.com  ops@x.com;")).toEqual(["ceo@x.com", "cfo@x.com", "ops@x.com"]);
  });
});

describe("filtersQuery", () => {
  it("sends only the filters that are set", () => {
    expect(filtersQuery({ businessUnitId: 3, ownerUserId: null, source: "", from: "2026-01-01" })).toBe(
      "?businessUnitId=3&from=2026-01-01",
    );
    expect(filtersQuery({})).toBe("");
  });
});
