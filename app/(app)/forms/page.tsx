"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Copy, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import { FormItem, createForm, listForms, FormField } from "@/lib/api/forms";
import { pickerLabel, activeBrands } from "@/lib/unit-structure";
import { newField } from "@/lib/form-builder";

function startingFields(): FormField[] {
  const name = { ...newField("text", [], "Full name"), required: true, role: "name" as const };
  const email = { ...newField("email", [name.key], "Email"), required: true };
  const message = { ...newField("textarea", [name.key, email.key], "Message"), required: false, role: "message" as const };
  return [name, email, message];
}

export default function FormsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", unitId: "", submitLabel: "Send", successMessage: "", autoCreateLead: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, unitList] = await Promise.all([listForms(), listBusinessUnits()]);
      setForms(list);
      setUnits(unitList);
    } catch (err) {
      toast({ title: "Could not load forms", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const unitName = useMemo(() => new Map(units.map((u) => [u.id, pickerLabel(u, units)])), [units]);
  const visible = forms.filter((f) => unitFilter === "all" || String(f.businessUnitId) === unitFilter);

  const openCreate = () => {
    setDraft({
      name: "",
      unitId: units.find((u) => u.isDefault)?.id.toString() ?? activeBrands(units)[0]?.id.toString() ?? "",
      submitLabel: "Send",
      successMessage: "",
      autoCreateLead: true,
    });
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setCreating(true);
    try {
      const created = await createForm({
        name: draft.name.trim(),
        businessUnitId: draft.unitId ? Number(draft.unitId) : undefined,
        fields: startingFields(),
        submitLabel: draft.submitLabel,
        successMessage: draft.successMessage || undefined,
        autoCreateLead: draft.autoCreateLead,
      });
      setCreateOpen(false);
      router.push(`/forms/${created.id}`);
    } catch (err) {
      toast({ title: "Could not create form", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (path: string) => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: url, variant: "success" });
    } catch {
      toast({ title: "Copy failed", description: url, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ClipboardList className="h-6 w-6" /> Forms
          </h1>
          <p className="text-sm text-muted-foreground">
            Build contact and enquiry forms. Each response lands in the inbox and can become a lead or a client.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeBrands(units).length > 1 && (
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <option value="all">All units</option>
              {activeBrands(units).map((u) => (
                <option key={u.id} value={String(u.id)}>{pickerLabel(u, units)}</option>
              ))}
            </Select>
          )}
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New form
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your forms</CardTitle>
          <CardDescription>Share the link, or embed the form on your website.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : visible.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No forms yet. Click &quot;New form&quot; to build one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {units.length > 1 && <TableHead>Unit</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Creates leads</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    {units.length > 1 && <TableCell className="text-xs">{unitName.get(f.businessUnitId) ?? "—"}</TableCell>}
                    <TableCell>
                      <Badge variant={f.status === "active" ? "default" : "secondary"}>{f.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{f.autoCreateLead ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(f.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyLink(f.path)}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Link
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/forms/${f.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New form</DialogTitle>
            <DialogDescription>Starts with name, email and a message. You can change everything next.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Form name *</Label>
              <Input
                autoFocus
                className="mt-1 text-sm"
                placeholder="e.g. GST enquiry"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            {activeBrands(units).length > 1 && (
              <div>
                <Label className="text-xs font-semibold">Business unit</Label>
                <Select className="mt-1 w-full" value={draft.unitId} onValueChange={(v) => setDraft({ ...draft, unitId: v })}>
                  {units.filter((u) => u.isActive || String(u.id) === draft.unitId).map((u) => (
                    <option key={u.id} value={String(u.id)}>{pickerLabel(u, units)}</option>
                  ))}
                </Select>
              </div>
            )}
            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div>
                <Label className="text-xs font-semibold">Create a lead for each response</Label>
                <p className="mt-1 text-xs text-muted-foreground">Same email or phone as an existing lead is added to that lead.</p>
              </div>
              <Switch
                checked={draft.autoCreateLead}
                onCheckedChange={(v) => setDraft({ ...draft, autoCreateLead: v })}
                aria-label="Create a lead for each response"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating || !draft.name.trim()}>
                {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create and edit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Native select styled like the other inputs on this page. */
function Select({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`h-9 rounded-md border border-input bg-background px-3 text-sm ${className ?? ""}`}
    >
      {children}
    </select>
  );
}
