"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CustomField } from "@/lib/api/custom-fields";
import { groupBySection, isFieldShown } from "@/lib/custom-fields";

const NONE = "__none__";

interface Props {
  /** Fields the signed-in role can see (server sets canSee). Order is layout order. */
  fields: CustomField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  /** Show every field read-only, e.g. while saving. */
  disabled?: boolean;
}

function asText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function CustomFieldInputs({ fields, values, onChange, disabled }: Props) {
  const visible = fields.filter((f) => f.isActive && f.canSee && isFieldShown(f, values));
  if (visible.length === 0) return null;
  const groups = groupBySection(visible);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.section} className="space-y-4">
          {groups.length > 1 && (
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.section}</h3>
          )}
          {group.fields.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              value={values[field.key]}
              disabled={disabled || !field.canEdit}
              onChange={(v) => onChange(field.key, v)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function FieldRow({
  field,
  value,
  disabled,
  onChange,
}: {
  field: CustomField;
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}) {
  const id = `cf-${field.key}`;
  const label = (
    <Label htmlFor={id}>
      {field.label}
      {field.required && <span className="text-destructive"> *</span>}
    </Label>
  );
  const help = field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null;

  if (!field.canEdit) {
    return (
      <div className="space-y-1">
        <Label>{field.label}</Label>
        <p className="text-sm">{asText(value) || <span className="text-muted-foreground">Not set</span>}</p>
        {help}
      </div>
    );
  }

  switch (field.fieldType) {
    case "textarea":
      return (
        <div className="space-y-1.5">
          {label}
          <Textarea id={id} value={asText(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      );

    case "number":
      return (
        <div className="space-y-1.5">
          {label}
          <Input
            id={id}
            inputMode="decimal"
            value={asText(value)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
          {help}
        </div>
      );

    case "date":
      return (
        <div className="space-y-1.5">
          {label}
          <Input id={id} type="date" value={asText(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      );

    case "email":
      return (
        <div className="space-y-1.5">
          {label}
          <Input id={id} type="email" value={asText(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      );

    case "url":
      return (
        <div className="space-y-1.5">
          {label}
          <Input id={id} type="url" placeholder="https://" value={asText(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      );

    case "phone":
      return (
        <div className="space-y-1.5">
          {label}
          <Input id={id} type="tel" value={asText(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-start gap-3">
          <Checkbox
            id={id}
            checked={value === true || value === "true"}
            disabled={disabled}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <div className="space-y-1">
            {label}
            {help}
          </div>
        </div>
      );

    case "select":
      return (
        <div className="space-y-1.5">
          {label}
          <Select
            value={asText(value) || NONE}
            disabled={disabled}
            onValueChange={(v) => onChange(v === NONE ? "" : v)}
          >
            <SelectTrigger id={id}>
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not set</SelectItem>
              {field.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {help}
        </div>
      );

    case "radio": {
      const current = asText(value);
      return (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </legend>
          <RadioGroup value={current} disabled={disabled} onValueChange={(v) => onChange(v)} className="gap-2">
            {field.options.map((opt) => {
              const optId = `${id}-${opt}`;
              return (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem id={optId} value={opt} />
                  <Label htmlFor={optId} className="font-normal">
                    {opt}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          {/* A radio group cannot be unset by clicking, so an optional field gets a way to clear it. */}
          {current && !field.required && !disabled && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => onChange("")}
            >
              Clear
            </button>
          )}
          {help}
        </fieldset>
      );
    }

    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </legend>
          <div className="space-y-2">
            {field.options.map((opt) => {
              const checkedId = `${id}-${opt}`;
              return (
                <div key={opt} className="flex items-center gap-2">
                  <Checkbox
                    id={checkedId}
                    checked={selected.includes(opt)}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      onChange(checked === true ? [...selected, opt] : selected.filter((s) => s !== opt))
                    }
                  />
                  <Label htmlFor={checkedId} className="font-normal">
                    {opt}
                  </Label>
                </div>
              );
            })}
          </div>
          {help}
        </fieldset>
      );
    }

    case "text":
    default:
      return (
        <div className="space-y-1.5">
          {label}
          <Input id={id} value={asText(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      );
  }
}
