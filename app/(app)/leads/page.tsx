"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Download, LayoutGrid, Table as TableIcon, Plus, Upload } from "lucide-react";
import { LeadCalendar } from "@/components/leads/lead-calendar";
import { CalendarItem, monthRange } from "@/lib/calendar";
import { ImportLeadsDialog } from "@/components/leads/import-leads-dialog";
import { toCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import {
  DuplicateMatch,
  Lead,
  Pipeline,
  createLead,
  findDuplicateLeads,
  listLeads,
  LeadOwner,
  listLeadOwners,
  listOpenTasks,
  listPipelines,
  moveLead,
} from "@/lib/api/leads";
import { CustomFieldInputs } from "@/components/leads/custom-field-inputs";
import { CustomField, listCustomFields } from "@/lib/api/custom-fields";
import { activeBrands, pickerLabel } from "@/lib/unit-structure";
import { boardStages, stageIsOn, stageOptions } from "@/lib/pipeline-stages";
import type { PipelineStage } from "@/lib/api/leads";
import { isBlank, isFieldShown } from "@/lib/custom-fields";

type View = "board" | "table" | "calendar";

/** The brand picker's value for "every brand at once". */
const ALL_BRANDS = "all";

/** One board column. With all brands shown, stages with the same name in different brands share a column. */
type BoardColumn = { key: string; name: string; on: boolean; stageIds: Set<number> };

const columnKey = (name: string) => name.trim().toLowerCase();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const statusVariant = (s: Lead["status"]) => (s === "won" ? "default" : s === "lost" ? "destructive" : "secondary");

export default function LeadsPage() {
  const { toast } = useToast();
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [allBrands, setAllBrands] = useState(false);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  // Every pipeline on screen: the selected brand's, or every brand's when all brands are shown.
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  // The brand a new lead goes into when all brands are shown.
  const [formUnitId, setFormUnitId] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("board");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Lead["status"]>("all");

  // create form
  const [showForm, setShowForm] = useState(false);
  // "New lead" on the dashboard links here with ?new=1 to open the form straight away.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setShowForm(true);
  }, []);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", value: "", source: "", owner: "none" });
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  // Drag and drop on the board: which lead is moving and which column it is over.
  const [dragLeadId, setDragLeadId] = useState<number | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  // Calendar: the month shown, its follow-ups and task due dates, and whether the list was cut short.
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date());
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarNote, setCalendarNote] = useState<string | undefined>(undefined);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customData, setCustomData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);
  const [saving, setSaving] = useState(false);

  const brands = useMemo(() => activeBrands(units), [units]);

  /** Loads one brand's pipeline, or every active brand's leads when no brand is given. */
  const loadLeads = useCallback(async (scope: { unit?: number; pipelineId?: number }) => {
    setLoading(true);
    try {
      const res = await listLeads({
        businessUnitId: scope.unit,
        pipelineId: scope.pipelineId,
        search: search.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 200,
      });
      // Leads of deactivated brands stay out of the all-brands view.
      const active = new Set(brands.map((b) => b.id));
      const items = scope.unit == null ? res.items.filter((l) => active.has(l.businessUnitId)) : res.items;
      setLeads(items);
      setTotal(res.total - (res.items.length - items.length));
    } catch (err: any) {
      toast({ title: "Could not load leads", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, toast, brands]);

  const reload = useCallback(() => {
    if (allBrands) return loadLeads({});
    if (unitId != null && pipeline) return loadLeads({ unit: unitId, pipelineId: pipeline.id });
  }, [allBrands, unitId, pipeline, loadLeads]);

  // units, then the selected unit's default pipeline
  useEffect(() => {
    (async () => {
      try {
        const list = await listBusinessUnits();
        setUnits(list);
        const active = activeBrands(list);
        const initial = active.find((u) => u.isDefault) ?? active[0];
        if (active.length > 1) setAllBrands(true);
        else if (initial) setUnitId(initial.id);
        else setLoading(false);
        if (initial) setFormUnitId(initial.id);
      } catch (err: any) {
        toast({ title: "Could not load business units", description: err?.message, variant: "destructive" });
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!allBrands && unitId == null) return;
    (async () => {
      try {
        if (allBrands) {
          const lists = await Promise.all(brands.map((b) => listPipelines(b.id)));
          setPipelines(lists.flat());
          setPipeline(null);
          await loadLeads({});
          return;
        }
        const list = await listPipelines(unitId as number);
        const p = list.find((x) => x.isDefault) ?? list[0] ?? null;
        setPipelines(list);
        setPipeline(p);
        if (p) await loadLeads({ unit: unitId as number, pipelineId: p.id });
        else setLoading(false);
      } catch (err: any) {
        toast({ title: "Could not load pipeline", description: err?.message, variant: "destructive" });
        setLoading(false);
      }
    })();
  }, [allBrands, unitId, brands, loadLeads, toast]);

  // The brand new leads and imports go into: the selected one, or the one picked in the form.
  const targetUnitId = allBrands ? formUnitId : unitId;
  const targetPipeline = allBrands
    ? pipelines.find((p) => p.businessUnitId === formUnitId && p.isDefault) ??
      pipelines.find((p) => p.businessUnitId === formUnitId) ??
      null
    : pipeline;

  // Custom fields belong to the unit, so reload them whenever the unit changes.
  useEffect(() => {
    if (targetUnitId == null) return;
    listCustomFields(targetUnitId)
      .then(setCustomFields)
      .catch(() => setCustomFields([]));
    setCustomData({});
  }, [targetUnitId]);

  const stages = useMemo(() => pipeline?.stages ?? [], [pipeline]);
  const stageById = useMemo(() => {
    const map = new Map<number, PipelineStage>();
    for (const p of pipelines) for (const st of p.stages) map.set(st.id, st);
    return map;
  }, [pipelines]);
  const pipelineById = useMemo(() => new Map(pipelines.map((p) => [p.id, p])), [pipelines]);
  /** The stages a lead can move to: those of its own pipeline. */
  const stagesFor = useCallback((lead: Lead) => pipelineById.get(lead.pipelineId)?.stages ?? stages, [pipelineById, stages]);

  const columns = useMemo<BoardColumn[]>(() => {
    if (!allBrands) {
      return boardStages(stages, leads).map((st) => ({ key: String(st.id), name: st.name, on: stageIsOn(st), stageIds: new Set([st.id]) }));
    }
    const used = new Set(leads.map((l) => l.stageId));
    const out = new Map<string, BoardColumn>();
    for (const p of [...pipelines].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))) {
      for (const st of [...p.stages].sort((a, b) => a.position - b.position)) {
        if (!stageIsOn(st) && !used.has(st.id)) continue;
        const key = columnKey(st.name);
        const col = out.get(key) ?? { key, name: st.name, on: false, stageIds: new Set<number>() };
        col.stageIds.add(st.id);
        col.on = col.on || stageIsOn(st);
        out.set(key, col);
      }
    }
    return [...out.values()];
  }, [allBrands, stages, pipelines, leads]);
  const byColumn = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const c of columns) map.set(c.key, []);
    for (const l of leads) {
      const col = columns.find((c) => c.stageIds.has(l.stageId));
      if (col) map.get(col.key)!.push(l);
    }
    return map;
  }, [leads, columns]);

  /** Moves a lead into a column: the stage of that name in the lead's own pipeline. */
  const moveToColumn = (lead: Lead, col: BoardColumn) => {
    const target = stagesFor(lead).find((st) => col.stageIds.has(st.id) && stageIsOn(st));
    if (!target) {
      toast({ title: `${brandName(lead.businessUnitId)} has no "${col.name}" stage`, variant: "destructive" });
      return;
    }
    handleMove(lead, target.id);
  };

  const handleMove = async (lead: Lead, stageId: number) => {
    if (lead.stageId === stageId) return;
    try {
      await moveLead(lead.id, stageId);
      await reload();
    } catch (err: any) {
      toast({ title: "Could not move lead", description: err?.message, variant: "destructive" });
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email";
    if (!form.email.trim() && !form.phone.trim()) next.email = "Enter an email or a phone number";
    if (form.value.trim() && (Number.isNaN(Number(form.value)) || Number(form.value) < 0)) next.value = "Value must be 0 or more";
    const missing = customFields.filter(
      (f) => f.isActive && f.canSee && f.required && isFieldShown(f, customData) && isBlank(customData[f.key]),
    );
    if (missing.length > 0) next.custom = `Fill in: ${missing.map((f) => f.label).join(", ")}`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (allowDuplicate: boolean) => {
    if (targetUnitId == null || !targetPipeline) return;
    setSaving(true);
    try {
      await createLead({
        businessUnitId: targetUnitId,
        pipelineId: targetPipeline.id,
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        source: form.source.trim() || undefined,
        value: form.value.trim() ? Number(form.value) : undefined,
        customData: Object.fromEntries(Object.entries(customData).filter(([, v]) => !isBlank(v))),
        ownerUserId: form.owner === "none" ? undefined : Number(form.owner),
        allowDuplicate,
      });
      toast({ title: "Lead added" });
      setForm({ name: "", email: "", phone: "", company: "", value: "", source: "", owner: "none" });
      setCustomData({});
      setDuplicates(null);
      setShowForm(false);
      await reload();
    } catch (err: any) {
      toast({ title: "Could not add lead", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Check for duplicates first so the user can open the existing lead instead.
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || targetUnitId == null) return;
    setSaving(true);
    try {
      const matches = await findDuplicateLeads(targetUnitId, form.email.trim() || undefined, form.phone.trim() || undefined);
      setSaving(false);
      if (matches.length > 0) {
        setDuplicates(matches);
        return;
      }
    } catch {
      // If the check fails, the server still blocks duplicates on create.
      setSaving(false);
    }
    await submit(false);
  };

  const brandName = (id: number | null) => { const u = units.find((x) => x.id === id); return u ? pickerLabel(u, units) : ""; };
  const unitName = allBrands ? "All brands" : brandName(unitId);
  const targetName = brandName(targetUnitId);
  const ownerName = (id: number | null) => (id == null ? "" : owners.find((o) => o.id === id)?.name ?? "");

  useEffect(() => {
    listLeadOwners().then(setOwners).catch(() => setOwners([]));
  }, []);

  // Follow-ups and task due dates for the month on screen.
  useEffect(() => {
    if (view !== "calendar" || (!allBrands && unitId == null)) return;
    const scopeId = allBrands ? undefined : (unitId as number);
    let active = true;
    const { from, to } = monthRange(calendarAnchor);
    setCalendarLoading(true);
    Promise.all([
      listLeads({ businessUnitId: scopeId, status: "open", followUpFrom: from, followUpTo: to, limit: 200 }),
      listOpenTasks({ businessUnitId: scopeId, dueFrom: from, dueTo: to }),
    ])
      .then(([leadRes, tasks]) => {
        if (!active) return;
        const items: CalendarItem[] = [
          ...leadRes.items
            .filter((l) => l.nextFollowUpAt)
            .map((l) => ({
              key: `f${l.id}`,
              date: new Date(l.nextFollowUpAt as string),
              title: l.name,
              href: `/leads/${l.id}`,
              kind: "follow_up" as const,
            })),
          ...tasks
            .filter((t) => t.dueAt)
            .map((t) => ({
              key: `t${t.id}`,
              date: new Date(t.dueAt as string),
              title: t.title,
              href: `/leads/${t.leadId}`,
              kind: "task" as const,
            })),
        ];
        setCalendarItems(items);
        setCalendarNote(
          leadRes.total > leadRes.items.length
            ? `Showing ${leadRes.items.length} of ${leadRes.total} follow-ups this month.`
            : undefined,
        );
      })
      .catch((err: any) => {
        if (active) toast({ title: "Could not load the calendar", description: err?.message, variant: "destructive" });
      })
      .finally(() => {
        if (active) setCalendarLoading(false);
      });
    return () => {
      active = false;
    };
  }, [view, calendarAnchor, unitId, allBrands, toast]);

  /** Exports the leads currently loaded (the list is capped at 200 per load). */
  const exportCsv = () => {
    const stageName = (id: number) => stageById.get(id)?.name ?? "";
    const header = [...(allBrands ? ["Brand"] : []), "Name", "Email", "Phone", "Company", "Source", "Stage", "Status", "Value", "Owner", "Created"];
    const body = leads.map((l) => [
      ...(allBrands ? [brandName(l.businessUnitId)] : []),
      l.name,
      l.email ?? "",
      l.phone ?? "",
      l.company ?? "",
      l.source ?? "",
      stageName(l.stageId),
      l.status,
      l.value != null ? String(l.value) : "",
      ownerName(l.ownerUserId),
      new Date(l.createdAt).toISOString().slice(0, 10),
    ]);
    const blob = new Blob([toCsv([header, ...body])], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${unitName || "leads"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${leads.length} lead${leads.length === 1 ? "" : "s"}` });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {unitName} · {total} lead{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {brands.length > 1 && (
            <Select
              value={allBrands ? ALL_BRANDS : unitId ? String(unitId) : undefined}
              onValueChange={(v) => {
                if (v === ALL_BRANDS) {
                  setAllBrands(true);
                } else {
                  setAllBrands(false);
                  setUnitId(Number(v));
                  setFormUnitId(Number(v));
                }
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANDS}>All brands</SelectItem>
                {brands.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {pickerLabel(u, units)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant={view === "board" ? "default" : "outline"} size="sm" onClick={() => setView("board")}>
            <LayoutGrid className="mr-1 h-4 w-4" /> Board
          </Button>
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>
            <TableIcon className="mr-1 h-4 w-4" /> Table
          </Button>
          <Button variant={view === "calendar" ? "default" : "outline"} size="sm" onClick={() => setView("calendar")}>
            <CalendarDays className="mr-1 h-4 w-4" /> Calendar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={leads.length === 0}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            disabled={allBrands || unitId == null}
            title={allBrands ? "Pick a brand to import leads into" : undefined}
          >
            <Upload className="mr-1 h-4 w-4" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" /> New lead
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-72"
          placeholder="Search name, email, company, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") reload();
          }}
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => reload()}>
          Apply
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{allBrands ? "New lead" : `New lead in ${targetName}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
              {allBrands && (
                <div className="space-y-1.5">
                  <Label htmlFor="l-brand">Brand</Label>
                  <Select value={formUnitId ? String(formUnitId) : undefined} onValueChange={(v) => { setFormUnitId(Number(v)); setDuplicates(null); }}>
                    <SelectTrigger id="l-brand">
                      <SelectValue placeholder="Pick a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {pickerLabel(u, units)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="l-name">Name</Label>
                <Input id="l-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-email">Email</Label>
                <Input id="l-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-phone">Phone</Label>
                <Input id="l-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-company">Company</Label>
                <Input id="l-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-source">Source</Label>
                <Input id="l-source" placeholder="Website, referral…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-value">Value (₹)</Label>
                <Input id="l-value" inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                {errors.value && <p className="text-xs text-destructive">{errors.value}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-owner">Owner</Label>
                <Select value={form.owner} onValueChange={(v) => setForm({ ...form, owner: v })}>
                  <SelectTrigger id="l-owner">
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

              {customFields.some((f) => f.isActive && f.canSee) && (
                <div className="space-y-1 md:col-span-3">
                  <CustomFieldInputs
                    fields={customFields}
                    values={customData}
                    onChange={(key, value) => setCustomData((d) => ({ ...d, [key]: value }))}
                    disabled={saving}
                  />
                  {errors.custom && <p className="text-xs text-destructive">{errors.custom}</p>}
                </div>
              )}

              {duplicates && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm md:col-span-3">
                  <p className="mb-2 font-medium">A lead with this email or phone already exists in {targetName || "this brand"}:</p>
                  <ul className="mb-3 space-y-1">
                    {duplicates.map((d) => (
                      <li key={d.id}>
                        <Link className="underline" href={`/leads/${d.id}`}>
                          {d.name}
                        </Link>{" "}
                        <span className="text-muted-foreground">
                          {d.email ?? ""} {d.phone ?? ""} · {d.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setDuplicates(null)}>
                      Edit details
                    </Button>
                    <Button type="button" size="sm" disabled={saving} onClick={() => submit(true)}>
                      Create anyway
                    </Button>
                  </div>
                </div>
              )}

              {!duplicates && (
                <div className="flex gap-2 md:col-span-3">
                  <Button type="submit" disabled={saving || !targetPipeline}>
                    Add lead
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : allBrands ? pipelines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pipelines yet.</p>
      ) : null : !pipeline ? (
        <p className="text-sm text-muted-foreground">No pipeline for this brand yet.</p>
      ) : null}
      {!loading && (allBrands ? pipelines.length > 0 : !!pipeline) && (view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((stage) => {
            const items = byColumn.get(stage.key) ?? [];
            const on = stage.on;
            return (
              <div
                key={stage.key}
                className={`w-64 shrink-0 rounded-lg border bg-muted/30 transition-shadow ${overStageId === stage.key ? "ring-2 ring-primary" : ""}`}
                onDragOver={(e) => {
                  if (dragLeadId == null || !on) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overStageId !== stage.key) setOverStageId(stage.key);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverStageId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const lead = leads.find((l) => l.id === dragLeadId);
                  setOverStageId(null);
                  setDragLeadId(null);
                  if (lead && on) moveToColumn(lead, stage);
                }}
              >
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <span className="text-sm font-medium">{stage.name}{!on && " (off)"}</span>
                  <Badge variant="outline">{items.length}</Badge>
                </div>
                <div className="space-y-2 p-2">
                  {items.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", String(lead.id));
                        e.dataTransfer.effectAllowed = "move";
                        setDragLeadId(lead.id);
                      }}
                      onDragEnd={() => {
                        setDragLeadId(null);
                        setOverStageId(null);
                      }}
                      className={`cursor-grab rounded-md border bg-background p-3 shadow-sm active:cursor-grabbing ${dragLeadId === lead.id ? "opacity-50" : ""}`}
                    >
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline" draggable={false}>
                        {lead.name}
                      </Link>
                      <div className="truncate text-xs text-muted-foreground">
                        {lead.company ?? lead.email ?? lead.phone ?? ""}
                      </div>
                      {allBrands && (
                        <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                          {brandName(lead.businessUnitId)}
                        </Badge>
                      )}
                      {lead.value != null && (
                        <div className="mt-1 text-xs">₹{lead.value.toLocaleString("en-IN")}</div>
                      )}
                      {lead.ownerUserId != null && (
                        <div className="mt-1 text-xs text-muted-foreground">Owner: {ownerName(lead.ownerUserId)}</div>
                      )}
                      <Select value={String(lead.stageId)} onValueChange={(v) => handleMove(lead, Number(v))}>
                        <SelectTrigger className="mt-2 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stageOptions(stagesFor(lead), lead.stageId).map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : view === "calendar" ? (
        <LeadCalendar
          anchor={calendarAnchor}
          onAnchorChange={setCalendarAnchor}
          items={calendarItems}
          loading={calendarLoading}
          note={calendarNote}
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                {allBrands && <th className="px-3 py-2">Brand</th>}
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t">
                  {allBrands && <td className="px-3 py-2 text-xs">{brandName(lead.businessUnitId)}</td>}
                  <td className="px-3 py-2">
                    <Link href={`/leads/${lead.id}`} className="hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{lead.email ?? "—"}</td>
                  <td className="px-3 py-2">{lead.phone ?? "—"}</td>
                  <td className="px-3 py-2">{lead.company ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Select value={String(lead.stageId)} onValueChange={(v) => handleMove(lead, Number(v))}>
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stageOptions(stagesFor(lead), lead.stageId).map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={statusVariant(lead.status)}>{lead.status}</Badge>
                  </td>
                  <td className="px-3 py-2">{lead.value != null ? `₹${lead.value.toLocaleString("en-IN")}` : "—"}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={allBrands ? 8 : 7} className="px-3 py-6 text-center text-muted-foreground">
                    No leads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        businessUnitId={unitId}
        businessUnitName={unitName}
        onImported={() => {
          reload();
        }}
      />
    </div>
  );
}
