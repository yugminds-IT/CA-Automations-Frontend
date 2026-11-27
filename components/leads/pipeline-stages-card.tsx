"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Pipeline,
  PipelineStage,
  addPipelineStage,
  listPipelines,
  reorderPipelineStages,
  updatePipelineStage,
} from "@/lib/api/leads";
import { stageIsOn } from "@/lib/pipeline-stages";

type Outcome = "open" | "won" | "lost";

/** Rename, reorder, add and turn off the stages that the board and the stage dropdown both use. */
export function PipelineStagesCard({ unitId }: { unitId: number | null }) {
  const { toast } = useToast();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("open");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (unitId == null) {
      setPipeline(null);
      return;
    }
    setLoading(true);
    try {
      const list = await listPipelines(unitId);
      setPipeline(list.find((p) => p.isDefault) ?? list[0] ?? null);
    } catch (err: any) {
      toast({ title: "Could not load stages", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [unitId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const stages = pipeline?.stages ?? [];
  const hasWon = stages.some((s) => s.isWon);
  const hasLost = stages.some((s) => s.isLost);

  const fail = (err: any, title: string) =>
    toast({ title, description: err?.message, variant: "destructive" });

  const saveName = async (stage: PipelineStage) => {
    const name = editName.trim();
    if (!name || name === stage.name) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    try {
      await updatePipelineStage(stage.id, { name });
      setEditingId(null);
      await load();
    } catch (err: any) {
      fail(err, "Could not rename stage");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (stage: PipelineStage) => {
    setBusy(true);
    try {
      await updatePipelineStage(stage.id, { isActive: !stageIsOn(stage) });
      await load();
    } catch (err: any) {
      fail(err, "Could not update stage");
    } finally {
      setBusy(false);
    }
  };

  const move = async (stage: PipelineStage, direction: -1 | 1) => {
    if (!pipeline) return;
    const ids = stages.map((s) => s.id);
    const i = ids.indexOf(stage.id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setBusy(true);
    try {
      const next = await reorderPipelineStages(pipeline.id, ids);
      setPipeline(next);
    } catch (err: any) {
      fail(err, "Could not reorder");
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!pipeline || !newName.trim()) return;
    setBusy(true);
    try {
      await addPipelineStage(pipeline.id, newName.trim(), outcome);
      setNewName("");
      setOutcome("open");
      await load();
    } catch (err: any) {
      fail(err, "Could not add stage");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline stages</CardTitle>
        <CardDescription>
          New, Contacted, Qualified and the rest. These names are the columns on the leads board and the choices in the Stage dropdown.
          Rename one, change the order, add one, or turn one off. A turned-off stage stays on leads already in it. Won and Lost close the lead, so each pipeline keeps one of each.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unitId == null || loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !pipeline ? (
          <p className="text-sm text-muted-foreground">No pipeline for this brand yet. Open Leads once and it is created.</p>
        ) : (
          <>
            <ul className="divide-y">
              {stages.map((s, i) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    {editingId === s.id ? (
                      <form
                        className="flex max-w-xs gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void saveName(s);
                        }}
                      >
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus aria-label="Stage name" />
                        <Button type="submit" size="sm" disabled={busy}>Save</Button>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        {s.isWon && <Badge variant="secondary">Won</Badge>}
                        {s.isLost && <Badge variant="secondary">Lost</Badge>}
                        {!stageIsOn(s) && <Badge variant="destructive">Off</Badge>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label="Move up" disabled={busy || i === 0} onClick={() => void move(s, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Move down" disabled={busy || i === stages.length - 1} onClick={() => void move(s, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Rename ${s.name}`}
                      disabled={busy}
                      onClick={() => {
                        setEditingId(s.id);
                        setEditName(s.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={stageIsOn(s) ? `Turn off ${s.name}` : `Turn on ${s.name}`}
                      disabled={busy}
                      onClick={() => void toggle(s)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void add();
              }}
            >
              <div className="min-w-40 flex-1 space-y-1">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New stage name" aria-label="New stage name" />
              </div>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
                <SelectTrigger className="w-44" aria-label="Stage kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open stage</SelectItem>
                  <SelectItem value="won" disabled={hasWon}>Won (closes the lead)</SelectItem>
                  <SelectItem value="lost" disabled={hasLost}>Lost (closes the lead)</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={busy || !newName.trim()}>
                <Plus className="mr-1 h-4 w-4" /> Add stage
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
