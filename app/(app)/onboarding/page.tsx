"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { BusinessUnit, createBusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import { OrgUnit, createOrgUnit, listOrgUnits } from "@/lib/api/units";
import { MailAccount, listMailAccounts } from "@/lib/api/mail-accounts";
import { ApiKeyItem, getApiKeys } from "@/lib/api/developer";
import { getMyAccess } from "@/lib/api/access";
import { IndustryTemplate, createPipelineFromTemplate, listIndustryTemplates } from "@/lib/api/industry-templates";
import {
  OnboardingProgress,
  OnboardingStepId,
  isStepDone,
  loadOnboarding,
  nextOpenStep,
  onboardingSteps,
  progressOf,
  unitsStepDetected,
  saveOnboarding,
} from "@/lib/onboarding";
import { UnitStructure, allowsManyUnits, brandLabel, groupBrandsByUnit, normalizeStructure, structureTitle } from "@/lib/unit-structure";

const STEP_LINKS: Partial<Record<OnboardingStepId, { href: string; label: string }>> = {
  units: { href: "/settings/business-units", label: "Open Business setup" },
  mail: { href: "/settings/mail-accounts", label: "Open sending accounts" },
  team: { href: "/settings/staff", label: "Open users, teams & access" },
  form: { href: "/forms", label: "Open forms" },
};

/** Guided setup for a new workspace. Units and sending accounts are detected; the rest are marked by hand. */
export default function OnboardingPage() {
  const { toast } = useToast();
  const [marked, setMarked] = useState<OnboardingProgress>({});
  const [units, setUnits] = useState<BusinessUnit[] | null>(null); // brands
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [structure, setStructure] = useState<UnitStructure>("multi_unit");
  const [newUnitName, setNewUnitName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandUnitId, setNewBrandUnitId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [mailAccounts, setMailAccounts] = useState<MailAccount[] | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  // False for a single-branch workspace, which has no business units step.
  const [adminPanel, setAdminPanel] = useState(true);
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [active, setActive] = useState<OnboardingStepId>("units");
  const [unitId, setUnitId] = useState<string>("");
  const [templateKey, setTemplateKey] = useState<string>("");
  const [pipelineName, setPipelineName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setMarked(loadOnboarding(typeof window !== "undefined" ? window.localStorage : null));
    Promise.all([
      listBusinessUnits(),
      listMailAccounts().catch(() => []),
      listIndustryTemplates().catch(() => []),
      getMyAccess().catch(() => null),
      listOrgUnits().catch(() => [] as OrgUnit[]),
      getApiKeys().catch(() => [] as ApiKeyItem[]),
    ])
      .then(([u, m, t, access, ou, keys]) => {
        const panel = access?.adminPanel !== false;
        setAdminPanel(panel);
        setStructure(normalizeStructure(access?.unitStructure));
        setOrgUnits(ou);
        const firstUnit = ou.find((x) => x.isDefault) ?? ou[0];
        if (firstUnit) setNewBrandUnitId(String(firstUnit.id));
        if (!panel) setActive((current) => (current === "units" ? "pipeline" : current));
        setUnits(u);
        setMailAccounts(m);
        setTemplates(t);
        setApiKeys(keys);
        if (u.length) setUnitId(String(u[0].id));
      })
      .catch((e) => toast({ title: "Could not load setup", description: (e as Error).message, variant: "destructive" }));
  }, [toast]);

  const detected = useMemo<OnboardingProgress>(
    () => ({
      units: unitsStepDetected(
        structure,
        orgUnits.filter((u) => u.isActive).length,
        (units ?? []).filter((b) => b.isActive).length,
      ),
      mail: (mailAccounts?.length ?? 0) > 0,
    }),
    [structure, orgUnits, units, mailAccounts],
  );

  const mark = useCallback((id: OnboardingStepId, done: boolean) => {
    setMarked((prev) => {
      const next = { ...prev, [id]: done };
      saveOnboarding(typeof window !== "undefined" ? window.localStorage : null, next);
      return next;
    });
  }, []);

  const steps = useMemo(() => onboardingSteps(adminPanel, structure), [adminPanel, structure]);
  const progress = progressOf(marked, detected, steps);
  const following = nextOpenStep(marked, detected, steps);

  /** Reloads units and brands after one is added here. */
  const refreshSetup = async () => {
    const [b, u] = await Promise.all([listBusinessUnits(), listOrgUnits().catch(() => [] as OrgUnit[])]);
    setUnits(b);
    setOrgUnits(u);
  };

  const addUnit = async () => {
    if (!newUnitName.trim()) return;
    setAdding(true);
    try {
      const created = await createOrgUnit({ name: newUnitName.trim() });
      setNewUnitName("");
      setNewBrandUnitId(String(created.id));
      await refreshSetup();
      toast({ title: "Unit added", description: `Now add the brands that run in ${created.name}.` });
    } catch (e) {
      toast({ title: "Could not add the unit", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const addBrand = async () => {
    if (!newBrandName.trim()) return;
    setAdding(true);
    try {
      await createBusinessUnit({
        name: newBrandName.trim(),
        ...(newBrandUnitId ? { unitId: Number(newBrandUnitId) } : {}),
      });
      setNewBrandName("");
      await refreshSetup();
      toast({ title: "Brand added" });
    } catch (e) {
      toast({ title: "Could not add the brand", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const createPipeline = async () => {
    if (!unitId || !templateKey) return;
    setCreating(true);
    try {
      await createPipelineFromTemplate({
        key: templateKey,
        businessUnitId: Number(unitId),
        name: pipelineName.trim() || undefined,
      });
      mark("pipeline", true);
      toast({ title: "Pipeline created", description: "Its stages are ready on the Leads board." });
    } catch (e) {
      toast({ title: "Could not create the pipeline", description: (e as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (units === null) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading setup…
      </div>
    );
  }

  const selectedTemplate = templates.find((t) => t.key === templateKey);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-5">
      <PageHeader
        title="Get started"
        description={`${steps.length} steps to take a new workspace from empty to taking enquiries.`}
      />

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{progress.done} of {progress.total} done</span>
          {progress.complete && <Badge>All set</Badge>}
        </div>
        <Progress value={(progress.done / progress.total) * 100} />
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <ol className="space-y-1">
          {steps.map((s, i) => {
            const done = isStepDone(s.id, marked, detected);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${active === s.id ? "bg-muted font-medium" : "hover:bg-muted/60"}`}
                >
                  {done ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className="flex-1">{i + 1}. {s.title}</span>
                  {following === s.id && <Badge variant="outline">Next</Badge>}
                </button>
              </li>
            );
          })}
        </ol>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{steps.find((s) => s.id === active)?.title}</CardTitle>
            <CardDescription>{steps.find((s) => s.id === active)?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {active === "units" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Your setup: {structureTitle(structure)}</p>
                <div className="space-y-2">
                  {groupBrandsByUnit(orgUnits.filter((u) => u.isActive), units.filter((b) => b.isActive)).map(({ unit, brands }) => (
                    <div key={unit.id} className="rounded-md border p-3 text-sm">
                      {allowsManyUnits(structure) && (
                        <p className="font-medium">
                          {unit.name}
                          {unit.isDefault && <span className="ml-2 text-xs font-normal text-muted-foreground">created for you</span>}
                        </p>
                      )}
                      <p className={`text-xs text-muted-foreground ${allowsManyUnits(structure) ? "mt-0.5" : ""}`}>
                        {brands.length === 0 ? "No brands yet" : brands.map((b) => b.name).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
                {allowsManyUnits(structure) && (
                  <div className="space-y-1">
                    <Label className="text-xs">Add a unit (a place, like Shamshabad)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newUnitName}
                        maxLength={255}
                        placeholder="Unit name"
                        onChange={(e) => setNewUnitName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUnit())}
                      />
                      <Button size="sm" variant="outline" onClick={addUnit} disabled={adding || !newUnitName.trim()}>
                        Add unit
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Add a brand{allowsManyUnits(structure) ? " to a unit" : ""}</Label>
                  <div className="flex flex-wrap gap-2">
                    {orgUnits.filter((u) => u.isActive).length > 1 && (
                      <select
                        aria-label="Unit"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={newBrandUnitId}
                        onChange={(e) => setNewBrandUnitId(e.target.value)}
                      >
                        {orgUnits.filter((u) => u.isActive).map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    )}
                    <Input
                      className="min-w-48 flex-1"
                      value={newBrandName}
                      maxLength={255}
                      placeholder="Brand name, like Rice mills"
                      onChange={(e) => setNewBrandName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBrand())}
                    />
                    <Button size="sm" variant="outline" onClick={addBrand} disabled={adding || !newBrandName.trim()}>
                      Add brand
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {active === "pipeline" && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {units.length > 1 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Brand</Label>
                      <Select value={unitId} onValueChange={setUnitId}>
                        <SelectTrigger><SelectValue placeholder="Choose a brand" /></SelectTrigger>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>{brandLabel(u, orgUnits)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Pipeline name (optional)</Label>
                    <Input value={pipelineName} maxLength={120} onChange={(e) => setPipelineName(e.target.value)} placeholder={selectedTemplate?.name ?? "Defaults to the template name"} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {templates.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTemplateKey(t.key)}
                      className={`rounded-lg border p-3 text-left ${templateKey === t.key ? "border-primary ring-1 ring-primary" : "hover:bg-muted/60"}`}
                    >
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{t.pipelineStages.filter((s) => !s.isWon && !s.isLost).map((s) => s.name).join(" → ")}</p>
                    </button>
                  ))}
                </div>
                <Button onClick={createPipeline} disabled={creating || !unitId || !templateKey}>
                  {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create this pipeline
                </Button>
              </div>
            )}

            {active === "mail" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {mailAccounts && mailAccounts.length > 0
                    ? `${mailAccounts.length} sending account${mailAccounts.length === 1 ? "" : "s"} connected.`
                    : "No sending account yet. Connect an SMTP account per brand so form replies and alerts go from that brand's address."}
                </p>
                {units.filter((b) => b.isActive).length > 1 && (
                  <div className="space-y-1.5">
                    {units
                      .filter((b) => b.isActive)
                      .map((b) => {
                        const smtp = (mailAccounts ?? []).find((m) => m.isActive && m.businessUnitId === b.id);
                        return (
                          <div key={b.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                            <span className="font-medium">{brandLabel(b, orgUnits)}</span>
                            {smtp ? (
                              <span className="text-emerald-700 dark:text-emerald-400">{smtp.fromEmail}</span>
                            ) : (
                              <Link className="underline text-muted-foreground hover:text-foreground" href={`/settings/mail-accounts?brand=${b.id}`}>
                                Connect SMTP
                              </Link>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {active === "form" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create an API key for each brand, embed the form code on that brand&apos;s website, and review incoming enquiries in Form inquiries to convert them into leads.
                </p>
                {units.filter((b) => b.isActive).length > 0 && (
                  <div className="space-y-1.5">
                    {units
                      .filter((b) => b.isActive)
                      .map((b) => {
                        const count = apiKeys.filter((k) => k.isActive && k.businessUnitId === b.id).length;
                        return (
                          <div key={b.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                            <span className="font-medium">{brandLabel(b, orgUnits)}</span>
                            {count > 0 ? (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                {count} API key{count === 1 ? "" : "s"} ready
                              </span>
                            ) : (
                              <Link className="underline text-muted-foreground hover:text-foreground" href={`/developer/keys?brand=${b.id}`}>
                                Create API key
                              </Link>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/developer/keys">Per-brand API keys</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/developer/quickstart">Form &amp; API code</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/developer/inbox">Form inquiries</Link>
                  </Button>
                </div>
              </div>
            )}

            {STEP_LINKS[active] && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={STEP_LINKS[active]!.href}>{STEP_LINKS[active]!.label}</Link>
                </Button>
              </div>
            )}

            {(active === "units" || active === "team" || active === "form" || active === "mail") && (
              <div className="flex items-center gap-2 border-t pt-4">
                <Button size="sm" variant={marked[active] ? "secondary" : "default"} onClick={() => mark(active, !marked[active])}>
                  {marked[active] ? "Mark as not done" : "Mark as done"}
                </Button>
                {detected[active as keyof OnboardingProgress] && <span className="text-xs text-muted-foreground">Detected automatically</span>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {progress.complete && (
        <p className="text-sm">
          Setup is complete. <Link className="underline" href="/dashboard">Go to your dashboard</Link>.
        </p>
      )}
    </div>
  );
}
