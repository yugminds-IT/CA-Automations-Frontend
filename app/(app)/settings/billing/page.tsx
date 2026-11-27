"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { getRoleFromUser, getUserData } from "@/lib/api/index";
import { BillingView, PlanCatalogItem, changeMyPlan, getMyBilling, getPlanCatalog } from "@/lib/api/billing";
import { featureRows, limitLabel, planBlockers, planMove, usagePercent } from "@/lib/billing-format";

export default function BillingPage() {
  const { toast } = useToast();
  const [view, setView] = useState<BillingView | null>(null);
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [target, setTarget] = useState<PlanCatalogItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getMyBilling(), getPlanCatalog()])
      .then(([v, p]) => {
        setView(v);
        setPlans(p);
      })
      .catch((e) => toast({ title: "Could not load billing", description: (e as Error).message, variant: "destructive" }));
  }, [toast]);

  if (!view) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading plan…
      </div>
    );
  }

  // Only the workspace admin switches plans; the server enforces this too.
  const canSwitch = (getRoleFromUser(getUserData()) ?? "").toUpperCase() === "ORG_ADMIN";

  const meters = [
    { label: "Business units", used: view.usage.units, limit: view.limits.units },
    { label: "Active staff", used: view.usage.users, limit: view.limits.users },
    { label: "Custom fields", used: view.usage.customFields, limit: view.limits.customFields },
  ];

  async function confirmSwitch() {
    if (!target) return;
    setSaving(true);
    try {
      const next = await changeMyPlan(target.key);
      setView(next);
      toast({ title: `You are now on ${next.planName}`, description: "The new limits apply straight away.", variant: "success" });
      setTarget(null);
    } catch (e) {
      toast({ title: "Could not change plan", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const targetMove = target ? planMove(view.planKey, target.key) : null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <PageHeader
        title="Plan and usage"
        description={
          <>
            You are on the <strong>{view.planName}</strong> plan.{" "}
            {canSwitch ? "Pick a plan below to switch." : "Ask your workspace admin to change plans."}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage</CardTitle>
            <CardDescription>Counts across this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {meters.map((m) => (
              <div key={m.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{m.label}</span>
                  <span className="text-muted-foreground">{limitLabel(m.used, m.limit)}</span>
                </div>
                <Progress value={usagePercent(m.used, m.limit)} />
              </div>
            ))}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>AI credits this month</span>
                <span className="text-muted-foreground">{limitLabel(view.ai.used, view.ai.limit)}</span>
              </div>
              <Progress value={usagePercent(view.ai.used, view.ai.limit)} />
              <p className="text-xs text-muted-foreground">
                {view.ai.limit === 0
                  ? "AI wording is not included on this plan. Standard templates are used."
                  : `${view.ai.remaining.toLocaleString("en-IN")} left. Credits reset on the 1st (IST).`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modules</CardTitle>
            <CardDescription>Filing modules can be turned on or off for this workspace by Lekvya.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["tds", "gst"] as const).map((key) => (
              <div key={key} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{key.toUpperCase()} filing</p>
                  <p className="text-xs text-muted-foreground">
                    {view.moduleOverrides[key] === undefined ? "Default for your industry" : "Set by Lekvya"}
                  </p>
                </div>
                <Badge variant={view.modules[key] ? "default" : "outline"}>{view.modules[key] ? "On" : "Off"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((p) => {
              const move = planMove(view.planKey, p.key);
              const blockers = move === "downgrade" ? planBlockers(p, view.usage) : [];
              return (
                <div
                  key={p.key}
                  className={`flex flex-col gap-3 rounded-lg border p-4 ${move === "current" ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{p.name}</p>
                    {move === "current" && <Badge>Current</Badge>}
                  </div>
                  <dl className="space-y-1 text-sm">
                    {featureRows(p).map((r) => (
                      <div key={r.label} className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">{r.label}</dt>
                        <dd className="text-right">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {canSwitch && move !== "current" && (
                    <div className="mt-auto space-y-2 pt-1">
                      <Button
                        className="w-full"
                        variant={move === "upgrade" ? "default" : "outline"}
                        disabled={blockers.length > 0}
                        onClick={() => setTarget(p)}
                      >
                        {move === "upgrade" ? "Upgrade" : "Switch"} to {p.name}
                      </Button>
                      {blockers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {blockers.join(" ")} Remove the extra ones to switch.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={target !== null} onOpenChange={(open) => { if (!open && !saving) setTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {targetMove === "upgrade" ? "Upgrade" : "Switch"} to {target?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {targetMove === "downgrade"
                ? `You will lose what ${view.planName} had beyond ${target?.name}, such as higher limits and AI credits. `
                : `You get the higher ${target?.name} limits and features. `}
              The change applies straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep {view.planName}</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void confirmSwitch();
              }}
            >
              {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
