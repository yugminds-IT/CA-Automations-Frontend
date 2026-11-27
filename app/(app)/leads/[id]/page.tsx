"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { CustomFieldInputs } from "@/components/leads/custom-field-inputs";
import { LeadAutomationCard } from "@/components/leads/lead-automation-card";
import { LeadAssistantCard } from "@/components/leads/lead-assistant-card";
import { LeadMessagingCard } from "@/components/leads/lead-messaging-card";
import { CustomField, listCustomFields } from "@/lib/api/custom-fields";
import { changedValues, isBlank, isFieldShown } from "@/lib/custom-fields";
import { stageOptions } from "@/lib/pipeline-stages";
import {
  Lead,
  updateLead,
  LeadActivity,
  LeadTask,
  addActivity,
  addTask,
  getLead,
  listActivities,
  listLeads,
  listOpenTasks,
  listPipelines,
  mergeLeads,
  moveLead,
  setTaskDone,
  PipelineStage,
  LeadOwner,
  listLeadOwners,
} from "@/lib/api/leads";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  value: string;
  tags: string;
  nextFollowUpAt: string;
};

/** ISO timestamp to the value a datetime-local input expects, in the user's time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Other leads in the same brand, so a duplicate can be picked by name. Stops after 1,000. */
async function listOtherLeads(businessUnitId: number, currentId: number): Promise<Lead[]> {
  const out: Lead[] = [];
  let page = 1;
  let total = Infinity;
  while (out.length < total && page <= 5) {
    const res = await listLeads({ businessUnitId, limit: 200, page });
    out.push(...res.items);
    total = res.total;
    if (res.items.length === 0) break;
    page += 1;
  }
  return out.filter((l) => l.id !== currentId);
}

function contactFrom(l: Lead): ContactForm {
  return {
    name: l.name,
    email: l.email ?? "",
    phone: l.phone ?? "",
    company: l.company ?? "",
    source: l.source ?? "",
    value: l.value != null ? String(l.value) : "",
    tags: l.tags.join(", "),
    nextFollowUpAt: toLocalInput(l.nextFollowUpAt),
  };
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { toast } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [savingFields, setSavingFields] = useState(false);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [contact, setContact] = useState<ContactForm | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<LeadActivity["type"]>("note");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [mergeId, setMergeId] = useState("");
  const [otherLeads, setOtherLeads] = useState<Lead[]>([]);

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) return;
    setLoading(true);
    try {
      const l = await getLead(id);
      setLead(l);
      setDraft(l.customData ?? {});
      setContact(contactFrom(l));
      const [pipelines, acts, open, defs, others] = await Promise.all([
        listPipelines(l.businessUnitId),
        listActivities(id),
        listOpenTasks(),
        listCustomFields(l.businessUnitId),
        listOtherLeads(l.businessUnitId, id),
      ]);
      setFields(defs);
      setOtherLeads(others);
      const pipeline = pipelines.find((p) => p.id === l.pipelineId);
      setStages(pipeline?.stages ?? []);
      setActivities(acts);
      setTasks(open.filter((t) => t.leadId === id));
    } catch (err: any) {
      toast({ title: "Could not load lead", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listLeadOwners().then(setOwners).catch(() => setOwners([]));
  }, []);

  const handleOwner = async (value: string) => {
    if (!lead) return;
    try {
      await updateLead(lead.id, { ownerUserId: value === "none" ? null : Number(value) });
      await load();
    } catch (err: any) {
      toast({ title: "Could not change owner", description: err?.message, variant: "destructive" });
    }
  };

  const handleSaveContact = async () => {
    if (!lead || !contact) return;
    if (!contact.name.trim()) return toast({ title: "Name is required", variant: "destructive" });
    if (contact.email.trim() && !EMAIL_RE.test(contact.email.trim()))
      return toast({ title: "Enter a valid email", variant: "destructive" });
    if (!contact.email.trim() && !contact.phone.trim())
      return toast({ title: "Enter an email or a phone number", variant: "destructive" });
    const value = contact.value.trim() ? Number(contact.value) : null;
    if (value !== null && (!Number.isFinite(value) || value < 0))
      return toast({ title: "Value must be 0 or more", variant: "destructive" });
    setSavingContact(true);
    try {
      const updated = await updateLead(lead.id, {
        name: contact.name.trim(),
        email: contact.email.trim() || null,
        phone: contact.phone.trim() || null,
        company: contact.company.trim() || null,
        source: contact.source.trim() || null,
        value,
        tags: contact.tags.split(",").map((t) => t.trim()).filter(Boolean),
        nextFollowUpAt: contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt).toISOString() : null,
      });
      setLead(updated);
      setContact(contactFrom(updated));
      toast({ title: "Lead updated" });
    } catch (err: any) {
      toast({ title: "Could not save", description: err?.message, variant: "destructive" });
    } finally {
      setSavingContact(false);
    }
  };

  const handleMove = async (stageId: number) => {
    if (!lead || lead.stageId === stageId) return;
    try {
      await moveLead(lead.id, stageId);
      await load();
    } catch (err: any) {
      toast({ title: "Could not move lead", description: err?.message, variant: "destructive" });
    }
  };

  const handleSaveFields = async () => {
    if (!lead) return;
    const missing = fields.filter(
      (f) => f.isActive && f.canSee && f.required && isFieldShown(f, draft) && isBlank(draft[f.key]),
    );
    if (missing.length > 0) {
      toast({
        title: "Fill in the required fields",
        description: missing.map((f) => f.label).join(", "),
        variant: "destructive",
      });
      return;
    }
    const changes = changedValues(lead.customData ?? {}, draft);
    if (Object.keys(changes).length === 0) {
      toast({ title: "Nothing to save" });
      return;
    }
    setSavingFields(true);
    try {
      const updated = await updateLead(lead.id, { customData: changes });
      setLead(updated);
      setDraft(updated.customData ?? {});
      toast({ title: "Details saved" });
    } catch (err: any) {
      toast({ title: "Could not save details", description: err?.message, variant: "destructive" });
    } finally {
      setSavingFields(false);
    }
  };

  const handleNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await addActivity(id, noteType, note.trim());
      setNote("");
      await load();
    } catch (err: any) {
      toast({ title: "Could not save", description: err?.message, variant: "destructive" });
    }
  };

  const handleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await addTask(id, taskTitle.trim(), taskDue ? new Date(taskDue).toISOString() : undefined);
      setTaskTitle("");
      setTaskDue("");
      await load();
    } catch (err: any) {
      toast({ title: "Could not add task", description: err?.message, variant: "destructive" });
    }
  };

  const handleTaskToggle = async (task: LeadTask) => {
    try {
      await setTaskDone(task.id, task.completedAt == null);
      await load();
    } catch (err: any) {
      toast({ title: "Could not update task", description: err?.message, variant: "destructive" });
    }
  };

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    const dropId = Number(mergeId);
    const other = otherLeads.find((l) => l.id === dropId);
    if (!other) {
      toast({ title: "Choose the lead to merge", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Merge ${other.name} into this lead? ${other.name} will be deleted.`)) return;
    try {
      await mergeLeads(id, dropId);
      toast({ title: `Merged ${other.name} into this lead` });
      setMergeId("");
      await load();
    } catch (err: any) {
      toast({ title: "Merge failed", description: err?.message, variant: "destructive" });
    }
  };

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Lead not found.</p>
        <Link href="/leads" className="text-sm underline">Back to leads</Link>
      </div>
    );
  }

  const stageChoices = stageOptions(stages, lead.stageId);
  const contactLine = [lead.company, lead.email, lead.phone].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-3 p-4 sm:p-5 xl:h-full xl:min-h-0 xl:overflow-hidden">
      <div className="shrink-0">
        <Link href="/leads" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Leads
        </Link>
        <PageHeader
          title={
            <span className="inline-flex flex-wrap items-center gap-2">
              {lead.name}
              <Badge variant={lead.status === "lost" ? "destructive" : lead.status === "won" ? "default" : "secondary"}>
                {lead.status}
              </Badge>
            </span>
          }
          description={contactLine || "No contact details yet"}
        />
        {lead.lostReason && <p className="mt-2 text-sm text-muted-foreground">Lost because: {lead.lostReason}</p>}
        {stageChoices.length > 0 && (
          <div role="radiogroup" aria-label="Stage" className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {stageChoices.map((s) => {
              const current = s.id === lead.stageId;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={current}
                  onClick={() => handleMove(s.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                    current && s.isWon && "border-emerald-600 bg-emerald-600 text-white",
                    current && s.isLost && "border-red-600 bg-red-600 text-white",
                    current && !s.isWon && !s.isLost && "border-primary bg-primary text-primary-foreground",
                    !current && "border-border bg-background hover:bg-muted",
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid items-start gap-4 xl:min-h-0 xl:flex-1 xl:items-stretch xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-4 xl:min-h-0 xl:overflow-hidden">
        {fields.some((f) => f.isActive && f.canSee) && (
          <Card className="max-h-[40%] shrink-0 overflow-y-auto">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <CustomFieldInputs
                fields={fields}
                values={draft}
                disabled={savingFields}
                onChange={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveFields} disabled={savingFields}>
                  {savingFields ? "Saving…" : "Save details"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="gap-3 py-4 xl:min-h-0 xl:flex-1 xl:overflow-hidden">
          <CardContent className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
            <Tabs defaultValue="activity" className="xl:min-h-0 xl:flex-1">
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="contact">Owner and contact</TabsTrigger>
                <TabsTrigger value="assistant">Assistant</TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="mt-3 flex flex-col gap-3 xl:min-h-0 xl:flex-1">
            <form onSubmit={handleNote} className="shrink-0 space-y-2">
              <div className="flex gap-2">
                <Select value={noteType} onValueChange={(v) => setNoteType(v as LeadActivity["type"])}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea rows={2} placeholder="What happened?" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button type="submit" size="sm" disabled={!note.trim()}>
                Save
              </Button>
            </form>
            <ul className="space-y-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
              {activities.map((a) => (
                <li key={a.id} className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
                  <div className="text-xs capitalize text-muted-foreground">
                    {a.type.replaceAll("_", " ")} · {new Date(a.createdAt).toLocaleString("en-IN")}
                  </div>
                  <div className="mt-0.5">{a.body}</div>
                </li>
              ))}
              {activities.length === 0 && <li className="text-sm text-muted-foreground">No activity yet.</li>}
            </ul>
              </TabsContent>
              <TabsContent value="contact" className="mt-3 space-y-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
            <div className="max-w-xs space-y-1.5">
              <Label>Owner</Label>
              <Select value={lead.ownerUserId != null ? String(lead.ownerUserId) : "none"} onValueChange={handleOwner}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {owners.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {contact && (
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveContact();
                }}
              >
                {(
                  [
                    ["name", "Name"],
                    ["email", "Email"],
                    ["phone", "Phone"],
                    ["company", "Company"],
                    ["source", "Source"],
                    ["value", "Value (₹)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`c-${key}`}>{label}</Label>
                    <Input
                      id={`c-${key}`}
                      inputMode={key === "value" ? "decimal" : undefined}
                      value={contact[key]}
                      onChange={(e) => setContact({ ...contact, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <Label htmlFor="c-tags">Tags</Label>
                  <Input id="c-tags" placeholder="comma, separated" value={contact.tags} onChange={(e) => setContact({ ...contact, tags: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-followup">Next follow-up</Label>
                  <Input
                    id="c-followup"
                    type="datetime-local"
                    value={contact.nextFollowUpAt}
                    onChange={(e) => setContact({ ...contact, nextFollowUpAt: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground sm:col-span-2">
                  <span>Created {new Date(lead.createdAt).toLocaleDateString("en-IN")}</span>
                  <Button type="submit" size="sm" disabled={savingContact}>
                    {savingContact ? "Saving…" : "Save contact"}
                  </Button>
                </div>
              </form>
            )}
              </TabsContent>
              <TabsContent value="assistant" className="mt-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                <LeadAssistantCard lead={lead} onChanged={load} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="flex min-h-0 flex-col">
        <Card className="flex max-h-[calc(100dvh-18rem)] min-h-0 flex-col gap-3 overflow-hidden py-4">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Tabs defaultValue="tasks" className="min-h-0 flex-1 overflow-hidden">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="automation">Automation</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="merge">Merge a duplicate</TabsTrigger>
              </TabsList>
              <TabsContent value="tasks" className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto">
            <form onSubmit={handleTask} className="space-y-2">
              <Input placeholder="Follow up with…" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
              <div className="flex gap-2">
                <Input type="datetime-local" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
                <Button type="submit" size="sm" disabled={!taskTitle.trim()}>
                  Add
                </Button>
              </div>
            </form>
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-sm">
                  <button type="button" onClick={() => handleTaskToggle(t)} aria-label={t.completedAt ? "Mark not done" : "Mark done"}>
                    {t.completedAt ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4" />}
                  </button>
                  <div>
                    <div className={t.completedAt ? "text-muted-foreground line-through" : undefined}>{t.title}</div>
                    {t.dueAt && (
                      <div className="text-xs text-muted-foreground">
                        Due {new Date(t.dueAt).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {tasks.length === 0 && <li className="text-sm text-muted-foreground">No open tasks.</li>}
            </ul>
              </TabsContent>
              <TabsContent value="automation" className="mt-3 min-h-0 flex-1 overflow-y-auto">
                <LeadAutomationCard lead={lead} onChanged={load} />
              </TabsContent>
              <TabsContent value="messages" className="mt-3 min-h-0 flex-1 overflow-y-auto">
                <LeadMessagingCard lead={lead} onChanged={load} />
              </TabsContent>
              <TabsContent value="merge" className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
                <p className="text-sm text-muted-foreground">
                  Pick the other lead. Its notes and tasks move here, empty fields are filled in, and that lead is then deleted.
                </p>
                <form onSubmit={handleMerge} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="merge-lead">Lead to merge</Label>
                    <Select value={mergeId || "none"} onValueChange={(v) => setMergeId(v === "none" ? "" : v)}>
                      <SelectTrigger id="merge-lead">
                        <SelectValue placeholder="Choose a lead" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Choose a lead</SelectItem>
                        {otherLeads.map((l) => (
                          <SelectItem key={l.id} value={String(l.id)}>
                            {l.name}{l.email ? ` · ${l.email}` : l.company ? ` · ${l.company}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {otherLeads.length === 0 && (
                    <p className="text-sm text-muted-foreground">No other leads to merge.</p>
                  )}
                  <Button type="submit" size="sm" variant="outline" disabled={!mergeId}>
                    Merge into this lead
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
