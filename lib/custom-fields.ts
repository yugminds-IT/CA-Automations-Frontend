// Pure helpers for custom lead fields. The server is the source of truth; these keep the form in step with it.
import type { CustomField, CustomFieldType } from './api/custom-fields';

/** Types that offer a fixed list of choices, so they need options. */
export const OPTION_TYPES: readonly CustomFieldType[] = ['select', 'radio', 'multiselect'];

/** Types another field's "show only when" rule can watch. */
export const CONTROLLER_TYPES: readonly CustomFieldType[] = ['select', 'radio', 'multiselect', 'boolean'];

const TYPE_GROUPS: readonly (readonly CustomFieldType[])[] = [
  ['text', 'textarea'],
  ['select', 'radio'],
];

/**
 * The types a saved field can be switched to. Mirrors the server: values stay valid inside a group
 * (a dropdown choice is still a radio choice), anything else could strand existing lead values.
 */
export function convertibleTypes(from: CustomFieldType): CustomFieldType[] {
  const group = TYPE_GROUPS.find((g) => g.includes(from));
  return group ? [...group] : [from];
}

/** Mirrors the server: "Trip date (Dec)" -> "trip_date_dec". Always passes the server's key rules. */
export function keyFromLabel(label: string): string {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  if (!base) return "field";
  return /^[a-z]/.test(base) ? base : `v_${base}`.slice(0, 64);
}

/** Show-if: the controlling field equals the configured value (or contains it, for multiselect). */
export function isFieldShown(
  field: Pick<CustomField, 'showIfKey' | 'showIfValue'>,
  values: Record<string, unknown>,
): boolean {
  if (!field.showIfKey) return true;
  const actual = values[field.showIfKey];
  const expected = field.showIfValue ?? '';
  if (Array.isArray(actual)) return actual.map(String).includes(expected);
  return String(actual ?? '') === expected;
}

/** Groups fields by section, keeping layout order. Hidden fields are included; callers filter. */
export function groupBySection(fields: CustomField[]): Array<{ section: string; fields: CustomField[] }> {
  const groups = new Map<string, CustomField[]>();
  for (const f of [...fields].sort((a, b) => a.position - b.position)) {
    const list = groups.get(f.section) ?? [];
    list.push(f);
    groups.set(f.section, list);
  }
  return [...groups].map(([section, list]) => ({ section, fields: list }));
}

/** Whether a value counts as "filled" for required checks, matching the server. */
export function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Keys the user actually changed, with the value to send (empty string clears on the server). */
export function changedValues(
  original: Record<string, unknown>,
  draft: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(draft)) {
    const before = original[key];
    const after = draft[key];
    if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) out[key] = after ?? '';
  }
  return out;
}
