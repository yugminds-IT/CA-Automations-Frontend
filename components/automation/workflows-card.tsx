"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { BusinessUnit } from "@/lib/api/business-units";
import { listTemplates } from "@/lib/api/email-templates";
import { EmailTemplate } from "@/lib/api/types";
import {
  AutomationCatalog,
  ConditionOp,
  WorkflowAction,
  WorkflowActionType,
  WorkflowCondition,
  WorkflowInput,
  WorkflowRule,
  WorkflowRun,
  WorkflowTrigger,
  createWorkflow,
  deleteWorkflow,
  listWorkflowRuns,
  listWorkflows,
  updateWorkflow,
} from "@/lib/api/automation";
import { LeadOwner, listLeadOwners } from "@/lib/api/leads";
import { pickerLabel } from "@/lib/unit-structure";
import { ACTION_LABELS, OP_LABELS, TRIGGER_LABELS, describeAction, fieldLabel, newAction } from "@/lib/automation";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

interface Draft {
  id?: number;
  name: string;
  trigger: WorkflowTrigger;
  field: string;
  days: string;
  enabled: boolean;
  scope: "unit" | "all";
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
}

const blankDraft = (unitId: number): Draft => ({
  name: "",
  trigger: "lead_created",
  field: "company",
  days: "3",
  enabled: true,
  scope: unitId ? "unit" : "all",
  conditions: [],
  actions: [{ type: "add_tag", tag: "" }],
});

function draftFrom(rule: WorkflowRule): Draft {
  const cfg = rule.triggerConfig ?? {};
  return {
    id: rule.id,
    name: rule.name,
    trigger: rule.trigger,
    field: typeof cfg.field === "string" ? cfg.field : "company",
    days: cfg.days != null ? String(cfg.days) : "3",
    enabled: rule.enabled,
    scope: rule.businessUnitId === null ? "all" : "unit",
    conditions: rule.conditions.map((c) => ({ ...c, value: c.value ?? "" })),
    actions: rule.actions.map((a) => ({ ...a })),
  };
}

function toInput(d: Draft, unitId: number): WorkflowInput {
  const triggerConfig: Record<string, unknown> =
    d.trigger === "field_changed" ? { field: d.field } : d.trigger === "lead_inactive" ? { days: Number(d.days) } : {};
  return {
    name: d.name.trim(),
    trigger: d.trigger,
    triggerConfig,
    conditions: d.conditions.map((c) => ({
      field: c.field,
      op: c.op,
      value: c.op === "exists" ? null : c.value ?? "",
    })),
    actions: d.actions,
    enabled: d.enabled,
    businessUnitId: d.scope === "unit" ? unitId : null,
  };
}

interface Props {
  businessUnitId: number;
  units: BusinessUnit[];
  catalog: AutomationCatalog | null;
}

export function WorkflowsCard({ businessUnitId, units, catalog }: Props) {
  const { toast } = useToast();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [runsFor, setRunsFor] = useState<WorkflowRule | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, people, tpls] = await Promise.all([
        listWorkflows(businessUnitId),
        listLeadOwners(),
        listTemplates({ businessUnitId }).catch(() => [] as EmailTemplate[]),
      ]);
      setRules(list);
      setOwners(people);
      setTemplates(tpls);
    } catch (err) {
      toast({ title: "Could not load workflows", description: errorText(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const unitName = (id: number | null) => (id === null ? "All brands" : (() => { const u = units.find((x) => x.id === id); return u ? pickerLabel(u, units) : `Brand #${id}`; })());
  const personName = (id: number) => owners.find((o) => o.id === id)?.name ?? `User #${id}`;
  const fieldOptions = catalog?.fields ?? [];

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const input = toInput(draft, businessUnitId);
      if (draft.id) await updateWorkflow(draft.id, input);
      else await createWorkflow(input);
      setDraft(null);
      toast({ title: "Workflow saved", variant: "success" });
      await load();
    } catch (err) {
      toast({ title: "Could not save the workflow", description: errorText(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule: WorkflowRule, enabled: boolean) => {
    try {
      await updateWorkflow(rule.id, {
        name: rule.name,
        trigger: rule.trigger,
        triggerConfig: rule.triggerConfig,
        conditions: rule.conditions,
        actions: rule.actions,
        enabled,
        businessUnitId: rule.businessUnitId,
      });
      await load();
    } catch (err) {
      toast({ title: "Could not change the workflow", description: errorText(err), variant: "destructive" });
    }
  };

  const remove = async (rule: WorkflowRule) => {
    if (!confirm(`Delete the workflow "${rule.name}"?`)) return;
    try {
      await deleteWorkflow(rule.id);
      toast({ title: "Workflow deleted" });
      await load();
    } catch (err) {
      toast({ title: "Could not delete the workflow", description: errorText(err), variant: "destructive" });
    }
  };

  const openRuns = async (rule: WorkflowRule) => {
    setRunsFor(rule);
    setRuns([]);
    try {
      setRuns(await listWorkflowRuns(rule.id));
    } catch (err) {
      toast({ title: "Could not load the history", description: errorText(err), variant: "destructive" });
    }
  };

  const setAction = (index: number, patch: Partial<WorkflowAction>) =>
    setDraft((d) => (d ? { ...d, actions: d.actions.map((a, i) => (i === index ? { ...a, ...patch } : a)) } : d));

  const setCondition = (index: number, patch: Partial<WorkflowCondition>) =>
    setDraft((d) => (d ? { ...d, conditions: d.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)) } : d));

  const triggerSummary = (rule: WorkflowRule): string => {
    if (rule.trigger === "field_changed") return `${TRIGGER_LABELS.field_changed}: ${fieldLabel(String(rule.triggerConfig.field ?? ""))}`;
    if (rule.trigger === "lead_inactive") return `No activity for ${String(rule.triggerConfig.days ?? "?")} day(s)`;
    return TRIGGER_LABELS[rule.trigger];
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Workflows</CardTitle>
          <CardDescription>
            When something happens to a lead, and the conditions hold, run these actions. Rules that depend on time run every few minutes.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setDraft(blankDraft(businessUnitId))}>
          <Plus className="mr-1 size-4" /> Add workflow
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        )}
        {!loading && rules.length === 0 && <p className="text-sm text-muted-foreground">No workflows yet.</p>}
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{rule.name}</span>
                <Badge variant="outline">{unitName(rule.businessUnitId)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{triggerSummary(rule)}</p>
              {rule.conditions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  If {rule.conditions.map((c) => `${fieldLabel(c.field)} ${OP_LABELS[c.op]}${c.op === "exists" ? "" : ` "${c.value ?? ""}"`}`).join(" and ")}
                </p>
              )}
              <p className="text-sm">{rule.actions.map((a) => describeAction(a, personName)).join("; ")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={rule.enabled} onCheckedChange={(v) => toggle(rule, v)} aria-label="Workflow enabled" />
              <Button variant="ghost" size="icon" onClick={() => openRuns(rule)} aria-label="Run history">
                <History className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDraft(draftFrom(rule))} aria-label="Edit workflow">
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(rule)} aria-label="Delete workflow">
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit workflow" : "New workflow"}</DialogTitle>
            <DialogDescription>When this happens, and if these conditions hold, do these things.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="wf-name">Name</Label>
                <Input id="wf-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>When</Label>
                  <Select value={draft.trigger} onValueChange={(v) => setDraft({ ...draft, trigger: v as WorkflowTrigger })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalog?.triggers ?? (Object.keys(TRIGGER_LABELS) as WorkflowTrigger[])).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TRIGGER_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Applies to</Label>
                  <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v as "unit" | "all" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit">{(() => { const u = units.find((x) => x.id === businessUnitId); return u ? pickerLabel(u, units) : "This brand"; })()} only</SelectItem>
                      <SelectItem value="all">Every unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {draft.trigger === "field_changed" && (
                <div className="space-y-1.5">
                  <Label>Field that changes</Label>
                  <Select value={draft.field} onValueChange={(v) => setDraft({ ...draft, field: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions
                        .filter((f) => !f.startsWith("activity.") && f !== "status")
                        .map((f) => (
                          <SelectItem key={f} value={f}>
                            {fieldLabel(f)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {draft.trigger === "lead_inactive" && (
                <div className="space-y-1.5">
                  <Label htmlFor="wf-days">Days without activity</Label>
                  <Input id="wf-days" type="number" min={1} max={365} value={draft.days} onChange={(e) => setDraft({ ...draft, days: e.target.value })} />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Only if (all of these)</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDraft({ ...draft, conditions: [...draft.conditions, { field: "company", op: "exists", value: "" }] })}
                  >
                    <Plus className="mr-1 size-3" /> Condition
                  </Button>
                </div>
                {draft.conditions.length === 0 && <p className="text-xs text-muted-foreground">No conditions: the workflow runs every time.</p>}
                {draft.conditions.map((c, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                    <Select value={c.field} onValueChange={(v) => setCondition(i, { field: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((f) => (
                          <SelectItem key={f} value={f}>
                            {fieldLabel(f)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={c.op} onValueChange={(v) => setCondition(i, { op: v as ConditionOp })}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(catalog?.operators ?? (Object.keys(OP_LABELS) as ConditionOp[])).map((op) => (
                          <SelectItem key={op} value={op}>
                            {OP_LABELS[op]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {c.op === "exists" ? (
                      <span className="text-xs text-muted-foreground">no value needed</span>
                    ) : (
                      <Input
                        type={c.op === "gte" ? "number" : "text"}
                        value={String(c.value ?? "")}
                        onChange={(e) => setCondition(i, { value: e.target.value })}
                        placeholder="value"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove condition"
                      onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((_, j) => j !== i) })}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Then do</Label>
                  <Select
                    value=""
                    onValueChange={(v) => setDraft({ ...draft, actions: [...draft.actions, newAction(v as WorkflowActionType)] })}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Add an action" />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalog?.actions ?? (Object.keys(ACTION_LABELS) as WorkflowActionType[])).map((t) => (
                        <SelectItem key={t} value={t}>
                          {ACTION_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {draft.actions.map((a, i) => (
                  <div key={i} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ACTION_LABELS[a.type]}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove action"
                        onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_, j) => j !== i) })}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    {a.type === "assign" && (
                      <Select value={a.userId != null ? String(a.userId) : "none"} onValueChange={(v) => setAction(i, { userId: Number(v) })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a person" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" disabled>
                            Pick a person
                          </SelectItem>
                          {owners.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {a.type === "create_task" && (
                      <div className="grid grid-cols-[1fr_8rem] gap-2">
                        <Input value={a.title ?? ""} onChange={(e) => setAction(i, { title: e.target.value })} placeholder="Task title, e.g. Call {{first_name}}" />
                        <Input
                          type="number"
                          min={0}
                          value={a.dueInDays ?? 0}
                          onChange={(e) => setAction(i, { dueInDays: Number(e.target.value) })}
                          aria-label="Due in days"
                        />
                      </div>
                    )}
                    {a.type === "add_tag" && (
                      <Input value={a.tag ?? ""} onChange={(e) => setAction(i, { tag: e.target.value })} placeholder="Tag, e.g. dubai-lead" />
                    )}
                    {a.type === "notify" && (
                      <Textarea value={a.message ?? ""} onChange={(e) => setAction(i, { message: e.target.value })} placeholder="Message for the owner" />
                    )}
                    {a.type === "set_follow_up" && (
                      <Input
                        type="number"
                        min={0}
                        value={a.inDays ?? 0}
                        onChange={(e) => setAction(i, { inDays: Number(e.target.value) })}
                        aria-label="Follow up in days"
                      />
                    )}
                    {a.type === "send_email" && (
                      <div className="space-y-2">
                        <Select
                          value={a.templateId ? String(a.templateId) : "custom"}
                          onValueChange={(v) => setAction(i, { templateId: v === "custom" ? null : Number(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">Write my own</SelectItem>
                            {templates.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!a.templateId && (
                          <>
                            <Input value={a.subject ?? ""} onChange={(e) => setAction(i, { subject: e.target.value })} placeholder="Subject, e.g. Thanks for your enquiry, {{first_name}}" />
                            <Textarea value={a.body ?? ""} onChange={(e) => setAction(i, { body: e.target.value })} placeholder="Message. Use {{first_name}}, {{company}} and so on." />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {draft.actions.length === 0 && <p className="text-xs text-destructive">Add at least one action.</p>}
              </div>

              <div className="flex items-center gap-2">
                <Switch id="wf-enabled" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
                <Label htmlFor="wf-enabled">Workflow is on</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={runsFor !== null} onOpenChange={(open) => !open && setRunsFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Run history: {runsFor?.name}</DialogTitle>
            <DialogDescription>The last 50 times this workflow ran.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
            {runs.map((r) => (
              <li key={r.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <span>Lead #{r.leadId}</span>
                  <Badge variant={r.status === "ok" ? "outline" : "destructive"}>{r.status === "ok" ? "Done" : "Failed"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("en-IN")}</div>
                {r.detail && <pre className="mt-1 whitespace-pre-wrap text-xs">{r.detail}</pre>}
              </li>
            ))}
            {runs.length === 0 && <li className="text-muted-foreground">No runs yet.</li>}
          </ul>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
