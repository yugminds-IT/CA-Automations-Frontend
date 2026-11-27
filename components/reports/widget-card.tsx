"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WidgetResult } from "@/lib/api/reports";
import { formatMetric, isMoneyMetric, METRIC_LABELS, GROUP_LABELS, WIDGET_TYPE_LABELS } from "@/lib/reports";

const COLOR = "#4f46e5";
const PALETTE = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"];

interface Props {
  result: WidgetResult | null;
  loading?: boolean;
  error?: string | null;
  /** Shows edit controls. Only the dashboard builder passes these. */
  editing?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onMove?: (direction: -1 | 1) => void;
}

export function WidgetCard({ result, loading, error, editing, onEdit, onRemove, onMove }: Props) {
  const widget = result?.widget;
  return (
    <Card className="flex min-h-[200px] flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{widget?.title ?? "Widget"}</CardTitle>
          {widget && (
            <p className="text-xs text-muted-foreground">
              {METRIC_LABELS[widget.metric]} · {WIDGET_TYPE_LABELS[widget.type]}
              {widget.groupBy !== "none" ? ` · by ${GROUP_LABELS[widget.groupBy].toLowerCase()}` : ""}
            </p>
          )}
        </div>
        {editing && (
          <div className="flex shrink-0 gap-1">
            {onMove && (
              <>
                <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => onMove(-1)}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => onMove(1)}>
                  <ArrowDown className="size-4" />
                </Button>
              </>
            )}
            {onEdit && (
              <Button size="icon" variant="ghost" aria-label="Edit widget" onClick={onEdit}>
                <Pencil className="size-4" />
              </Button>
            )}
            {onRemove && (
              <Button size="icon" variant="ghost" aria-label="Remove widget" onClick={onRemove}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : loading || !result ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Body result={result} />
        )}
      </CardContent>
    </Card>
  );
}

function Body({ result }: { result: WidgetResult }) {
  const { widget, rows, total } = result;
  const money = isMoneyMetric(widget.metric);
  if (widget.type === "kpi") {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-semibold tabular-nums">{formatMetric(widget.metric, total)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{METRIC_LABELS[widget.metric]}</div>
        </div>
      </div>
    );
  }
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No data in this period.</p>;

  if (widget.type === "table") {
    return (
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1 font-medium">{GROUP_LABELS[widget.groupBy]}</th>
              <th className="py-1 text-right font-medium">{METRIC_LABELS[widget.metric]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.key ?? "none"}-${i}`} className="border-b last:border-0">
                <td className="py-1.5">{r.label}</td>
                <td className="py-1.5 text-right tabular-nums">{formatMetric(widget.metric, r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const data = rows.map((r) => ({ name: r.label, value: r.value }));
  const tooltipFormat = (v: number) => formatMetric(widget.metric, v);

  if (widget.type === "line") {
    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} minTickGap={16} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (money ? compact(v) : String(v))} width={56} />
            <Tooltip formatter={(v) => tooltipFormat(Number(v))} />
            <Line type="monotone" dataKey="value" stroke={COLOR} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // bar and funnel: one horizontal bar per row, in the server's order (stages keep their pipeline order)
  const height = Math.max(160, data.length * 32 + 24);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (money ? compact(v) : String(v))} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => tooltipFormat(Number(v))} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={widget.type === "funnel" ? PALETTE[i % PALETTE.length] : COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 12,50,000 becomes 12.5L and 1,20,00,000 becomes 1.2Cr, for chart axes only. */
function compact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return String(Math.round(v));
}
