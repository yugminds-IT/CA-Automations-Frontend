"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GroupBy, Metric, WidgetSpec, WidgetType } from "@/lib/api/reports";
import { GROUP_LABELS, METRIC_LABELS, WIDGET_TYPE_LABELS, groupsFor, newWidget, widgetProblem } from "@/lib/reports";

interface Props {
  open: boolean;
  /** The widget being edited, or null to add a new one. */
  initial: WidgetSpec | null;
  onClose: () => void;
  onSave: (widget: WidgetSpec) => void;
}

const TYPES = Object.keys(WIDGET_TYPE_LABELS) as WidgetType[];
const METRICS = Object.keys(METRIC_LABELS) as Metric[];

export function WidgetEditorDialog({ open, initial, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<WidgetSpec>(() => initial ?? newWidget("bar", makeId()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initial ?? newWidget("bar", makeId()));
      setError(null);
    }
  }, [open, initial]);

  const setType = (type: WidgetType) =>
    setDraft((d) => ({ ...d, type, groupBy: groupsFor(type).includes(d.groupBy) ? d.groupBy : groupsFor(type)[0] }));

  const save = () => {
    const problem = widgetProblem(draft);
    if (problem) {
      setError(problem);
      return;
    }
    onSave({ ...draft, title: draft.title.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit widget" : "Add widget"}</DialogTitle>
          <DialogDescription>Every widget shows only the records you are allowed to see.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="widget-title">Title</Label>
            <Input id="widget-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Chart</Label>
              <Select value={draft.type} onValueChange={(v) => setType(v as WidgetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {WIDGET_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Measure</Label>
              <Select value={draft.metric} onValueChange={(v) => setDraft({ ...draft, metric: v as Metric })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRICS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {METRIC_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Group by</Label>
            <Select value={draft.groupBy} onValueChange={(v) => setDraft({ ...draft, groupBy: v as GroupBy })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupsFor(draft.type).map((g) => (
                  <SelectItem key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{initial ? "Save widget" : "Add widget"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function makeId(): string {
  return `w-${Math.random().toString(36).slice(2, 10)}`;
}
