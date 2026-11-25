"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { LekvyaLoader } from "@/components/ui/lekvya-loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import PricingCards from "@/components/landing/PricingCards";
import { isAuthenticated, isMasterAdminUser } from "@/lib/api/index";
import {
  EMPTY_FORM,
  formToInput,
  planToForm,
  type FormState,
} from "@/components/master-admin/pricing-plan-form";
import {
  createPricingPlan,
  deletePricingPlan,
  getAllPricingPlans,
  updatePricingPlan,
  type PricingPlan,
  type PricingPlanInput,
} from "@/lib/api/pricing-plans";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export default function PricingPlansPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // null = dialog closed, "new" = creating, number = editing that id
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await getAllPricingPlans());
    } catch (e) {
      toast({ title: "Failed to load pricing plans", description: errMsg(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    if (!isMasterAdminUser()) {
      toast({ title: "Access Denied", description: "You must be a master admin.", variant: "destructive" });
      router.replace("/dashboard");
      return;
    }
    setIsCheckingAuth(false);
    load();
  }, [router, toast, load]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm({ ...EMPTY_FORM, sortOrder: plans.length + 1 });
    setEditing("new");
  };

  const openEdit = (p: PricingPlan) => {
    setForm(planToForm(p));
    setEditing(p.id);
  };

  const save = async () => {
    setBusy(true);
    try {
      const input = formToInput(form);
      if (editing === "new") await createPricingPlan(input);
      else if (typeof editing === "number") await updatePricingPlan(editing, input);
      toast({ title: editing === "new" ? "Plan created" : "Plan updated" });
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: "Could not save plan", description: errMsg(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const patch = async (p: PricingPlan, data: Partial<PricingPlanInput>) => {
    setBusy(true);
    try {
      const updated = await updatePricingPlan(p.id, data);
      setPlans((list) => list.map((x) => (x.id === p.id ? updated : x)));
    } catch (e) {
      toast({ title: "Could not update plan", description: errMsg(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: PricingPlan) => {
    if (!window.confirm(`Delete the "${p.name}" plan? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deletePricingPlan(p.id);
      setPlans((list) => list.filter((x) => x.id !== p.id));
      toast({ title: "Plan deleted" });
    } catch (e) {
      toast({ title: "Could not delete plan", description: errMsg(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /** Move a plan up/down, then renumber sortOrder 1..n and save only the ones that changed. */
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...plans];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    const renumbered = next.map((p, i) => ({ ...p, sortOrder: i + 1 }));
    setPlans(renumbered);
    setBusy(true);
    try {
      await Promise.all(
        renumbered
          .filter((p) => plans.find((o) => o.id === p.id)?.sortOrder !== p.sortOrder)
          .map((p) => updatePricingPlan(p.id, { sortOrder: p.sortOrder })),
      );
    } catch (e) {
      toast({ title: "Could not reorder", description: errMsg(e), variant: "destructive" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (isCheckingAuth) return <LekvyaLoader className="min-h-[60vh]" />;

  const activePlans = plans.filter((p) => p.isActive);

  return (
    <>
        <div>
          <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Tag className="w-6 h-6 text-orange-500" /> Pricing Plans
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  The pricing cards shown on the home page and the /plan page. Changes go live immediately.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open("/#pricing", "_blank")}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View on site
                </Button>
                <Button size="sm" onClick={openNew}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add plan
                </Button>
              </div>
            </div>

            {loading ? (
              <LekvyaLoader className="py-16" />
            ) : plans.length === 0 ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                No pricing plans yet. The site shows the built-in defaults until you add one.
              </Card>
            ) : (
              <div className="space-y-3">
                {plans.map((p, i) => (
                  <Card key={p.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex md:flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Move ${p.name} up`}
                        disabled={busy || i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Move ${p.name} down`}
                        disabled={busy || i === plans.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {p.price}
                          {p.period}
                        </span>
                        {p.isHighlighted && <Badge>Featured</Badge>}
                        {p.badge && <Badge variant="secondary">{p.badge}</Badge>}
                        {!p.isActive && <Badge variant="outline">Hidden</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {p.features.length} features · button “{p.buttonText}” → {p.buttonLink}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={p.isActive}
                          disabled={busy}
                          onCheckedChange={(v) => patch(p, { isActive: v })}
                          aria-label={`Show ${p.name} on site`}
                        />
                        Visible
                      </label>
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${p.name}`}
                        disabled={busy}
                        onClick={() => remove(p)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {activePlans.length > 0 && (
              <div className="pt-6 border-t">
                <h2 className="text-sm font-semibold text-muted-foreground mb-6">Live preview (visible plans)</h2>
                <PricingCards plans={activePlans} className="py-4" />
              </div>
            )}
          </div>
        </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add pricing plan" : "Edit pricing plan"}</DialogTitle>
            <DialogDescription>Shown as a card on the home page and /plan.</DialogDescription>
          </DialogHeader>

          <form
            id="plan-form"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field id="name" label="Plan name *">
              <Input id="name" required maxLength={60} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field id="price" label="Price *">
                <Input
                  id="price"
                  required
                  maxLength={30}
                  placeholder="₹499"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </Field>
              <Field id="period" label="Period">
                <Input
                  id="period"
                  maxLength={30}
                  placeholder="/month"
                  value={form.period}
                  onChange={(e) => set("period", e.target.value)}
                />
              </Field>
            </div>
            <Field id="description" label="Short description" wide>
              <Textarea
                id="description"
                rows={2}
                maxLength={1000}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <Field id="badge" label="Badge (optional)">
              <Input
                id="badge"
                maxLength={40}
                placeholder="Most Popular / Coming Soon"
                value={form.badge}
                onChange={(e) => set("badge", e.target.value)}
              />
            </Field>
            <Field id="trialText" label="Trial label (optional)">
              <Input
                id="trialText"
                maxLength={60}
                placeholder="7-day Free Trial"
                value={form.trialText}
                onChange={(e) => set("trialText", e.target.value)}
              />
            </Field>
            <Field id="buttonText" label="Button text *">
              <Input
                id="buttonText"
                required
                maxLength={40}
                value={form.buttonText}
                onChange={(e) => set("buttonText", e.target.value)}
              />
            </Field>
            <Field id="buttonLink" label="Button link *">
              <Input
                id="buttonLink"
                required
                maxLength={255}
                pattern="(/[^/].*|/|https?://.+)"
                title="A site path like /signup or a full https:// URL"
                placeholder="/signup"
                value={form.buttonLink}
                onChange={(e) => set("buttonLink", e.target.value)}
              />
            </Field>
            <Field id="features" label="Features (one per line)" wide>
              <Textarea
                id="features"
                rows={7}
                value={form.features}
                onChange={(e) => set("features", e.target.value)}
              />
            </Field>
            <Field id="sortOrder" label="Display order">
              <Input
                id="sortOrder"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
              />
            </Field>
            <div className="flex flex-col gap-3 justify-end">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isHighlighted} onCheckedChange={(v) => set("isHighlighted", v)} />
                Featured card (dark, larger)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
                Visible on site
              </label>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="plan-form" disabled={busy}>
              {busy ? "Saving…" : "Save plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ id, label, wide, children }: { id: string; label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
