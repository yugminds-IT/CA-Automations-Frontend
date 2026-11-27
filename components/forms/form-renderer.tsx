"use client";

import type { FormEvent } from "react";
import type { FormField } from "@/lib/api/forms";

export type RenderableField = FormField & { options?: string[]; placeholder?: string };

const CONTROL =
  "flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 aria-[invalid=true]:border-red-500";

const INPUT_TYPE: Partial<Record<FormField["type"], string>> = {
  text: "text",
  email: "email",
  phone: "tel",
  number: "number",
  date: "date",
};

interface Props {
  fields: RenderableField[];
  values: Record<string, string | boolean>;
  errors: Record<string, string>;
  onChange: (key: string, value: string | boolean) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  submitting?: boolean;
}

/** Draws a form's fields. Used on the hosted page and in the builder preview. */
export function FormRenderer({ fields, values, errors, onChange, onSubmit, submitLabel, submitting }: Props) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {fields.map((f) => {
        const id = `ff-${f.key}`;
        const error = errors[f.key];
        const label = (
          <span className="mb-1 block text-sm font-medium text-zinc-800">
            {f.label}
            {f.required && <span className="text-red-600"> *</span>}
          </span>
        );
        const err = error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null;
        const str = typeof values[f.key] === "string" ? (values[f.key] as string) : "";

        if (f.type === "checkbox") {
          return (
            <div key={f.key}>
              <label htmlFor={id} className="flex items-start gap-2 text-sm text-zinc-800">
                <input
                  id={id}
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={values[f.key] === true}
                  onChange={(e) => onChange(f.key, e.target.checked)}
                  aria-invalid={Boolean(error)}
                />
                <span>
                  {f.label}
                  {f.required && <span className="text-red-600"> *</span>}
                </span>
              </label>
              {err}
            </div>
          );
        }

        if (f.type === "textarea") {
          return (
            <div key={f.key}>
              <label htmlFor={id}>{label}</label>
              <textarea
                id={id}
                rows={4}
                className={CONTROL}
                value={str}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.key, e.target.value)}
                aria-invalid={Boolean(error)}
              />
              {err}
            </div>
          );
        }

        if (f.type === "select") {
          return (
            <div key={f.key}>
              <label htmlFor={id}>{label}</label>
              <select
                id={id}
                className={CONTROL}
                value={str}
                onChange={(e) => onChange(f.key, e.target.value)}
                aria-invalid={Boolean(error)}
              >
                <option value="">Select…</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              {err}
            </div>
          );
        }

        return (
          <div key={f.key}>
            <label htmlFor={id}>{label}</label>
            <input
              id={id}
              type={INPUT_TYPE[f.type] ?? "text"}
              className={CONTROL}
              value={str}
              placeholder={f.placeholder}
              onChange={(e) => onChange(f.key, e.target.value)}
              aria-invalid={Boolean(error)}
            />
            {err}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {submitting ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
