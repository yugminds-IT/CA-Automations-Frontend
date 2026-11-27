"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Lock, Pencil, Plus, Power, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useToast } from "@/components/ui/use-toast";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import {
  CreateCustomFieldInput,
  CustomField,
  CustomFieldType,
  CUSTOM_FIELD_TYPES,
  FIELD_ROLES,
  FIELD_TYPE_LABELS,
  createCustomField,
  deleteCustomField,
  listCustomFields,
  reorderCustomFields,
  updateCustomField,
} from "@/lib/api/custom-fields";
import { CONTROLLER_TYPES, OPTION_TYPES, convertibleTypes, keyFromLabel } from "@/lib/custom-fields";
import { pickerLabel, activeBrands } from "@/lib/unit-structure";
import { BUILT_IN_LEAD_FIELDS } from "@/lib/lead-built-in-fields";
import { PipelineStagesCard } from "@/components/leads/pipeline-stages-card";

const NONE = "__none__";

/** One line under the type picker, so the choice is clear before a field is made. */
const TYPE_HINTS: Partial<Record<CustomFieldType, string>> = {
  text: "A single line, for short answers.",
  textarea: "Several lines, for notes and longer answers.",
  select: "A dropdown. Pick one from your list.",
  radio: "All choices shown as buttons. Pick exactly one.",
  multiselect: "All choices shown as tick boxes. Pick any number.",
  boolean: "A single tick box for yes or no.",
};

type Draft = {
  id: number | null;
  label: string;
  key: string;
  fieldType: CustomFieldType;
  /** The type the field was saved with. A saved field can only switch within its group. */
  originalType: CustomFieldType;
  optionsText: string;
  required: boolean;
  section: string;
  helpText: string;
  showIfKey: string;
  showIfValue: string;
  visibleToRoles: string[];
  editableByRoles: string[];
};

const emptyDraft: Draft = {
  id: null,
  label: "",
  key: "",
  fieldType: "text",
  originalType: "text",
  optionsText: "",
  required: false,
  section: "Details",
  helpText: "",
  showIfKey: "",
  showIfValue: "",
  visibleToRoles: [],
  editableByRoles: [],
};

function draftFrom(f: CustomField): Draft {
  return {
    id: f.id,
    label: f.label,
    key: f.key,
    fieldType: f.fieldType,
    originalType: f.fieldType,
    optionsText: f.options.join("\n"),
    required: f.required,
    section: f.section,
    helpText: f.helpText ?? "",
    showIfKey: f.showIfKey ?? "",
    showIfValue: f.showIfValue ?? "",
    visibleToRoles: f.visibleToRoles,
    editableByRoles: f.editableByRoles,
  };
}

const parseOptions = (text: string) =>
  [...new Set(text.split("\n").map((s) => s.trim()).filter(Boolean))];

export default function LeadFieldsPage() {
  const { toast } = useToast();
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [builtInOpen, setBuiltInOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomField | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listBusinessUnits()
      .then((all) => {
        const list = activeBrands(all);
        setUnits(list);
        const def = list.find((u) => u.isDefault) ?? list[0];
        if (def) setUnitId(def.id);
        else setLoading(false);
      })
      .catch((err: any) => {
        toast({ title: "Could not load business units", description: err?.message, variant: "destructive" });
        setLoading(false);
      });
  }, [toast]);

  const load = useCallback(async () => {
    if (unitId == null) return;
    setLoading(true);
    try {
      setFields(await listCustomFields(unitId));
    } catch (err: any) {
      toast({ title: "Could not load lead fields", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [unitId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const activeFields = useMemo(() => fields.filter((f) => f.isActive), [fields]);
  const controllers = useMemo(
    () => activeFields.filter((f) => CONTROLLER_TYPES.includes(f.fieldType) && f.id !== draft.id),
    [activeFields, draft.id],
  );
  const controllerField = controllers.find((f) => f.key === draft.showIfKey);

  const openCreate = () => {
    setDraft(emptyDraft);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (f: CustomField) => {
    setDraft(draftFrom(f));
    setErrors({});
    setDialogOpen(true);
  };

  const validate = (d: Draft): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!d.label.trim()) e.label = "Give the field a name";
    if (OPTION_TYPES.includes(d.fieldType) && parseOptions(d.optionsText).length === 0) {
      e.optionsText = "Add at least one option, one per line";
    }
    if (d.showIfKey && !d.showIfValue.trim()) e.showIfValue = "Choose the value that shows this field";
    return e;
  };

  const handleSave = async () => {
    const e = validate(draft);
    setErrors(e);
    if (Object.keys(e).length > 0 || unitId == null) return;
    const options = OPTION_TYPES.includes(draft.fieldType) ? parseOptions(draft.optionsText) : [];
    const showIfKey = draft.showIfKey || null;
    const showIfValue = showIfKey ? draft.showIfValue : null;
    setSaving(true);
    try {
      if (draft.id == null) {
        const input: CreateCustomFieldInput = {
          label: draft.label.trim(),
          key: draft.key.trim() || undefined,
          fieldType: draft.fieldType,
          options,
          required: draft.required,
          section: draft.section.trim() || "Details",
          helpText: draft.helpText.trim() || undefined,
          showIfKey: showIfKey ?? undefined,
          showIfValue: showIfValue ?? undefined,
          visibleToRoles: draft.visibleToRoles,
          editableByRoles: draft.editableByRoles,
          businessUnitId: unitId,
        };
        await createCustomField(input);
        toast({ title: "Field added" });
      } else {
        await updateCustomField(draft.id, {
          label: draft.label.trim(),
          ...(draft.fieldType !== draft.originalType ? { fieldType: draft.fieldType } : {}),
          options,
          required: draft.required,
          section: draft.section.trim() || "Details",
          helpText: draft.helpText.trim() || null,
          showIfKey,
          showIfValue,
          visibleToRoles: draft.visibleToRoles,
          editableByRoles: draft.editableByRoles,
        });
        toast({ title: "Field saved" });
      }
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: "Could not save field", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (f: CustomField) => {
    try {
      await updateCustomField(f.id, { isActive: !f.isActive });
      await load();
    } catch (err: any) {
      toast({ title: "Could not update field", description: err?.message, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomField(deleteTarget.id);
      toast({ title: "Field deleted", description: `"${deleteTarget.label}" was removed from every lead in this unit.` });
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      // The server explains when another field still depends on this one.
      toast({ title: "Could not delete field", description: err?.message, variant: "destructive" });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const move = async (f: CustomField, direction: -1 | 1) => {
    if (unitId == null) return;
    const ids = activeFields.map((x) => x.id);
    const i = ids.indexOf(f.id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await reorderCustomFields(unitId, ids);
      await load();
    } catch (err: any) {
      toast({ title: "Could not reorder", description: err?.message, variant: "destructive" });
    }
  };

  const toggleRole = (list: "visibleToRoles" | "editableByRoles", role: string) =>
    setDraft((d) => ({
      ...d,
      [list]: d[list].includes(role) ? d[list].filter((r) => r !== role) : [...d[list], role],
    }));

  const unitName = (() => { const u = units.find((x) => x.id === unitId); return u ? pickerLabel(u, units) : ""; })();
  const isNew = draft.id == null;
  const typeChoices: readonly CustomFieldType[] = isNew ? CUSTOM_FIELD_TYPES : convertibleTypes(draft.originalType);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <SlidersHorizontal className="h-5 w-5" /> Lead fields
          </h1>
          <p className="text-sm text-muted-foreground">
            Add your own questions to a lead, and change or remove them any time. {units.length > 1 ? "Each business unit has its own set. " : ""}Built-in fields are listed at the bottom.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {units.length > 1 && (
            <Select value={unitId == null ? undefined : String(unitId)} onValueChange={(v) => setUnitId(Number(v))}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Business unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {pickerLabel(u, units)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={openCreate} disabled={unitId == null}>
            <Plus className="mr-1 h-4 w-4" /> Add field
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your custom fields{unitName && units.length > 1 ? ` · ${unitName}` : ""}</CardTitle>
          <CardDescription>
            Custom fields appear on the New lead form and the Lead page, in the order below. CSV import and web forms don&apos;t fill them.
            Turn a field off to hide it without losing its data. Delete it to remove it and its data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom fields yet. Use Add field to create a text box, dropdown, radio buttons and more.</p>
          ) : (
            <ul className="divide-y">
              {fields.map((f) => {
                const activeIndex = activeFields.findIndex((x) => x.id === f.id);
                return (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{f.label}</span>
                        <Badge variant="outline">{FIELD_TYPE_LABELS[f.fieldType]}</Badge>
                        {f.required && <Badge variant="secondary">Required</Badge>}
                        {!f.isActive && <Badge variant="destructive">Off</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Key <code>{f.key}</code>
                        {f.section !== "Details" && <> · Section {f.section}</>}
                        {f.showIfKey && (
                          <> · Shown when {f.showIfKey} = {f.showIfValue}</>
                        )}
                        {" · "}Visible to {describeRoles(f.visibleToRoles)}
                        {" · "}Editable by {describeRoles(f.editableByRoles)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Move up"
                        disabled={!f.isActive || activeIndex <= 0}
                        onClick={() => move(f, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Move down"
                        disabled={!f.isActive || activeIndex < 0 || activeIndex >= activeFields.length - 1}
                        onClick={() => move(f, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Edit field" onClick={() => openEdit(f)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={f.isActive ? "Turn off" : "Turn on"}
                        onClick={() => toggleActive(f)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${f.label}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(f)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <PipelineStagesCard unitId={unitId} />

      <Collapsible open={builtInOpen} onOpenChange={setBuiltInOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-xl px-6 py-4 text-left hover:bg-muted/40"
              aria-label={`${builtInOpen ? "Hide" : "Show"} built-in fields`}
            >
              <div>
                <div className="flex items-center gap-2 font-semibold leading-none">
                  <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Built-in fields
                  <Badge variant="secondary">{BUILT_IN_LEAD_FIELDS.length}</Badge>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Part of every lead, so they can&apos;t be removed or changed.
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${builtInOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Used in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {BUILT_IN_LEAD_FIELDS.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{f.label}</span>
                          {f.required && <Badge variant="secondary">Required</Badge>}
                        </div>
                        <div className="mt-0.5 max-w-xs whitespace-normal text-xs text-muted-foreground">{f.note}</div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className="whitespace-nowrap">
                          {f.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {f.where.map((w) => (
                            <Badge key={w} variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
                              {w}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add a lead field" : "Edit lead field"}</DialogTitle>
            <DialogDescription>
              {isNew
                ? "Pick a type, then decide who sees and changes it."
                : "The key stays fixed once saved. The type can switch between look-alikes, such as dropdown and radio buttons."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cf-label">Question</Label>
              <Input
                id="cf-label"
                value={draft.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    label,
                    key: isNew && (!d.key || d.key === keyFromLabel(d.label)) ? keyFromLabel(label) : d.key,
                  }));
                }}
                placeholder="e.g. Trip date"
              />
              {errors.label && <p className="text-xs text-destructive">{errors.label}</p>}
            </div>

            {isNew && (
              <div className="space-y-1.5">
                <Label htmlFor="cf-key">Key for templates</Label>
                <Input
                  id="cf-key"
                  value={draft.key}
                  onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
                  placeholder="trip_date"
                />
                <p className="text-xs text-muted-foreground">
                  Lower case, digits and underscores. Used in templates as {"{{"}trip_date{"}}"}.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Answer type</Label>
              <Select
                value={draft.fieldType}
                disabled={!isNew && typeChoices.length <= 1}
                onValueChange={(v) => setDraft((d) => ({ ...d, fieldType: v as CustomFieldType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeChoices.map((t) => (
                    <SelectItem key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {TYPE_HINTS[draft.fieldType] && (
                <p className="text-xs text-muted-foreground">{TYPE_HINTS[draft.fieldType]}</p>
              )}
              {!isNew && typeChoices.length <= 1 && (
                <p className="text-xs text-muted-foreground">
                  This type is fixed because leads may already hold values for it. To use another type, add a new field.
                </p>
              )}
            </div>

            {OPTION_TYPES.includes(draft.fieldType) && (
              <div className="space-y-1.5">
                <Label htmlFor="cf-options">Options</Label>
                <Textarea
                  id="cf-options"
                  rows={4}
                  value={draft.optionsText}
                  onChange={(e) => setDraft((d) => ({ ...d, optionsText: e.target.value }))}
                  placeholder={"One per line\nFlight\nHotel"}
                />
                {errors.optionsText && <p className="text-xs text-destructive">{errors.optionsText}</p>}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="cf-required"
                checked={draft.required}
                onCheckedChange={(c) => setDraft((d) => ({ ...d, required: c === true }))}
              />
              <Label htmlFor="cf-required" className="font-normal">
                Required when the field is shown
              </Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cf-section">Section</Label>
                <Input
                  id="cf-section"
                  value={draft.section}
                  onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-help">Help text</Label>
                <Input
                  id="cf-help"
                  value={draft.helpText}
                  onChange={(e) => setDraft((d) => ({ ...d, helpText: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <Label>Show only when another field has a value</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={draft.showIfKey || NONE}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, showIfKey: v === NONE ? "" : v, showIfValue: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Always shown</SelectItem>
                    {controllers.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {draft.showIfKey && (
                  <ShowIfValueInput
                    controller={controllerField}
                    value={draft.showIfValue}
                    onChange={(v) => setDraft((d) => ({ ...d, showIfValue: v }))}
                  />
                )}
              </div>
              {errors.showIfValue && <p className="text-xs text-destructive">{errors.showIfValue}</p>}
            </div>

            <RoleChecks
              title="Who can see it"
              hint="None checked means every staff role."
              selected={draft.visibleToRoles}
              onToggle={(r) => toggleRole("visibleToRoles", r)}
            />
            <RoleChecks
              title="Who can change it"
              hint="None checked means every staff role."
              selected={draft.editableByRoles}
              onToggle={(r) => toggleRole("editableByRoles", r)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the field and clears its answers from every lead in {unitName || "this unit"}. It can&apos;t be undone.
              To hide it but keep the answers, turn it off instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete field"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function describeRoles(roles: string[]): string {
  if (roles.length === 0) return "all staff";
  return roles.map((r) => FIELD_ROLES.find((x) => x.value === r)?.label ?? r).join(", ");
}

function RoleChecks({
  title,
  hint,
  selected,
  onToggle,
}: {
  title: string;
  hint: string;
  selected: string[];
  onToggle: (role: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title}</legend>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap gap-4">
        {FIELD_ROLES.map((r) => (
          <div key={r.value} className="flex items-center gap-2">
            <Checkbox
              id={`${title}-${r.value}`}
              checked={selected.includes(r.value)}
              onCheckedChange={() => onToggle(r.value)}
            />
            <Label htmlFor={`${title}-${r.value}`} className="font-normal">
              {r.label}
            </Label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function ShowIfValueInput({
  controller,
  value,
  onChange,
}: {
  controller?: CustomField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (controller?.fieldType === "boolean") {
    return (
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (controller && controller.options.length > 0) {
    return (
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {controller.options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Value" />;
}
