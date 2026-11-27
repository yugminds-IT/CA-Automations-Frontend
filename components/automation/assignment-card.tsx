"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  AssignmentRule,
  AssignmentRuleInput,
  AssignmentStrategy,
  AutomationCatalog,
  createAssignmentRule,
  deleteAssignmentRule,
  listAssignmentRules,
  updateAssignmentRule,
} from "@/lib/api/automation";
import { LeadOwner, listLeadOwners } from "@/lib/api/leads";
import { STRATEGY_LABELS, fieldLabel } from "@/lib/automation";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

interface Draft {
  id?: number;
  name: string;
  strategy: AssignmentStrategy;
  priority: string;
  enabled: boolean;
  memberUserIds: number[];
  conditionField: string;
  conditionValue: string;
  targetUserId: string;
}

const blankDraft: Draft = {
  name: "",
  strategy: "round_robin",
  priority: "100",
  enabled: true,
  memberUserIds: [],
  conditionField: "source",
  conditionValue: "",
  targetUserId: "none",
};

function draftFrom(rule: AssignmentRule): Draft {
  return {
    id: rule.id,
    name: rule.name,
    strategy: rule.strategy,
    priority: String(rule.priority),
    enabled: rule.enabled,
    memberUserIds: rule.memberUserIds,
    conditionField: rule.conditionField ?? "source",
    conditionValue: rule.conditionValue ?? "",
    targetUserId: rule.targetUserId != null ? String(rule.targetUserId) : "none",
  };
}

interface Props {
  businessUnitId: number;
  catalog: AutomationCatalog | null;
}

/** Who gets a new lead when nobody is picked. Rules run in priority order; the first one that finds someone wins. */
export function AssignmentCard({ businessUnitId, catalog }: Props) {
  const { toast } = useToast();
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, people] = await Promise.all([listAssignmentRules(businessUnitId), listLeadOwners()]);
      setRules(list);
      setOwners(people);
    } catch (err) {
      toast({ title: "Could not load assignment rules", description: errorText(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const personName = (id: number | null) => (id == null ? "—" : owners.find((o) => o.id === id)?.name ?? `User #${id}`);
  const fieldOptions = (catalog?.fields ?? []).filter((f) => !f.startsWith("activity.") && f !== "ownerUserId");

  const summary = (rule: AssignmentRule): string => {
    if (rule.strategy === "by_field") {
      return `${fieldLabel(rule.conditionField ?? "")} = "${rule.conditionValue ?? ""}" → ${personName(rule.targetUserId)}`;
    }
    const who = rule.memberUserIds.length ? `${rule.memberUserIds.length} selected people` : "all active staff in this unit";
    const next = rule.strategy === "round_robin" && rule.cursorUserId != null ? ` · last given to ${personName(rule.cursorUserId)}` : "";
    return `${who}${next}`;
  };

  const toInput = (d: Draft): AssignmentRuleInput => ({
    name: d.name.trim(),
    strategy: d.strategy,
    businessUnitId,
    priority: Number(d.priority) || 100,
    enabled: d.enabled,
    memberUserIds: d.strategy === "by_field" ? [] : d.memberUserIds,
    conditionField: d.strategy === "by_field" ? d.conditionField : null,
    conditionValue: d.strategy === "by_field" ? d.conditionValue : null,
    targetUserId: d.strategy === "by_field" && d.targetUserId !== "none" ? Number(d.targetUserId) : null,
  });

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast({ title: "Give the rule a name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const input = toInput(draft);
      if (draft.id) await updateAssignmentRule(draft.id, input);
      else await createAssignmentRule(input);
      setDraft(null);
      toast({ title: "Assignment rule saved", variant: "success" });
      await load();
    } catch (err) {
      toast({ title: "Could not save the rule", description: errorText(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule: AssignmentRule, enabled: boolean) => {
    try {
      await updateAssignmentRule(rule.id, {
        name: rule.name,
        strategy: rule.strategy,
        businessUnitId,
        priority: rule.priority,
        enabled,
        memberUserIds: rule.memberUserIds,
        conditionField: rule.conditionField,
        conditionValue: rule.conditionValue,
        targetUserId: rule.targetUserId,
      });
      await load();
    } catch (err) {
      toast({ title: "Could not change the rule", description: errorText(err), variant: "destructive" });
    }
  };

  const remove = async (rule: AssignmentRule) => {
    if (!confirm(`Delete the rule "${rule.name}"?`)) return;
    try {
      await deleteAssignmentRule(rule.id);
      toast({ title: "Rule deleted" });
      await load();
    } catch (err) {
      toast({ title: "Could not delete the rule", description: errorText(err), variant: "destructive" });
    }
  };

  const toggleMember = (id: number) =>
    setDraft((d) =>
      d ? { ...d, memberUserIds: d.memberUserIds.includes(id) ? d.memberUserIds.filter((m) => m !== id) : [...d.memberUserIds, id] } : d,
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Assignment rules</CardTitle>
          <CardDescription>
            Who gets a new lead when nobody is picked. Rules run in order of priority; the first rule that finds a person wins.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setDraft({ ...blankDraft, priority: String((rules.at(-1)?.priority ?? 90) + 10) })}>
          <Plus className="mr-1 size-4" /> Add rule
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        )}
        {!loading && rules.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No rules yet. New leads stay unassigned until you add one.
          </p>
        )}
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{rule.name}</span>
                <Badge variant="outline">{STRATEGY_LABELS[rule.strategy]}</Badge>
                <span className="text-xs text-muted-foreground">priority {rule.priority}</span>
              </div>
              <p className="text-sm text-muted-foreground">{summary(rule)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={rule.enabled} onCheckedChange={(v) => toggle(rule, v)} aria-label="Rule enabled" />
              <Button variant="ghost" size="icon" onClick={() => setDraft(draftFrom(rule))} aria-label="Edit rule">
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(rule)} aria-label="Delete rule">
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit assignment rule" : "New assignment rule"}</DialogTitle>
            <DialogDescription>Pick a strategy, then who it applies to.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rule-name">Name</Label>
                <Input id="rule-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Strategy</Label>
                  <Select value={draft.strategy} onValueChange={(v) => setDraft({ ...draft, strategy: v as AssignmentStrategy })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalog?.strategies ?? (Object.keys(STRATEGY_LABELS) as AssignmentStrategy[])).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STRATEGY_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rule-priority">Priority</Label>
                  <Input
                    id="rule-priority"
                    type="number"
                    min={1}
                    value={draft.priority}
                    onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Lower runs first.</p>
                </div>
              </div>

              {draft.strategy === "by_field" ? (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>When this field</Label>
                      <Select value={draft.conditionField} onValueChange={(v) => setDraft({ ...draft, conditionField: v })}>
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
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rule-value">Equals</Label>
                      <Input
                        id="rule-value"
                        value={draft.conditionValue}
                        onChange={(e) => setDraft({ ...draft, conditionValue: e.target.value })}
                        placeholder="e.g. Tavaro website"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Give matching leads to</Label>
                    <Select value={draft.targetUserId} onValueChange={(v) => setDraft({ ...draft, targetUserId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Pick a person</SelectItem>
                        {owners.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Only these people (leave all unticked for everyone in the unit)</Label>
                  <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-3">
                    {owners.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={draft.memberUserIds.includes(o.id)}
                          onChange={() => toggleMember(o.id)}
                        />
                        <span className="truncate">{o.name}</span>
                      </label>
                    ))}
                    {owners.length === 0 && <p className="text-sm text-muted-foreground">No staff found.</p>}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} id="rule-enabled" />
                <Label htmlFor="rule-enabled">Rule is on</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
