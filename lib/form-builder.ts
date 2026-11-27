// Pure helpers for the form builder and the hosted form. Rules mirror the backend (form-rules.ts).
import type { FormField, FormFieldType } from './api/forms';

const KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;
const RESERVED = new Set([
  'publicKey', 'apiKey', 'secretKey', 'turnstileToken', 'recaptchaToken', '_honey', '_gotcha', '_notify',
  'notificationEmail', 'notifyEmail', 'formName', 'senderName', 'senderEmail', 'senderPhone', 'fullName',
  'comments', 'query', 'name', 'email', 'phone', 'message',
]);

const DEFAULT_LABEL: Record<FormFieldType, string> = {
  text: 'Your name',
  textarea: 'Message',
  email: 'Email',
  phone: 'Phone',
  number: 'Number',
  select: 'Choose one',
  checkbox: 'I agree',
  date: 'Date',
};

/** "Full name (as per PAN)" -> "full_name_as_per_pan". Always starts with a letter. */
export function keyFromText(label: string): string {
  let base = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36);
  if (!base || !/^[a-z]/.test(base)) base = `f_${base}`.replace(/_+$/, '');
  return base.slice(0, 40);
}

/** A key not used by any other field. Reserved words get a suffix too. */
export function uniqueKey(base: string, taken: string[]): string {
  const used = new Set(taken);
  let key = base;
  let n = 2;
  while (used.has(key) || RESERVED.has(key)) {
    key = `${base.slice(0, 36)}_${n}`;
    n += 1;
  }
  return key;
}

export function newField(type: FormFieldType, takenKeys: string[], label?: string): FormField {
  const text = (label ?? DEFAULT_LABEL[type]).trim() || DEFAULT_LABEL[type];
  return {
    key: uniqueKey(keyFromText(text), takenKeys),
    label: text,
    type,
    required: false,
    options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
    placeholder: '',
    role: null,
  };
}

/** Problems with the definition, same rules as the server. Empty list means it can be saved. */
export function definitionProblems(fields: FormField[]): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();
  const roles = new Set<string>();
  for (const f of fields) {
    if (!f.label.trim()) problems.push('Every field needs a label');
    if (!KEY_PATTERN.test(f.key)) {
      problems.push(`"${f.label}": key must start with a letter and use only lowercase letters, digits and underscores`);
    }
    const role = f.role ?? (f.type === 'email' ? 'email' : f.type === 'phone' ? 'phone' : null);
    if (role) {
      if (roles.has(role)) problems.push(`Only one field can be the ${role}`);
      roles.add(role);
    } else if (RESERVED.has(f.key)) {
      problems.push(`"${f.label}": "${f.key}" is reserved, change its key`);
    }
    if (keys.has(f.key)) problems.push(`Two fields use the key "${f.key}"`);
    keys.add(f.key);
    if (f.type === 'select' && !(f.options ?? []).some((o) => o.trim())) {
      problems.push(`"${f.label}": add at least one option`);
    }
  }
  return problems;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Errors for the visitor's answers, keyed by field key. Mirrors the server's checks. */
export function validateValues(fields: FormField[], values: Record<string, string | boolean>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = values[f.key];
    if (f.type === 'checkbox') {
      if (f.required && raw !== true) errors[f.key] = 'Please tick this box';
      continue;
    }
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!text) {
      if (f.required) errors[f.key] = 'Required';
      continue;
    }
    if (f.type === 'email' && !EMAIL_RE.test(text)) errors[f.key] = 'Enter a valid email address';
    if (f.type === 'phone' && (!/^[+()\d\s-]{6,32}$/.test(text) || text.replace(/\D/g, '').length < 6)) {
      errors[f.key] = 'Enter a valid phone number';
    }
    if (f.type === 'number' && !Number.isFinite(Number(text))) errors[f.key] = 'Enter a number';
    if (f.type === 'select' && !(f.options ?? []).includes(text)) errors[f.key] = 'Choose one of the options';
    if (f.type === 'date' && (!DATE_RE.test(text) || Number.isNaN(Date.parse(text)))) errors[f.key] = 'Enter a valid date';
  }
  return errors;
}

/** The JSON body to send: trimmed text, real booleans for tick boxes, empty optional answers left out. */
export function payloadFrom(fields: FormField[], values: Record<string, string | boolean>): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const f of fields) {
    const raw = values[f.key];
    if (f.type === 'checkbox') out[f.key] = raw === true;
    else if (typeof raw === 'string' && raw.trim()) out[f.key] = raw.trim();
  }
  return out;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function embedSnippet(url: string, title: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<iframe src="${esc(url)}" title="${esc(title)}" width="100%" height="640" style="border:0;max-width:640px"></iframe>`;
}
