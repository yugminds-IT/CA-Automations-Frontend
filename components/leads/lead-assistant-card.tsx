"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { addActivity, Lead } from "@/lib/api/leads";
import {
  DraftReply,
  DraftTone,
  NextAction,
  cleanNote,
  draftReply,
  getAssistantStatus,
  getNextActions,
} from "@/lib/api/assistant";

interface Props {
  lead: Lead;
  onChanged: () => void;
}

const PRIORITY_VARIANT = { high: "destructive", medium: "secondary", low: "outline" } as const;
const PRIORITY_LABEL = { high: "Do soon", medium: "When you can", low: "Later" } as const;

/** Next steps, reply drafts and note cleanup for one lead. Works without an AI key; a key makes the wording better. */
export function LeadAssistantCard({ lead, onChanged }: Props) {
  const { toast } = useToast();
  const [actions, setActions] = useState<NextAction[] | null>(null);
  const [modelOn, setModelOn] = useState<boolean>(false);

  const [tone, setTone] = useState<DraftTone>("friendly");
  const [intent, setIntent] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<DraftReply | null>(null);

  const [noteDraft, setNoteDraft] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [cleaned, setCleaned] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadActions = useCallback(async () => {
    try {
      const res = await getNextActions(lead.id);
      setActions(res.actions);
    } catch {
      setActions([]);
    }
  }, [lead.id]);

  useEffect(() => {
    loadActions();
    getAssistantStatus()
      .then((s) => setModelOn(s.modelConfigured))
      .catch(() => setModelOn(false));
  }, [loadActions, lead.status, lead.ownerUserId, lead.nextFollowUpAt]);

  const runDraft = async () => {
    setDrafting(true);
    try {
      setDraft(await draftReply(lead.id, { tone, intent: intent.trim() || undefined }));
    } catch (e) {
      toast({ title: "Could not draft a reply", description: (e as Error).message, variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };

  const copyDraft = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
      toast({ title: "Copied", description: "Paste it into an email or message." });
    } catch {
      toast({ title: "Copy failed", description: "Select the text and copy it manually.", variant: "destructive" });
    }
  };

  const runClean = async () => {
    setCleaning(true);
    try {
      const res = await cleanNote(noteDraft);
      setCleaned(res.text);
    } catch (e) {
      toast({ title: "Could not clean the note", description: (e as Error).message, variant: "destructive" });
    } finally {
      setCleaning(false);
    }
  };

  const saveNote = async () => {
    if (!cleaned?.trim()) return;
    setSaving(true);
    try {
      await addActivity(lead.id, "note", cleaned);
      setNoteDraft("");
      setCleaned(null);
      toast({ title: "Note saved to the timeline" });
      onChanged();
    } catch (e) {
      toast({ title: "Could not save the note", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-xl text-sm text-muted-foreground">
          What to do next for this lead, a message you can copy into an email, and a way to tidy rough notes.
        </p>
        <Badge variant="outline" className="shrink-0">
          <Sparkles className="mr-1 size-3" />
          {modelOn ? "AI writes the wording" : "Standard wording, no AI"}
        </Badge>
      </div>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">What to do next</h3>
          {actions === null ? (
            <p className="text-sm text-muted-foreground">Checking…</p>
          ) : actions.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4" /> Nothing needs attention right now.
            </p>
          ) : (
            <ul className="space-y-2">
              {actions.map((a) => (
                <li key={a.title} className="flex items-start gap-3 rounded-md border p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{a.title}</span>
                      <Badge variant={PRIORITY_VARIANT[a.priority]}>{PRIORITY_LABEL[a.priority]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Write a message</h3>
          <p className="text-xs text-muted-foreground">A draft you can copy. It is not sent until you send it yourself.</p>
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <div className="space-y-1">
              <Label className="text-xs">Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as DraftTone)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="brief">Brief</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">What should the message say? Optional.</Label>
              <Input value={intent} maxLength={1000} onChange={(e) => setIntent(e.target.value)} placeholder="For example: share the demo times for next week" />
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={runDraft} disabled={drafting}>
            {drafting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Write it
          </Button>
          {draft && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {draft.subject}</p>
              <pre className="whitespace-pre-wrap font-sans text-sm">{draft.body}</pre>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draft.source === "model" ? "Written with AI" : "A standard message"}. Read it before you send it.</span>
                <Button size="sm" variant="ghost" onClick={copyDraft}><Copy className="mr-2 size-4" />Copy</Button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Tidy rough notes</h3>
          <p className="text-xs text-muted-foreground">Paste what was said on a call or in a meeting. You can edit the tidy version, then save it on the Activity tab.</p>
          <Textarea rows={3} value={noteDraft} maxLength={8000} onChange={(e) => { setNoteDraft(e.target.value); setCleaned(null) }} placeholder="Paste your rough notes" />
          <Button size="sm" variant="outline" onClick={runClean} disabled={cleaning || !noteDraft.trim()}>
            {cleaning && <Loader2 className="mr-2 size-4 animate-spin" />}
            Tidy it
          </Button>
          {cleaned !== null && (
            <div className="space-y-2">
              <Textarea rows={4} value={cleaned} onChange={(e) => setCleaned(e.target.value)} />
              <Button size="sm" onClick={saveNote} disabled={saving || !cleaned.trim()}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save on Activity
              </Button>
            </div>
          )}
        </section>
    </div>
  );
}
