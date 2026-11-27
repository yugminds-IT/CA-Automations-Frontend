"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import { AutomationCatalog, getAutomationCatalog } from "@/lib/api/automation";
import { AssignmentCard } from "@/components/automation/assignment-card";
import { WorkflowsCard } from "@/components/automation/workflows-card";
import { SequencesCard } from "@/components/automation/sequences-card";
import { pickerLabel, activeBrands } from "@/lib/unit-structure";
import { ScoringSlaCard } from "@/components/automation/scoring-sla-card";

export default function AutomationSettingsPage() {
  const { toast } = useToast();
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<AutomationCatalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listBusinessUnits(), getAutomationCatalog()])
      .then(([all, cat]) => {
        const list = activeBrands(all);
        setUnits(list);
        setCatalog(cat);
        const def = list.find((u) => u.isDefault) ?? list[0];
        if (def) setUnitId(def.id);
      })
      .catch((err: unknown) => {
        toast({
          title: "Could not load automation settings",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Automation</h1>
          <p className="text-sm text-muted-foreground">
            Route new leads, run follow-ups, set response times, and score leads. Each business unit has its own rules.
          </p>
        </div>
        {units.length > 1 && unitId != null && (
          <div className="w-64 space-y-1.5">
            <Label>Business unit</Label>
            <Select value={String(unitId)} onValueChange={(v) => setUnitId(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {pickerLabel(u, units)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {unitId == null ? (
        <p className="text-sm text-muted-foreground">Create a business unit first.</p>
      ) : (
        <Tabs defaultValue="assignment" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assignment">Assignment</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="sequences">Sequences</TabsTrigger>
            <TabsTrigger value="scoring">Scoring and SLA</TabsTrigger>
          </TabsList>
          <TabsContent value="assignment">
            <AssignmentCard businessUnitId={unitId} catalog={catalog} />
          </TabsContent>
          <TabsContent value="workflows">
            <WorkflowsCard businessUnitId={unitId} units={units} catalog={catalog} />
          </TabsContent>
          <TabsContent value="sequences">
            <SequencesCard businessUnitId={unitId} />
          </TabsContent>
          <TabsContent value="scoring">
            <ScoringSlaCard businessUnitId={unitId} catalog={catalog} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
