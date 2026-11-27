"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, LayoutGrid, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import { LeadOwner, listLeadOwners } from "@/lib/api/leads";
import {
  Dashboard,
  ReportFilters,
  WidgetResult,
  WidgetSpec,
  createDashboard,
  deleteDashboard,
  downloadReport,
  filtersQuery,
  getDashboard,
  listDashboards,
  previewWidget,
  updateDashboard,
} from "@/lib/api/reports";
import { WidgetCard } from "@/components/reports/widget-card";
import { pickerLabel, activeBrands } from "@/lib/unit-structure";
import { WidgetEditorDialog, makeId } from "@/components/reports/widget-editor-dialog";

const ALL = "__all__";
const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

export function DashboardsView() {
  const { toast } = useToast();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDashboards(await listDashboards());
    } catch (err) {
      toast({ title: "Could not load dashboards", description: errorText(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) {
      toast({ title: "Give the dashboard a name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await createDashboard({ name: name.trim(), widgets: [], filters: {} });
      setCreating(false);
      setName("");
      setOpenId(created.id);
    } catch (err) {
      toast({ title: "Could not create the dashboard", description: errorText(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: Dashboard) => {
    if (!confirm(`Delete the dashboard "${d.name}" and its scheduled emails?`)) return;
    try {
      await deleteDashboard(d.id);
      toast({ title: "Dashboard deleted" });
      await load();
    } catch (err) {
      toast({ title: "Could not delete", description: errorText(err), variant: "destructive" });
    }
  };

  if (openId !== null) {
    return <DashboardDetail id={openId} onBack={() => { setOpenId(null); load(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Dashboards combine widgets. Every number is worked out for the person viewing it.</p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1 size-4" /> New dashboard
        </Button>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      )}
      {!loading && dashboards.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No dashboards yet. Create one and add widgets for the numbers you watch every day.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboards.map((d) => (
          <Card key={d.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutGrid className="size-4 text-muted-foreground" /> {d.name}
              </CardTitle>
              <CardDescription>
                {d.widgets.length} widget{d.widgets.length === 1 ? "" : "s"} · updated {new Date(d.updatedAt).toLocaleDateString("en-IN")}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto flex gap-2">
              <Button size="sm" onClick={() => setOpenId(d.id)}>
                Open
              </Button>
              <Button size="sm" variant="ghost" aria-label={`Delete ${d.name}`} onClick={() => remove(d)}>
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New dashboard</DialogTitle>
            <DialogDescription>You add the widgets next.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="dash-name">Name</Label>
            <Input id="dash-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly sales review" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const keyFor = (w: WidgetSpec, f: ReportFilters) => `${JSON.stringify(w)}|${filtersQuery(f)}`;

function DashboardDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { toast } = useToast();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [viewFilters, setViewFilters] = useState<ReportFilters>({});
  const [sourceDraft, setSourceDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WidgetSpec[]>([]);
  const [editor, setEditor] = useState<{ index: number | null } | null>(null);
  const [cache, setCache] = useState<Record<string, { result?: WidgetResult; error?: string }>>({});
  const inFlight = useRef(new Set<string>());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDashboard(id)
      .then((d) => {
        setDash(d);
        setViewFilters(d.filters ?? {});
      })
      .catch((err: unknown) => toast({ title: "Could not open the dashboard", description: errorText(err), variant: "destructive" }));
    Promise.all([listBusinessUnits(), listLeadOwners()])
      .then(([u, o]) => {
        setUnits(activeBrands(u));
        setOwners(o);
      })
      .catch(() => undefined);
  }, [id, toast]);

  const shown = useMemo(() => (editing ? draft : (dash?.widgets ?? [])), [editing, draft, dash]);

  // Every widget is computed through the preview endpoint with the current filters, cached per spec and filter set.
  useEffect(() => {
    shown.forEach((w) => {
      const key = keyFor(w, viewFilters);
      if (cache[key] || inFlight.current.has(key)) return;
      inFlight.current.add(key);
      previewWidget(w, viewFilters)
        .then((result) => setCache((c) => ({ ...c, [key]: { result } })))
        .catch((err: unknown) => setCache((c) => ({ ...c, [key]: { error: errorText(err) } })))
        .finally(() => inFlight.current.delete(key));
    });
  }, [shown, viewFilters, cache]);

  const startEdit = () => {
    setDraft(dash?.widgets ?? []);
    setEditing(true);
  };

  const saveLayout = async () => {
    if (!dash) return;
    setSaving(true);
    try {
      const updated = await updateDashboard(dash.id, { name: dash.name, widgets: draft, filters: dash.filters });
      setDash(updated);
      setEditing(false);
      toast({ title: "Dashboard saved" });
    } catch (err) {
      toast({ title: "Could not save the dashboard", description: errorText(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveWidget = (widget: WidgetSpec) => {
    if (!editor) return;
    if (editor.index === null) setDraft((d) => [...d, { ...widget, id: widget.id || makeId() }]);
    else setDraft((d) => d.map((w, i) => (i === editor.index ? widget : w)));
    setEditor(null);
  };

  const move = (index: number, dir: -1 | 1) =>
    setDraft((d) => {
      const target = index + dir;
      if (target < 0 || target >= d.length) return d;
      const next = [...d];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const exportAs = async (format: "xlsx" | "csv") => {
    try {
      const qs = filtersQuery(viewFilters);
      await downloadReport(`/dashboards/${id}/export`, `${qs}${qs ? "&" : "?"}format=${format}`, `${dash?.name ?? "dashboard"}.${format}`);
    } catch (err) {
      toast({ title: "Could not export", description: errorText(err), variant: "destructive" });
    }
  };

  if (!dash) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 size-4" /> All dashboards
          </Button>
          <h2 className="text-lg font-semibold">{dash.name}</h2>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditor({ index: null })}>
                <Plus className="mr-1 size-4" /> Add widget
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveLayout} disabled={saving}>
                {saving ? "Saving…" : "Save layout"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => exportAs("xlsx")}>
                <Download className="mr-1 size-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportAs("csv")}>
                <Download className="mr-1 size-4" /> CSV
              </Button>
              <Button size="sm" onClick={startEdit}>
                <Pencil className="mr-1 size-4" /> Edit layout
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Business unit</Label>
          <Select value={viewFilters.businessUnitId ? String(viewFilters.businessUnitId) : ALL} onValueChange={(v) => setViewFilters({ ...viewFilters, businessUnitId: v === ALL ? null : Number(v) })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All units</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {pickerLabel(u, units)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Owner</Label>
          <Select value={viewFilters.ownerUserId ? String(viewFilters.ownerUserId) : ALL} onValueChange={(v) => setViewFilters({ ...viewFilters, ownerUserId: v === ALL ? null : Number(v) })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Everyone</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dash-source">Source</Label>
          <Input
            id="dash-source"
            className="w-40"
            placeholder="Any source"
            value={sourceDraft}
            onChange={(e) => setSourceDraft(e.target.value)}
            onBlur={() => setViewFilters((f) => ({ ...f, source: sourceDraft.trim() || null }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dash-from">From</Label>
          <Input id="dash-from" type="date" value={viewFilters.from ?? ""} onChange={(e) => setViewFilters({ ...viewFilters, from: e.target.value || null })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dash-to">To</Label>
          <Input id="dash-to" type="date" value={viewFilters.to ?? ""} onChange={(e) => setViewFilters({ ...viewFilters, to: e.target.value || null })} />
        </div>
      </div>

      {shown.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No widgets yet.{" "}
            {editing ? "Use Add widget to put the first one here." : "Choose Edit layout to add some."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((w, i) => {
            const entry = cache[keyFor(w, viewFilters)];
            return (
              <WidgetCard
                key={`${w.id}-${i}`}
                result={entry?.result ?? null}
                error={entry?.error ?? null}
                loading={!entry}
                editing={editing}
                onEdit={() => setEditor({ index: i })}
                onRemove={() => setDraft((d) => d.filter((_, j) => j !== i))}
                onMove={(dir) => move(i, dir)}
              />
            );
          })}
        </div>
      )}

      <WidgetEditorDialog
        open={editor !== null}
        initial={editor && editor.index !== null ? draft[editor.index] : null}
        onClose={() => setEditor(null)}
        onSave={saveWidget}
      />
    </div>
  );
}
