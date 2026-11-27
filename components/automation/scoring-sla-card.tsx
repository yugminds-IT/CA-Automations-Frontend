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
  AutomationCatalog,
  ConditionOp,
  ScoringRule,
  ScoringRuleInput,
  SlaPolicy,
  createScoringRule,
  deleteScoringRule,
  getSlaPolicy,
  listScoringRules,
  saveSlaPolicy,
  updateScoringRule,
} from "@/lib/api/automation";
import { LeadOwner, listLeadOwners } from "@/lib/api/leads";
import { OP_LABELS, fieldLabel } from "@/lib/automation";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

const DEFAULT_SLA = (unitId: number): SlaPolicy => ({
  businessUnitId: unitId,
  enabled: true,
  firstResponseMinutes: 60,
  escalateToUserId: null,
});

interface ScoreDraft {
  id?: number;
  name: string;
  field: string;
  op: ConditionOp;
  value: string;
  points: string;
  enabled: boolean;
}

const blankScore: ScoreDraft = { name: "", field: "phone", op: "exists", value: "", points: "10", enabled: true };

interface Props {
  businessUnitId: number;
  catalog: AutomationCatalog | null;
}

export function ScoringSlaCard({ businessUnitId, catalog }: Props) {
  const { toast } = useToast();
  const [sla, setSla] = useState<SlaPolicy | null>(null);
  const [slaSaving, setSlaSaving] = useState(false);
  const [scores, setScores] = useState<ScoringRule[]>([]);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<ScoreDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [policy, rules, people] = await Promise.all([
        getSlaPolicy(businessUnitId),
        listScoringRules(businessUnitId),
        listLeadOwners(),
      ]);
      setSla(policy ?? DEFAULT_SLA(businessUnitId));
      setScores(rules);
      setOwners(people);
    } catch (err) {
      toast({ title: "Could not load SLA and scoring", description: errorText(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSla = async () => {
    if (!sla) return;
    const minutes = Number(sla.firstResponseMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080) {
      toast({ title: "First response must be between 1 minute and 7 days", variant: "destructive" });
      return;
    }
    setSlaSaving(true);
    try {
      const saved = await saveSlaPolicy({
        businessUnitId,
        enabled: sla.enabled,
        firstResponseMinutes: minutes,
        escalateToUserId: sla.escalateToUserId,
      });
      setSla(saved);
      toast({ title: "SLA saved", variant: "success" });
    } catch (err) {
      toast({ title: "Could not save the SLA", description: errorText(err), variant: "destructive" });
    } finally {
      setSlaSaving(false);
    }
  };

  const saveScore = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast({ title: "Give the rule a name", variant: "destructive" });
      return;
    }
    const input: ScoringRuleInput = {
      name: draft.name.trim(),
      businessUnitId,
      field: draft.field,
      op: draft.op,
      value: draft.op === "exists" ? null : draft.value.trim(),
      points: Number(draft.points),
      enabled: draft.enabled,
    };
    setSaving(true);
    try {
      if (draft.id) await updateScoringRule(draft.id, input);
      else await createScoringRule(input);
      setDraft(null);
      toast({ title: "Scoring rule saved", variant: "success" });
      await load();
    } catch (err) {
      toast({ title: "Could not save the scoring rule", description: errorText(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleScore = async (rule: ScoringRule, enabled: boolean) => {
    try {
      await updateScoringRule(rule.id, {
        name: rule.name,
        businessUnitId,
        field: rule.field,
        op: rule.op,
        value: rule.value,
        points: rule.points,
        enabled,
      });
      await load();
    } catch (err) {
      toast({ title: "Could not change the rule", description: errorText(err), variant: "destructive" });
    }
  };

  const removeScore = async (rule: ScoringRule) => {
    if (!confirm(`Delete the scoring rule "${rule.name}"?`)) return;
    try {
      await deleteScoringRule(rule.id);
      toast({ title: "Scoring rule deleted" });
      await load();
    } catch (err) {
      toast({ title: "Could not delete the rule", description: errorText(err), variant: "destructive" });
    }
  };

  const fieldOptions = catalog?.fields ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>First response (SLA)</CardTitle>
          <CardDescription>
            Each new open lead must get a reply from staff within this time. When it does not, a task goes to the escalation person, or to the owner&apos;s team manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading || !sla ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Switch id="sla-on" checked={sla.enabled} onCheckedChange={(v) => setSla({ ...sla, enabled: v })} />
                <Label htmlFor="sla-on">Track first response in this unit</Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sla-minutes">Reply within (minutes)</Label>
                  <Input
                    id="sla-minutes"
                    type="number"
                    min={1}
                    max={10080}
                    value={sla.firstResponseMinutes}
                    onChange={(e) => setSla({ ...sla, firstResponseMinutes: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Escalate to</Label>
                  <Select
                    value={sla.escalateToUserId != null ? String(sla.escalateToUserId) : "manager"}
                    onValueChange={(v) => setSla({ ...sla, escalateToUserId: v === "manager" ? null : Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">The owner&apos;s team manager</SelectItem>
                      {owners.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={saveSla} disabled={slaSaving}>
                  {slaSaving ? "Saving…" : "Save SLA"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Lead score</CardTitle>
            <CardDescription>
              Points added when a condition holds. The score (0 to 100) shows on each lead, and is recalculated when the lead changes.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setDraft({ ...blankScore })}>
            <Plus className="mr-1 size-4" /> Add rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && scores.length === 0 && <p className="text-sm text-muted-foreground">No scoring rules yet. Every lead scores 0.</p>}
          {scores.map((rule) => (
            <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{rule.name}</span>
                  <Badge variant={rule.points < 0 ? "destructive" : "outline"}>
                    {rule.points > 0 ? `+${rule.points}` : rule.points}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {fieldLabel(rule.field)} {OP_LABELS[rule.op]}
                  {rule.op !== "exists" && rule.value ? ` "${rule.value}"` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={rule.enabled} onCheckedChange={(v) => toggleScore(rule, v)} aria-label="Scoring rule enabled" />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit scoring rule"
                  onClick={() =>
                    setDraft({
                      id: rule.id,
                      name: rule.name,
                      field: rule.field,
                      op: rule.op,
                      value: rule.value ?? "",
                      points: String(rule.points),
                      enabled: rule.enabled,
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete scoring rule" onClick={() => removeScore(rule)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit scoring rule" : "New scoring rule"}</DialogTitle>
            <DialogDescription>Use negative points to lower the score, for example for a free-mail address.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="score-name">Name</Label>
                <Input id="score-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>When this field</Label>
                  <Select value={draft.field} onValueChange={(v) => setDraft({ ...draft, field: v })}>
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
                  <Label>Is</Label>
                  <Select value={draft.op} onValueChange={(v) => setDraft({ ...draft, op: v as ConditionOp })}>
                    <SelectTrigger>
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
                </div>
              </div>
              {draft.op !== "exists" && (
                <div className="space-y-1.5">
                  <Label htmlFor="score-value">Value</Label>
                  <Input id="score-value" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="score-points">Points (-100 to 100)</Label>
                <Input id="score-points" type="number" min={-100} max={100} value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="score-on" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
                <Label htmlFor="score-on">Rule is on</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveScore} disabled={saving}>
              {saving ? "Saving…" : "Save rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}