import { describe, expect, it } from "vitest";
import { describeAction, fieldLabel, firstStepProblem, newAction, scoreTone, slaState, stopReasonLabel } from "./automation";

const NOW = new Date("2026-03-01T09:00:00Z");
const open = { status: "open", firstResponseDueAt: null, firstRespondedAt: null, slaEscalatedAt: null };

describe("slaState", () => {
  it("has no state without a deadline or once the lead is won or lost", () => {
    expect(slaState(open, NOW).tone).toBe("none");
    expect(slaState({ ...open, status: "won", firstResponseDueAt: "2026-03-01T08:00:00Z" }, NOW).tone).toBe("none");
  });

  it("is ok once a staff member has replied", () => {
    const s = slaState({ ...open, firstResponseDueAt: "2026-03-01T08:00:00Z", firstRespondedAt: "2026-03-01T08:30:00Z" }, NOW);
    expect(s).toEqual({ tone: "ok", label: "First response sent" });
  });

  it("is breached at the deadline, and stays breached after escalation", () => {
    expect(slaState({ ...open, firstResponseDueAt: "2026-03-01T09:00:00Z" }, NOW).tone).toBe("breached");
    expect(slaState({ ...open, firstResponseDueAt: "2026-03-01T10:00:00Z", slaEscalatedAt: "2026-03-01T08:59:00Z" }, NOW).tone).toBe(
      "breached",
    );
  });

  it("warns inside the last hour and shows the time otherwise", () => {
    const soon = slaState({ ...open, firstResponseDueAt: "2026-03-01T09:45:00Z" }, NOW);
    expect(soon).toEqual({ tone: "due", label: "First response due in 45 min" });
    expect(slaState({ ...open, firstResponseDueAt: "2026-03-01T12:00:00Z" }, NOW).tone).toBe("none");
  });
});

describe("scoreTone", () => {
  it("buckets scores", () => {
    expect(scoreTone(85)).toBe("high");
    expect(scoreTone(70)).toBe("high");
    expect(scoreTone(40)).toBe("medium");
    expect(scoreTone(29)).toBe("low");
    expect(scoreTone(0)).toBe("low");
  });
});

describe("fieldLabel and describeAction", () => {
  it("names core, activity and custom fields", () => {
    expect(fieldLabel("company")).toBe("Company");
    expect(fieldLabel("activity.email_opened")).toBe("Emails opened");
    expect(fieldLabel("customData.budget_band")).toBe("Custom: budget_band");
  });

  it("describes each action in plain words", () => {
    expect(describeAction({ type: "add_tag", tag: "vip" })).toBe('Add tag "vip"');
    expect(describeAction({ type: "assign", userId: 4 }, (id) => `Priya (#${id})`)).toBe("Assign to Priya (#4)");
    expect(describeAction({ type: "assign" })).toBe("Assign to a person");
    expect(describeAction({ type: "send_email", templateId: 3 })).toBe("Send email (template)");
  });

  it("starts each new action with the fields its type needs", () => {
    expect(newAction("create_task")).toEqual({ type: "create_task", title: "", dueInDays: 1 });
    expect(newAction("set_follow_up")).toEqual({ type: "set_follow_up", inDays: 1 });
  });
});

describe("stopReasonLabel", () => {
  it("explains known reasons and passes unknown ones through", () => {
    expect(stopReasonLabel("replied")).toBe("The lead replied");
    expect(stopReasonLabel("something_new")).toBe("something_new");
    expect(stopReasonLabel(null)).toBe("");
  });
});

describe("firstStepProblem", () => {
  it("needs at least one step and content for each", () => {
    expect(firstStepProblem([])).toBe("Add at least one step");
    expect(firstStepProblem([{ kind: "email", delayDays: 0, subject: "Hi", body: "" }])).toBe(
      "Step 1: pick a template or write a subject and body",
    );
    expect(firstStepProblem([{ kind: "email", delayDays: 0, templateId: 2 }])).toBeNull();
    expect(firstStepProblem([{ kind: "task", delayDays: 2, taskTitle: "  " }])).toBe("Step 1: give the task a title");
  });
});
