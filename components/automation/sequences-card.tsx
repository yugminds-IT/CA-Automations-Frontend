"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Users, X } from "lucide-react";
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
import { listTemplates } from "@/lib/api/email-templates";
import { EmailTemplate } from "@/lib/api/types";
import {
  Sequence,
  SequenceEnrollment,
  SequenceInput,
  SequenceStep,
  createSequence,
  deleteSequence,
  listSequenceEnrollments,
  listSequences,
  updateSequence,
} from "@/lib/api/automation";
import { firstStepProblem, newStep, stopReasonLabel } from "@/lib/automation";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

interface Draft {
  id?: number;
  name: string;
  enabled: boolean;
  stopOnStageChange: boolean;
  stopOnReply: boolean;
  steps: SequenceStep[];
}

const blankDraft = (): Draft => ({
  name: "",
  enabled: true,
  stopOnStageChange: true,
  stopOnReply: true,
  steps: [newStep("email", 0)],
});

function draftFrom(seq: Sequence): Draft {
  return {
    id: seq.id,
    name: seq.name,
    enabled: seq.enabled,
    stopOnStageChange: seq.stopOnStageChange,
    stopOnReply: seq.stopOnReply,
    steps: seq.steps.map((s) => ({ ...s })),
  };
}

interface Props {
  businessUnitId: number;
}

export function SequencesCard({ businessUnitId }: Props) {
  const { toast } = useToast();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [watching, setWatching] = useState<Sequence | null>(null);
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, tpls] = await Promise.all([
        listSequences(businessUnitId),
        listTemplates({ businessUnitId }).catch(() => [] as EmailTemplate[]),
      ]);
      setSequences(list);
      setTemplates(tpls);
    } catch (err) {
      toast({ title: "Could not load sequences", description: errorText(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast({ title: "Give the sequence a name", variant: "destructive" });
      return;
    }
    const problem = firstStepProblem(draft.steps);
    if (problem) {
      toast({ title: problem, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const input: SequenceInput = {
        name: draft.name.trim(),
        businessUnitId,
        enabled: draft.enabled,
        stopOnStageChange: draft.stopOnStageChange,
        stopOnReply: draft.stopOnReply,
        steps: draft.steps.map((s) =>
          s.kind === "email"
            ? { kind: "email", delayDays: Number(s.delayDays) || 0, templateId: s.templateId ?? null, subject: s.subject ?? null, body: s.body ?? null }
            : { kind: "task", delayDays: Number(s.delayDays) || 0, taskTitle: s.taskTitle ?? null },
        ),
      };
      if (draft.id) await updateSequence(draft.id, input);
      else await createSequence(input);
      setDraft(null);
      toast({ title: "Sequence saved", variant: "success" });
      await load();
    } catch (err) {
      toast({ title: "Could not save the sequence", description: errorText(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (seq: Sequence, enabled: boolean) => {
    try {
      await updateSequence(seq.id, {
        name: seq.name,
        businessUnitId,
        enabled,
        stopOnStageChange: seq.stopOnStageChange,
        stopOnReply: seq.stopOnReply,
        steps: seq.steps,
      });
      await load();
    } catch (err) {
      toast({ title: "Could not change the sequence", description: errorText(err), variant: "destructive" });
    }
  };

  const remove = async (seq: Sequence) => {
    if (!confirm(`Delete the sequence "${seq.name}"? Leads already in it stop receiving steps.`)) return;
    try {
      await deleteSequence(seq.id);
      toast({ title: "Sequence deleted" });
      await load();
    } catch (err) {
      toast({ title: "Could not delete the sequence", description: errorText(err), variant: "destructive" });
    }
  };

  const watch = async (seq: Sequence) => {
    setWatching(seq);
    setEnrollments([]);
    try {
      setEnrollments(await listSequenceEnrollments(seq.id));
    } catch (err) {
      toast({ title: "Could not load enrollments", description: errorText(err), variant: "destructive" });
    }
  };

  const setStep = (index: number, patch: Partial<SequenceStep>) =>
    setDraft((d) => (d ? { ...d, steps: d.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) } : d));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Follow-up sequences</CardTitle>
          <CardDescription>
            A set of emails and tasks spread over days. A lead is stopped automatically when it moves stage, replies, or is won or lost.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setDraft(blankDraft())}>
          <Plus className="mr-1 size-4" /> Add sequence
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        )}
        {!loading && sequences.length === 0 && <p className="text-sm text-muted-foreground">No sequences yet.</p>}
        {sequences.map((seq) => (
          <div key={seq.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{seq.name}</span>
                <Badge variant="outline">
                  {seq.steps.length} step{seq.steps.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {[seq.stopOnStageChange && "stops on stage change", seq.stopOnReply && "stops on reply"].filter(Boolean).join(" · ") || "runs to the end"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={seq.enabled} onCheckedChange={(v) => toggle(seq, v)} aria-label="Sequence enabled" />
              <Button variant="ghost" size="icon" onClick={() => watch(seq)} aria-label="Enrolled leads">
                <Users className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDraft(draftFrom(seq))} aria-label="Edit sequence">
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(seq)} aria-label="Delete sequence">
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit sequence" : "New sequence"}</DialogTitle>
            <DialogDescription>Each step waits the number of days after the step before it. The first step can wait too.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="seq-name">Name</Label>
                <Input id="seq-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>

              <div className="space-y-3">
                {draft.steps.map((s, i) => (
                  <div key={i} className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">Step {i + 1}</span>
                      <Select
                        value={s.kind}
                        onValueChange={(v) => setStep(i, v === "email" ? { kind: "email", taskTitle: null } : { kind: "task", subject: null, body: null, templateId: null })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Send email</SelectItem>
                          <SelectItem value="task">Create task</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1 text-sm">
                        <Input
                          type="number"
                          min={0}
                          max={365}
                          className="w-20"
                          value={s.delayDays}
                          onChange={(e) => setStep(i, { delayDays: Number(e.target.value) })}
                          aria-label={`Step ${i + 1} wait in days`}
                        />
                        <span className="text-muted-foreground">days {i === 0 ? "after enrolment" : "after the step before"}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto"
                        aria-label="Remove step"
                        onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, j) => j !== i) })}
                        disabled={draft.steps.length === 1}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>

                    {s.kind === "email" ? (
                      <div className="space-y-2">
                        <Select
                          value={s.templateId ? String(s.templateId) : "custom"}
                          onValueChange={(v) => setStep(i, { templateId: v === "custom" ? null : Number(v) })}
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
                        {!s.templateId && (
                          <>
                            <Input value={s.subject ?? ""} onChange={(e) => setStep(i, { subject: e.target.value })} placeholder="Subject" />
                            <Textarea value={s.body ?? ""} onChange={(e) => setStep(i, { body: e.target.value })} placeholder="Message. Use {{first_name}} and so on." />
                          </>
                        )}
                      </div>
                    ) : (
                      <Input value={s.taskTitle ?? ""} onChange={(e) => setStep(i, { taskTitle: e.target.value })} placeholder="Task title, e.g. Call {{first_name}}" />
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, steps: [...draft.steps, newStep("email", 2)] })}>
                    <Plus className="mr-1 size-3" /> Email step
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, steps: [...draft.steps, newStep("task", 2)] })}>
                    <Plus className="mr-1 size-3" /> Task step
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch id="seq-stop-stage" checked={draft.stopOnStageChange} onCheckedChange={(v) => setDraft({ ...draft, stopOnStageChange: v })} />
                  <Label htmlFor="seq-stop-stage">Stop when the lead moves stage</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="seq-stop-reply" checked={draft.stopOnReply} onCheckedChange={(v) => setDraft({ ...draft, stopOnReply: v })} />
                  <Label htmlFor="seq-stop-reply">Stop when the lead replies</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="seq-enabled" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
                  <Label htmlFor="seq-enabled">Sequence is on</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save sequence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={watching !== null} onOpenChange={(open) => !open && setWatching(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Leads in {watching?.name}</DialogTitle>
            <DialogDescription>The 200 most recent enrolments.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
            {enrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-md border p-2">
                <span>
                  Lead #{e.leadId} · step {Math.min(e.currentStep + 1, watching?.steps.length ?? 1)} of {watching?.steps.length ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  {e.status === "active" && e.nextStepAt
                    ? `next ${new Date(e.nextStepAt).toLocaleString("en-IN")}`
                    : e.status === "stopped"
                      ? stopReasonLabel(e.stopReason)
                      : "completed"}
                </span>
              </li>
            ))}
            {enrollments.length === 0 && <li className="text-muted-foreground">No leads enrolled yet.</li>}
          </ul>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
