// Pure helpers for the automation screens: labels, starting values for new rows, and lead SLA and score states.
import type {
  AssignmentStrategy,
  WorkflowAction,
  WorkflowActionType,
  WorkflowTrigger,
  SequenceStep,
  ConditionOp,
} from "@/lib/api/automation";

export const TRIGGER_LABELS: Record<WorkflowTrigger, string> = {
  lead_created: "A lead is created",
  stage_changed: "A lead moves to another stage",
  field_changed: "A field changes",
  lead_inactive: "A lead has no activity for N days",
  followup_overdue: "A follow-up date passes",
};

export const STRATEGY_LABELS: Record<AssignmentStrategy, string> = {
  round_robin: "Round robin (take turns)",
  load_balanced: "Least open leads first",
  by_field: "Based on a lead field",
};

export const ACTION_LABELS: Record<WorkflowActionType, string> = {
  assign: "Assign to a person",
  create_task: "Create a task",
  add_tag: "Add a tag",
  notify: "Notify the team",
  send_email: "Send an email",
  set_follow_up: "Set a follow-up date",
};

export const OP_LABELS: Record<ConditionOp, string> = {
  exists: "has a value",
  equals: "equals",
  contains: "contains",
  gte: "is at least",
};

const CORE_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  source: "Source",
  value: "Value",
  status: "Status",
  tags: "Tags",
  ownerUserId: "Owner",
  "activity.call": "Calls logged",
  "activity.email": "Emails sent",
  "activity.meeting": "Meetings logged",
  "activity.note": "Notes",
  "activity.email_opened": "Emails opened",
  "activity.email_clicked": "Email links clicked",
  "activity.email_received": "Replies received",
};

/** A readable name for a rule field. Custom fields show their key. */
export function fieldLabel(field: string): string {
  if (CORE_FIELD_LABELS[field]) return CORE_FIELD_LABELS[field];
  if (field.startsWith("customData.")) return `Custom: ${field.slice("customData.".length)}`;
  return field;
}

export function describeAction(action: WorkflowAction, personName?: (id: number) => string): string {
  switch (action.type) {
    case "assign":
      return `Assign to ${action.userId != null && personName ? personName(action.userId) : "a person"}`;
    case "create_task":
      return `Create task "${action.title ?? ""}"${action.dueInDays != null ? ` due in ${action.dueInDays} day(s)` : ""}`;
    case "add_tag":
      return `Add tag "${action.tag ?? ""}"`;
    case "notify":
      return `Notify the team: "${action.message ?? ""}"`;
    case "send_email":
      return action.templateId ? "Send email (template)" : `Send email "${action.subject ?? ""}"`;
    case "set_follow_up":
      return `Set follow-up in ${action.inDays ?? 0} day(s)`;
  }
}

export function newAction(type: WorkflowActionType): WorkflowAction {
  switch (type) {
    case "assign":
      return { type };
    case "create_task":
      return { type, title: "", dueInDays: 1 };
    case "add_tag":
      return { type, tag: "" };
    case "notify":
      return { type, message: "" };
    case "send_email":
      return { type, subject: "", body: "" };
    case "set_follow_up":
      return { type, inDays: 1 };
  }
}

export function newStep(kind: "email" | "task", previousDelay = 0): SequenceStep {
  return kind === "email"
    ? { kind, delayDays: previousDelay, subject: "", body: "", templateId: null }
    : { kind, delayDays: previousDelay, taskTitle: "" };
}

export const STOP_REASON_LABELS: Record<string, string> = {
  stage_changed: "The lead moved to another stage",
  replied: "The lead replied",
  lead_closed: "The lead was won or lost",
  suppressed: "The recipient unsubscribed or bounced",
  no_email: "The lead has no email address",
  lead_deleted: "The lead was deleted",
  sequence_deleted: "The sequence was deleted",
  stopped_by_user: "Stopped by a team member",
  error: "Stopped after an error",
};

export function stopReasonLabel(reason: string | null): string {
  if (!reason) return "";
  return STOP_REASON_LABELS[reason] ?? reason;
}

export type SlaTone = "ok" | "due" | "breached" | "none";

/**
 * The first-response state of a lead, from its SLA fields. "due" means the deadline is within the next hour.
 */
export function slaState(
  lead: { status: string; firstResponseDueAt: string | null; firstRespondedAt: string | null; slaEscalatedAt: string | null },
  now: Date = new Date(),
): { tone: SlaTone; label: string } {
  if (lead.status !== "open" || !lead.firstResponseDueAt) return { tone: "none", label: "" };
  if (lead.firstRespondedAt) return { tone: "ok", label: "First response sent" };
  const due = new Date(lead.firstResponseDueAt).getTime();
  if (lead.slaEscalatedAt || due <= now.getTime()) {
    return { tone: "breached", label: "First response overdue" };
  }
  const minutes = Math.round((due - now.getTime()) / 60000);
  if (minutes <= 60) return { tone: "due", label: `First response due in ${minutes} min` };
  return { tone: "none", label: `First response due ${new Date(due).toLocaleString("en-IN")}` };
}

export type ScoreTone = "high" | "medium" | "low";

export function scoreTone(score: number): ScoreTone {
  if (score >= 70) return "high";
  if (score >= 30) return "medium";
  return "low";
}

/** Whether a step or rule can be saved: the first problem, or null. Mirrors the backend's checks for quick feedback. */
export function firstStepProblem(steps: SequenceStep[]): string | null {
  if (steps.length === 0) return "Add at least one step";
  for (const [i, s] of steps.entries()) {
    if (s.kind === "email" && !s.templateId && !(s.subject?.trim() && s.body?.trim())) {
      return `Step ${i + 1}: pick a template or write a subject and body`;
    }
    if (s.kind === "task" && !s.taskTitle?.trim()) return `Step ${i + 1}: give the task a title`;
  }
  return null;
}
