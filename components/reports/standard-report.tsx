"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import { LeadOwner, listLeadOwners } from "@/lib/api/leads";
import {
  GroupedRow,
  ReportFilters,
  StandardReport,
  downloadReport,
  filtersQuery,
  getStandardReport,
} from "@/lib/api/reports";
import { pickerLabel, activeBrands } from "@/lib/unit-structure";
import { formatMinutes, formatPercent, formatRupees } from "@/lib/reports";

const ALL = "__all__";
const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

/** Won as a share of the leads in a row. */
const winShare = (won: number | undefined, leads: number | undefined) =>
  leads && leads > 0 ? Math.round(((won ?? 0) / leads) * 1000) / 10 : null;

export function StandardReportView() {
  const { toast } = useToast();
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [sourceDraft, setSourceDraft] = useState("");
  const [report, setReport] = useState<StandardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([listBusinessUnits(), listLeadOwners()])
      .then(([u, o]) => {
        setUnits(activeBrands(u));
        setOwners(o);
      })
      .catch((err: unknown) => toast({ title: "Could not load filters", description: errorText(err), variant: "destructive" }));
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getStandardReport(filters));
    } catch (err) {
      toast({ title: "Could not load reports", description: errorText(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const exportAs = async (format: "xlsx" | "csv") => {
    setExporting(true);
    try {
      const qs = filtersQuery(filters);
      await downloadReport("/standard/export", `${qs}${qs ? "&" : "?"}format=${format}`, `standard-reports.${format}`);
    } catch (err) {
      toast({ title: "Could not export", description: errorText(err), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Business unit</Label>
          <Select value={filters.businessUnitId ? String(filters.businessUnitId) : ALL} onValueChange={(v) => setFilters({ ...filters, businessUnitId: v === ALL ? null : Number(v) })}>
            <SelectTrigger className="w-48">
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
          <Select value={filters.ownerUserId ? String(filters.ownerUserId) : ALL} onValueChange={(v) => setFilters({ ...filters, ownerUserId: v === ALL ? null : Number(v) })}>
            <SelectTrigger className="w-48">
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
          <Label htmlFor="rep-source">Source</Label>
          <Input
            id="rep-source"
            className="w-40"
            placeholder="Any source"
            value={sourceDraft}
            onChange={(e) => setSourceDraft(e.target.value)}
            onBlur={() => setFilters((f) => ({ ...f, source: sourceDraft.trim() || null }))}
            onKeyDown={(e) => e.key === "Enter" && setFilters((f) => ({ ...f, source: sourceDraft.trim() || null }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rep-from">From</Label>
          <Input id="rep-from" type="date" value={filters.from ?? report?.range.from ?? ""} onChange={(e) => setFilters({ ...filters, from: e.target.value || null })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rep-to">To</Label>
          <Input id="rep-to" type="date" value={filters.to ?? report?.range.to ?? ""} onChange={(e) => setFilters({ ...filters, to: e.target.value || null })} />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={exporting || !report} onClick={() => exportAs("xlsx")}>
            <Download className="mr-1 size-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" disabled={exporting || !report} onClick={() => exportAs("csv")}>
            <Download className="mr-1 size-4" /> CSV
          </Button>
        </div>
      </div>

      {loading && !report && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      )}

      {report && (
        <>
          <p className="text-xs text-muted-foreground">
            Leads created {report.range.from} to {report.range.to} (IST). Blank dates default to the last 90 days.
          </p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Tile label="Leads" value={report.totals.leads.toLocaleString("en-IN")} />
            <Tile label="Won" value={report.totals.won.toLocaleString("en-IN")} />
            <Tile label="Lost" value={report.totals.lost.toLocaleString("en-IN")} />
            <Tile label="Win rate" value={formatPercent(report.totals.winRate)} hint="Won ÷ closed leads" />
            <Tile label="Open pipeline" value={formatRupees(report.totals.pipelineValue)} />
            <Tile label="Won value" value={formatRupees(report.totals.wonValue)} />
            <Tile label="Median first reply" value={formatMinutes(report.responseTime.medianMinutes)} hint={`${report.responseTime.responded} answered`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Leads and wins by source</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartOrEmpty rows={report.bySource}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={toSeries(report.bySource)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 11 }} width={36} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Leads" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartOrEmpty>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Where leads sit now</CardTitle>
                <CardDescription>Current stage of the leads created in this period. Stage history is not tracked, so this is not a true funnel.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartOrEmpty rows={report.byStage}>
                  <ResponsiveContainer width="100%" height={Math.max(200, report.byStage.length * 36 + 40)}>
                    <BarChart data={toSeries(report.byStage, true)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="Leads" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartOrEmpty>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TableCard title="Owners" description="Win rate here is won ÷ leads, because the open and lost split is not broken out per owner." rows={report.owners} headers={["Owner", "Leads", "Won", "Won ÷ leads", "Won value"]} cells={(r) => [r.label, num(r, "lead_count"), num(r, "won_count"), formatPercent(winShare(r.values.won_count, r.values.lead_count)), formatRupees(num(r, "won_value"))]} />
            <TableCard title="Business units" rows={report.byUnit} headers={["Unit", "Leads", "Won", "Won value"]} cells={(r) => [r.label, num(r, "lead_count"), num(r, "won_count"), formatRupees(num(r, "won_value"))]} />
            <TableCard title="Lost reasons" rows={report.lostReasons} headers={["Reason", "Lost leads", "Share"]} cells={(r) => [r.label, num(r, "lead_count"), formatPercent(report.totals.lost ? Math.round((num(r, "lead_count") / report.totals.lost) * 1000) / 10 : null)]} />
            <TableCard title="Forms" description="Leads that came from a web form." rows={report.forms} headers={["Form", "Leads", "Won", "Won ÷ leads"]} cells={(r) => [r.label, num(r, "lead_count"), num(r, "won_count"), formatPercent(winShare(r.values.won_count, r.values.lead_count))]} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>First response</CardTitle>
                <CardDescription>Time from a lead&apos;s creation to a staff reply.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <Stat label="Median" value={formatMinutes(report.responseTime.medianMinutes)} />
                <Stat label="Average" value={formatMinutes(report.responseTime.avgMinutes)} />
                <Stat label="Within SLA" value={formatPercent(report.responseTime.slaMetPercent)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Email from leads</CardTitle>
                <CardDescription>Emails sent from the CRM to leads you can see, in this period.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <Stat label="Sent" value={report.email.sent.toLocaleString("en-IN")} />
                <Stat label="Open rate" value={formatPercent(report.email.openRate)} />
                <Stat label="Click rate" value={formatPercent(report.email.clickRate)} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

const num = (r: GroupedRow, key: "lead_count" | "won_count" | "won_value") => r.values[key] ?? 0;

/** Chart rows with readable series names. Pass leadsOnly for charts that only show leads. */
function toSeries(rows: GroupedRow[], leadsOnly = false) {
  return rows.map((r) =>
    leadsOnly
      ? { name: r.label, Leads: r.values.lead_count ?? 0 }
      : { name: r.label, Leads: r.values.lead_count ?? 0, Won: r.values.won_count ?? 0 },
  );
}

function ChartOrEmpty({ rows, children }: { rows: GroupedRow[]; children: React.ReactNode }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No leads in this period.</p>;
  return <>{children}</>;
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function TableCard({
  title,
  description,
  rows,
  headers,
  cells,
}: {
  title: string;
  description?: string;
  rows: GroupedRow[];
  headers: string[];
  cells: (r: GroupedRow) => Array<string | number>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to show in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  {headers.map((h, i) => (
                    <th key={h} className={`py-1 font-medium ${i > 0 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.key ?? "k"}-${i}`} className="border-b last:border-0">
                    {cells(r).map((c, j) => (
                      <td key={j} className={`py-1.5 ${j > 0 ? "text-right tabular-nums" : ""}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
