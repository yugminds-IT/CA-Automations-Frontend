"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, GripVertical, Loader2, Plus, Save, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { FormRenderer } from "@/components/forms/form-renderer";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import {
  FORM_FIELD_TYPES,
  FORM_FIELD_TYPE_LABELS,
  FormField,
  FormFieldRole,
  FormFieldType,
  FormItem,
  listForms,
  updateForm,
} from "@/lib/api/forms";
import { pickerLabel } from "@/lib/unit-structure";
import {
  definitionProblems,
  embedSnippet,
  moveItem,
  newField,
  validateValues,
} from "@/lib/form-builder";

type Values = Record<string, string | boolean>;
const noop = () => () => {};

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Automatic (by type)" },
  { value: "name", label: "Sender name" },
  { value: "email", label: "Sender email" },
  { value: "phone", label: "Sender phone" },
  { value: "message", label: "Message body" },
];

export default function FormBuilderPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { toast } = useToast();

  const [loaded, setLoaded] = useState<FormItem | null | "missing">(null);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [name, setName] = useState("");
  const [unitId, setUnitId] = useState(0);
  const [submitLabel, setSubmitLabel] = useState("Send");
  const [successMessage, setSuccessMessage] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [autoCreateLead, setAutoCreateLead] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [previewValues, setPreviewValues] = useState<Values>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [previewOk, setPreviewOk] = useState(false);

  // Origin is only known in the browser. Read it without an effect so server and client agree on the first render.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");

  const applyForm = useCallback((f: FormItem) => {
    setName(f.name);
    setUnitId(f.businessUnitId);
    setSubmitLabel(f.submitLabel);
    setSuccessMessage(f.successMessage);
    setStatus(f.status);
    setAutoCreateLead(f.autoCreateLead);
    setFields(f.fields);
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    try {
      const [list, unitList] = await Promise.all([listForms(), listBusinessUnits()]);
      setUnits(unitList);
      const found = list.find((f) => f.id === id);
      if (!found) {
        setLoaded("missing");
        return;
      }
      setLoaded(found);
      applyForm(found);
    } catch (err) {
      toast({ title: "Could not load form", description: err instanceof Error ? err.message : "", variant: "destructive" });
      setLoaded("missing");
    }
  }, [id, applyForm, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const edit = (fn: () => void) => {
    fn();
    setDirty(true);
  };

  const updateField = (index: number, patch: Partial<FormField>) =>
    edit(() => setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f))));

  const addField = (type: FormFieldType) => {
    const next = [...fields, newField(type, fields.map((f) => f.key))];
    setFields(next);
    setOpenIndex(next.length - 1);
    setDirty(true);
  };

  const removeField = (index: number) =>
    edit(() => {
      setFields((prev) => prev.filter((_, i) => i !== index));
      setOpenIndex(null);
    });

  const moveField = (from: number, to: number) =>
    edit(() => {
      setFields((prev) => moveItem(prev, from, to));
      setOpenIndex(null);
    });

  const handleSave = async () => {
    if (loaded === null || loaded === "missing") return;
    if (!name.trim()) {
      toast({ title: "Name the form first", variant: "destructive" });
      return;
    }
    const problems = definitionProblems(fields);
    if (problems.length > 0) {
      toast({ title: "Fix the form before saving", description: problems[0], variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const saved = await updateForm(loaded.id, {
        name: name.trim(),
        businessUnitId: unitId || undefined,
        fields,
        submitLabel: submitLabel.trim() || "Send",
        successMessage: successMessage.trim() || undefined,
        status,
        autoCreateLead,
      });
      setLoaded(saved);
      applyForm(saved);
      toast({ title: "Form saved", variant: "success" });
    } catch (err) {
      toast({ title: "Could not save form", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onPreviewSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validateValues(fields, previewValues);
    setPreviewErrors(errors);
    setPreviewOk(Object.keys(errors).length === 0);
  };

  if (loaded === null) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (loaded === "missing") {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-muted-foreground">This form was not found.</p>
        <Link href="/forms" className="text-sm underline">Back to forms</Link>
      </div>
    );
  }

  const publicUrl = `${origin}/f/${loaded.slug}`;
  const problems = definitionProblems(fields);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${what} copied`, variant: "success" });
    } catch {
      toast({ title: "Copy failed", description: text, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/forms" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{name || "Untitled form"}</h1>
            <p className="text-sm text-muted-foreground">
              {dirty ? "Unsaved changes" : "All changes saved"}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Save form
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fields</CardTitle>
              <CardDescription>Drag to reorder. Click a field to edit it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">No fields yet. Add one below.</p>
              )}
              {fields.map((f, i) => (
                <div
                  key={`${f.key}-${i}`}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null) moveField(dragFrom, i);
                    setDragFrom(null);
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  className="rounded-md border bg-background"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => setOpenIndex(openIndex === i ? null : i)}
                      aria-expanded={openIndex === i}
                    >
                      <span className="truncate text-sm font-medium">{f.label || "Untitled"}</span>
                      <Badge variant="outline" className="text-[10px]">{FORM_FIELD_TYPE_LABELS[f.type]}</Badge>
                      {f.required && <Badge className="text-[10px]">Required</Badge>}
                      <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`} />
                    </button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => moveField(i, i - 1)} aria-label="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === fields.length - 1} onClick={() => moveField(i, i + 1)} aria-label="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => removeField(i)} aria-label="Remove field">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {openIndex === i && (
                    <div className="grid gap-3 border-t px-3 py-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs font-semibold">Label</Label>
                        <Input
                          className="mt-1 text-sm"
                          value={f.label}
                          onChange={(e) => updateField(i, { label: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Key (used in exports)</Label>
                        <Input
                          className="mt-1 font-mono text-sm"
                          value={f.key}
                          onChange={(e) => updateField(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">Starts with a letter. Changing it does not rename old answers.</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Answer type</Label>
                        <select
                          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={f.type}
                          onChange={(e) => updateField(i, { type: e.target.value as FormFieldType, options: e.target.value === "select" ? f.options ?? ["Option 1"] : undefined })}
                        >
                          {FORM_FIELD_TYPES.map((t) => (
                            <option key={t} value={t}>{FORM_FIELD_TYPE_LABELS[t]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Stores as</Label>
                        <select
                          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={f.role ?? ""}
                          onChange={(e) => updateField(i, { role: (e.target.value || null) as FormFieldRole | null })}
                        >
                          {ROLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <p className="mt-1 text-[11px] text-muted-foreground">Sender name, email, phone or message fill the lead and the inbox.</p>
                      </div>
                      {f.type === "select" && (
                        <div className="sm:col-span-2">
                          <Label className="text-xs font-semibold">Options (one per line)</Label>
                          <textarea
                            className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={(f.options ?? []).join("\n")}
                            onChange={(e) => updateField(i, { options: e.target.value.split("\n") })}
                          />
                        </div>
                      )}
                      {["text", "textarea", "email", "phone", "number", "date"].includes(f.type) && (
                        <div>
                          <Label className="text-xs font-semibold">Placeholder</Label>
                          <Input className="mt-1 text-sm" value={f.placeholder ?? ""} onChange={(e) => updateField(i, { placeholder: e.target.value })} />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <Label className="text-xs font-semibold">Required</Label>
                        <Switch checked={f.required} onCheckedChange={(v) => updateField(i, { required: v })} aria-label="Required" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-2">
                {FORM_FIELD_TYPES.map((t) => (
                  <Button key={t} variant="outline" size="sm" className="h-8 text-xs" onClick={() => addField(t)}>
                    <Plus className="mr-1 h-3 w-3" /> {FORM_FIELD_TYPE_LABELS[t]}
                  </Button>
                ))}
              </div>
              {problems.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  {problems.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>This is what visitors see. Nothing is sent from here.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-xl">
              <FormRenderer
                fields={fields}
                values={previewValues}
                errors={previewErrors}
                onChange={(k, v) => setPreviewValues((p) => ({ ...p, [k]: v }))}
                onSubmit={onPreviewSubmit}
                submitLabel={submitLabel || "Send"}
              />
              {previewOk && <p className="mt-3 text-sm text-emerald-700">{successMessage || "Looks good. Visitors would see your success message here."}</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Form name</Label>
                <Input className="mt-1 text-sm" value={name} onChange={(e) => edit(() => setName(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Business unit</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={String(unitId)}
                  onChange={(e) => edit(() => setUnitId(Number(e.target.value)))}
                >
                  {units.filter((u) => u.isActive || u.id === unitId).map((u) => (
                    <option key={u.id} value={String(u.id)}>{pickerLabel(u, units)}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Button text</Label>
                <Input className="mt-1 text-sm" value={submitLabel} onChange={(e) => edit(() => setSubmitLabel(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Thank-you message</Label>
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={successMessage}
                  onChange={(e) => edit(() => setSuccessMessage(e.target.value))}
                  placeholder="Thank you! We have received your details."
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <Label className="text-xs font-semibold">Accepting responses</Label>
                  <p className="text-xs text-muted-foreground">Off hides the form from visitors.</p>
                </div>
                <Switch checked={status === "active"} onCheckedChange={(v) => edit(() => setStatus(v ? "active" : "archived"))} aria-label="Accepting responses" />
              </div>
              <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <Label className="text-xs font-semibold">Create a lead for each response</Label>
                  <p className="text-xs text-muted-foreground">Same email or phone as an existing lead is added to it.</p>
                </div>
                <Switch checked={autoCreateLead} onCheckedChange={(v) => edit(() => setAutoCreateLead(v))} aria-label="Create a lead for each response" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Share</CardTitle>
              <CardDescription>Link to the hosted page, or embed it on your website.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {origin ? (
                <>
                  <div>
                    <Label className="text-xs font-semibold">Link</Label>
                    <div className="mt-1 flex gap-2">
                      <Input readOnly className="font-mono text-xs" value={publicUrl} />
                      <Button variant="outline" size="icon" onClick={() => copy(publicUrl, "Link")} aria-label="Copy link">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Embed code</Label>
                    <textarea
                      readOnly
                      className="mt-1 min-h-[88px] w-full rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-xs"
                      value={embedSnippet(publicUrl, name || "Form")}
                    />
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => copy(embedSnippet(publicUrl, name || "Form"), "Embed code")}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy embed code
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Loading link…</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
