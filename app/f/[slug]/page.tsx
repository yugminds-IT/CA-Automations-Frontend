"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { FormRenderer } from "@/components/forms/form-renderer";
import { getPublicForm, submitPublicForm, type PublicForm } from "@/lib/api/forms";
import { payloadFrom, validateValues } from "@/lib/form-builder";

type Values = Record<string, string | boolean>;

/** Public hosted form. No sign-in. Shares the intake path with every other form. */
export default function HostedFormPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [honey, setHoney] = useState("");

  useEffect(() => {
    let cancelled = false;
    getPublicForm(slug)
      .then((f) => {
        if (!cancelled) setForm(f);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message || "This form is not available.");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const onChange = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form) return;
    const problems = validateValues(form.fields, values);
    setErrors(problems);
    setFormError(null);
    if (Object.keys(problems).length > 0) return;

    setSubmitting(true);
    try {
      const body = { ...payloadFrom(form.fields, values), _honey: honey };
      const res = await submitPublicForm(slug, body);
      setDone(res.message || form.successMessage);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {loadError ? (
          <p className="text-sm text-zinc-600">{loadError}</p>
        ) : !form ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : done ? (
          <div className="py-8 text-center">
            <p className="text-base font-medium text-zinc-900">{done}</p>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-zinc-900">{form.name}</h1>
            {form.organizationName && (
              <p className="mb-5 text-xs text-zinc-500">{form.organizationName}</p>
            )}
            <FormRenderer
              fields={form.fields}
              values={values}
              errors={errors}
              onChange={onChange}
              onSubmit={onSubmit}
              submitLabel={form.submitLabel}
              submitting={submitting}
            />
            {/* Honeypot: hidden from people, filled in by bots. */}
            <input
              type="text"
              name="_honey"
              value={honey}
              onChange={(e) => setHoney(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
            />
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          </>
        )}
      </div>
    </main>
  );
}
