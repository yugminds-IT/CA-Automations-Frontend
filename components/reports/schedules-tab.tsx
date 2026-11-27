"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Dashboard,
  ReportSchedule,
  ScheduleFrequency,
  ScheduleInput,
  createSchedule,
  deleteSchedule,
  listDashboards,
  listSchedules,
  sendScheduleNow,
  updateSchedule,
} from "@/lib/api/reports";
import { WEEKDAYS, describeSchedule, hourLabel, parseRecipients } from "@/lib/reports";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

interface Draft {
  id: number | null;
  name: string;
  scope: "standard" | "dashboard";
  dashboardId: string;
  frequency: ScheduleFrequency;
  dayOfWeek: string;
  dayOfMonth: string;
  hourIst: string;
  recipients: string;
  format: "xlsx" | "csv";
  rangeDays: string;
  enabled: boolean;
}

const blank: Draft = {
  id: null,
  name: "",
  scope: "standard",
  dashboardId: "",
  frequency: "weekly",
  dayOfWeek: "1",
  dayOfMonth: "1",
  hourIst: "9",
  recipients: "",
  format: "xlsx",
  rangeDays: "30",
  enabled: true,
};

function draftFrom(s: ReportSchedule): Draft {
  return {
    id: s.id,
    name: s.name,
    scope: s.scope,
    dashboardId: s.dashboardId ? String(s.dashboardId) : "",
    frequency: s.frequency,
    dayOfWeek: String(s.dayOfWeek ?? 1),
    dayOfMonth: String(s.dayOfMonth ?? 1),
    hourIst: String(s.hourIst),
    recipients: s.recipients.join(", "),
    format: s.format,
    rangeDays: String(s.rangeDays),
    enabled: s.enabled,
  };
}

function inputFrom(d: Draft): ScheduleInput {
  return {
    name: d.name.trim(),
    scope: d.scope,
    dashboardId: d.scope === "dashboard" ? Number(d.dashboardId) : null,
    frequency: d.frequency,
    dayOfWeek: d.frequency === "weekly" ? Number(d.dayOfWeek) : null,
    dayOfMonth: d.frequency === "monthly" ? Number(d.dayOfMonth) : null,
    hourIst: Number(d.hourIst),
    recipients: parseRecipients(d.recipients),
    format: d.format,
    rangeDays: Number(d.rangeDays),
    filters: {},
    enabled: d.enabled,
  };
}

export function SchedulesTab() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([listSchedules(), listDashboards()]);
      setSchedules(s);
      setDashboards(d);
    } catch (err) {
      toast({ title: "Could not load scheduled emails", description: errorText(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const input = inputFrom(draft);
      if (draft.id) await updateSchedule(draft.id, input);
      else await createSchedule(input);
      setDraft(null);
      toast({ title: "Schedule saved", description: "It will send at the next time shown in the list." });
      await load();
    } catch (err) {
      toast({ title: "Could not save the schedule", description: errorText(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s: ReportSchedule, enabled: boolean) => {
    try {
      await updateSchedule(s.id, {
        name: s.name,
        scope: s.scope,
        dashboardId: s.dashboardId,
        frequency: s.frequency,
        dayOfWeek: s.dayOfWeek,
        dayOfMonth: s.dayOfMonth,
        hourIst: s.hourIst,
        recipients: s.recipients,
        format: s.format,
        rangeDays: s.rangeDays,
        filters: s.filters,
        enabled,
      });
      await load();
    } catch (err) {
      toast({ title: "Could not change the schedule", description: errorText(err), variant: "destructive" });
    }
  };

  const sendNow = async (s: ReportSchedule) => {
    try {
      const res = await sendScheduleNow(s.id);
      toast({ title: "Report sent", description: res.filename });
      await load();
    } catch (err) {
      toast({ title: "Could not send the report", description: errorText(err), variant: "destructive" });
    }
  };

  const remove = async (s: ReportSchedule) => {
    if (!confirm(`Delete the schedule "${s.name}"?`)) return;
    try {
      await deleteSchedule(s.id);
      await load();
    } catch (err) {
      toast({ title: "Could not delete the schedule", description: errorText(err), variant: "destructive" });
    }
  };

  const dashboardName = (id: number | null) => dashboards.find((d) => d.id === id)?.name ?? "a dashboard";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Reports are emailed as an attachment. Each one is worked out with the data scope of the person who set it up.
        </p>
        <Button size="sm" onClick={() => setDraft({ ...blank })}>
          <Plus className="mr-1 size-4" /> New schedule
        </Button>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      )}
      {!loading && schedules.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No scheduled emails yet.</CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {schedules.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="outline">{s.scope === "standard" ? "Standard pack" : dashboardName(s.dashboardId)}</Badge>
                  <Badge variant="outline">{s.format === "xlsx" ? "Excel" : "CSV"}</Badge>
                  {s.lastStatus === "failed" && <Badge variant="destructive">Last send failed</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {describeSchedule(s)} · covers the last {s.rangeDays} days · to {s.recipients.join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.enabled ? `Next send ${new Date(s.nextRunAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST` : "Paused"}
                  {s.lastRunAt ? ` · last run ${new Date(s.lastRunAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : ""}
                  {s.lastError ? ` · ${s.lastError}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s, v)} aria-label="Schedule on" />
                <Button variant="outline" size="sm" onClick={() => sendNow(s)}>
                  <Send className="mr-1 size-3" /> Send now
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDraft(draftFrom(s))}>
                  Edit
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete schedule" onClick={() => remove(s)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit schedule" : "New schedule"}</DialogTitle>
            <DialogDescription>Times are India time (IST).</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sch-name">Name</Label>
                <Input id="sch-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Monday sales pack" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>What to send</Label>
                  <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v as "standard" | "dashboard" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard report pack</SelectItem>
                      <SelectItem value="dashboard">A dashboard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {draft.scope === "dashboard" && (
                  <div className="space-y-1.5">
                    <Label>Dashboard</Label>
                    <Select value={draft.dashboardId || "none"} onValueChange={(v) => setDraft({ ...draft, dashboardId: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Choose a dashboard</SelectItem>
                        {dashboards.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>How often</Label>
                  <Select value={draft.frequency} onValueChange={(v) => setDraft({ ...draft, frequency: v as ScheduleFrequency })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Every day</SelectItem>
                      <SelectItem value="weekly">Every week</SelectItem>
                      <SelectItem value="monthly">Every month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {draft.frequency === "weekly" && (
                  <div className="space-y-1.5">
                    <Label>Day</Label>
                    <Select value={draft.dayOfWeek} onValueChange={(v) => setDraft({ ...draft, dayOfWeek: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((d, i) => (
                          <SelectItem key={d} value={String(i)}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {draft.frequency === "monthly" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="sch-dom">Day of month (1 to 28)</Label>
                    <Input id="sch-dom" type="number" min={1} max={28} value={draft.dayOfMonth} onChange={(e) => setDraft({ ...draft, dayOfMonth: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Send at</Label>
                  <Select value={draft.hourIst} onValueChange={(v) => setDraft({ ...draft, hourIst: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, h) => (
                        <SelectItem key={h} value={String(h)}>
                          {hourLabel(h)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sch-range">Days of data</Label>
                  <Input id="sch-range" type="number" min={1} max={365} value={draft.rangeDays} onChange={(e) => setDraft({ ...draft, rangeDays: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Format</Label>
                  <Select value={draft.format} onValueChange={(v) => setDraft({ ...draft, format: v as "xlsx" | "csv" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel (one sheet per section)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Switch id="sch-on" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
                  <Label htmlFor="sch-on">Schedule is on</Label>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sch-recipients">Recipients</Label>
                <Textarea id="sch-recipients" rows={2} value={draft.recipients} onChange={(e) => setDraft({ ...draft, recipients: e.target.value })} placeholder="ceo@company.com, sales@company.com" />
                <p className="text-xs text-muted-foreground">Up to 10 addresses, separated by commas or new lines.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
