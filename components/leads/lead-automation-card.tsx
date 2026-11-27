"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { listTemplates } from "@/lib/api/email-templates";
import { EmailTemplate } from "@/lib/api/types";
import { Lead } from "@/lib/api/leads";
import {
  Sequence,
  SequenceEnrollment,
  enrollLead,
  listLeadEnrollments,
  listSequences,
  sendLeadEmail,
  stopEnrollment,
} from "@/lib/api/automation";
import { scoreTone, slaState, stopReasonLabel } from "@/lib/automation";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

const SCORE_CLASS = {
  high: "bg-emerald-100 text-emerald-900 border-emerald-200",
  medium: "bg-amber-100 text-amber-900 border-amber-200",
  low: "bg-slate-100 text-slate-800 border-slate-200",
} as const;

const SLA_CLASS = {
  ok: "text-emerald-700",
  due: "text-amber-700",
  breached: "text-red-700 font-medium",
  none: "text-muted-foreground",
} as const;

interface Props {
  lead: Lead;
  /** Called after a change that affects the lead (email sent, sequence started or stopped), so the page can reload. */
  onChanged: () => void;
}

export function LeadAutomationCard({ lead, onChanged }: Props) {
  const { toast } = useToast();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [enrollPick, setEnrollPick] = useState<string>("");
  const [enrolling, setEnrolling] = useState(false);

  const [templateId, setTemplateId] = useState<string>("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [seqs, enr, tpls] = await Promise.all([
        listSequences(lead.businessUnitId),
        listLeadEnrollments(lead.id),
        listTemplates({ businessUnitId: lead.businessUnitId }).catch(() => [] as EmailTemplate[]),
      ]);
      setSequences(seqs);
      setEnrollments(enr);
      setTemplates(tpls);
    } catch (err) {
      toast({ title: "Could not load automation", description: errorText(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [lead.id, lead.businessUnitId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const sla = slaState(lead);
  const tone = scoreTone(lead.score ?? 0);
  const sequenceName = (id: number) => sequences.find((s) => s.id === id)?.name ?? `Sequence #${id}`;
  const activeIds = new Set(enrollments.filter((e) => e.status === "active").map((e) => e.sequenceId));
  const enrollable = sequences.filter((s) => s.enabled && !activeIds.has(s.id));

  const enroll = async () => {
    if (!enrollPick) return;
    setEnrolling(true);
    try {
      await enrollLead(lead.id, Number(enrollPick));
      setEnrollPick("");
      toast({ title: "Lead enrolled in the sequence" });
      await load();
      onChanged();
    } catch (err) {
      toast({ title: "Could not enrol the lead", description: errorText(err), variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  const stop = async (enrollment: SequenceEnrollment) => {
    try {
      await stopEnrollment(enrollment.id);
      toast({ title: "Sequence stopped for this lead" });
      await load();
      onChanged();
    } catch (err) {
      toast({ title: "Could not stop the sequence", description: errorText(err), variant: "destructive" });
    }
  };

  const send = async () => {
    const useTemplate = templateId !== "custom";
    if (!useTemplate && (!subject.trim() || !body.trim())) {
      toast({ title: "Add a subject and a message, or pick a template", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const result = await sendLeadEmail(
        lead.id,
        useTemplate ? { templateId: Number(templateId) } : { subject: subject.trim(), body: body.trim() },
      );
      if (result.status === "suppressed") {
        toast({
          title: "Email not sent",
          description: "This address has unsubscribed or bounced before.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Email queued", description: result.subject });
        setSubject("");
        setBody("");
        setTemplateId("custom");
        onChanged();
      }
    } catch (err) {
      toast({ title: "Could not send the email", description: errorText(err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={SCORE_CLASS[tone]} title="Lead score from the scoring rules">
            Score {lead.score ?? 0}
          </Badge>
          {sla.label && <span className={`text-sm ${SLA_CLASS[sla.tone]}`}>{sla.label}</span>}
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Follow-up sequences</h3>
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          )}
          {!loading && enrollments.length === 0 && <p className="text-sm text-muted-foreground">Not in any sequence.</p>}
          <ul className="space-y-2">
            {enrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{sequenceName(e.sequenceId)}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.status === "active"
                      ? e.nextStepAt
                        ? `Next step ${new Date(e.nextStepAt).toLocaleString("en-IN")}`
                        : "Active"
                      : e.status === "completed"
                        ? "Completed"
                        : stopReasonLabel(e.stopReason) || "Stopped"}
                  </div>
                </div>
                {e.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => stop(e)}>
                    <Square className="mr-1 size-3" /> Stop
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {enrollable.length > 0 && (
            <div className="flex gap-2">
              <Select value={enrollPick} onValueChange={setEnrollPick}>
                <SelectTrigger aria-label="Sequence to add">
                  <SelectValue placeholder="Add to a sequence…" />
                </SelectTrigger>
                <SelectContent>
                  {enrollable.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={enroll} disabled={!enrollPick || enrolling}>
                {enrolling ? "Adding…" : "Add"}
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-medium">Send an email</h3>
          <p className="text-xs text-muted-foreground">
            Sent from this unit&apos;s mail account to {lead.email ?? "no address yet"}. Opens and clicks are logged on this lead.
          </p>
          <Select value={templateId} onValueChange={setTemplateId} disabled={!lead.email}>
            <SelectTrigger aria-label="Email template">
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
          {templateId === "custom" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="lead-mail-subject">Subject</Label>
                <Input id="lead-mail-subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!lead.email} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lead-mail-body">Message</Label>
                <Textarea id="lead-mail-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} disabled={!lead.email} />
              </div>
            </>
          )}
          <div className="flex justify-end">
            <Button size="sm" onClick={send} disabled={sending || !lead.email}>
              <Send className="mr-1 size-3" /> {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </section>
    </div>
  );
}
