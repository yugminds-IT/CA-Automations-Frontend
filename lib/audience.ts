// Picking recipients at scale: rules over contact fields, and pasted address lists (see audience.test.ts).

export const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/

/** `custom:<key>` is an org custom field (custom variable) */
export type ChoiceField = 'businessType' | 'service' | 'status' | 'city' | 'state' | 'tags' | `custom:${string}`
export type ChoiceOp = 'any' | 'none' | 'empty' | 'filled'
export type DateField = 'followUp' | 'onboard'
export type Rule =
  | { id: string; field: ChoiceField; op: ChoiceOp; values: string[] }
  /**
   * next: today..today+N · last: today-N..today · overdue: before today · older: more than N days ago
   * on: exactly N days from today · ago: exactly N days ago · yearly: anniversary falls N days from today
   */
  | { id: string; field: DateField; op: DateOp; days: number }

export type DateOp = 'next' | 'last' | 'overdue' | 'older' | 'on' | 'ago' | 'yearly'

/** The fields rules read. Dates are YYYY-MM-DD. */
export interface RuleTarget {
  businessType?: string
  services?: { name: string }[]
  status?: string
  city?: string
  state?: string
  followUpOn?: string
  onboardedOn?: string
  tags?: string[]
  /** This contact's own custom field values, by key (defaults not applied) */
  custom?: Record<string, string>
}

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase()

export function choiceValues(c: RuleTarget, field: ChoiceField): string[] {
  if (field === 'service') return (c.services ?? []).map((s) => s.name)
  if (field === 'tags') return c.tags ?? []
  const v = field.startsWith('custom:') ? c.custom?.[field.slice(7)] : c[field as 'status']
  return v?.trim() ? [v.trim()] : []
}

/** Whole days from today to the date (negative = past). Null when there is no date. */
function daysFrom(today: string, date: string | undefined): number | null {
  if (!date) return null
  const ms = Date.parse(date.slice(0, 10)) - Date.parse(today)
  return Number.isNaN(ms) ? null : Math.round(ms / 86_400_000)
}

/** Every rule must hold (AND). An "any of"/"none of" rule with nothing picked yet is ignored. */
export function matchesRules(c: RuleTarget, rules: Rule[], today = new Date().toLocaleDateString('en-CA')): boolean {
  return rules.every((r) => {
    if ('days' in r) {
      const d = daysFrom(today, r.field === 'followUp' ? c.followUpOn : c.onboardedOn)
      if (d === null) return false
      const n = Math.max(0, r.days)
      if (r.op === 'next') return d >= 0 && d <= n
      if (r.op === 'last') return d <= 0 && d >= -n
      if (r.op === 'overdue') return d < 0
      if (r.op === 'on') return d === n
      if (r.op === 'ago') return d === -n
      if (r.op === 'yearly') {
        const date = (r.field === 'followUp' ? c.followUpOn : c.onboardedOn)!.slice(5, 10)
        const target = new Date(Date.parse(today) + n * 86_400_000).toISOString().slice(5, 10)
        return d <= 0 && date === target
      }
      return d < -n
    }
    const have = choiceValues(c, r.field)
    if (r.op === 'empty') return have.length === 0
    if (r.op === 'filled') return have.length > 0
    if (r.values.length === 0) return true
    const wanted = new Set(r.values.map(norm))
    const hit = have.some((v) => wanted.has(norm(v)))
    return r.op === 'any' ? hit : !hit
  })
}

export interface ParsedAddresses {
  /** Lower-cased, first occurrence kept, in paste order */
  valid: string[]
  invalid: string[]
  duplicates: number
}

/** Rules without their UI ids, as the server takes and stores them. */
export function plainRules(rules: Rule[]): { field: string; op: string; values?: string[]; days?: number }[] {
  return rules.map((r) => ('days' in r ? { field: r.field, op: r.op, days: r.days } : { field: r.field, op: r.op, values: r.values }))
}

/** Saved rules back into editable ones */
export function toRules(saved: { field: string; op: string; values?: string[]; days?: number }[]): Rule[] {
  return saved.map((r) => (r.days != null
    ? { id: crypto.randomUUID(), field: r.field, op: r.op, days: r.days }
    : { id: crypto.randomUUID(), field: r.field, op: r.op, values: r.values ?? [] }) as Rule)
}

export const sameRules = (a: Rule[], b: Rule[]) => JSON.stringify(plainRules(a)) === JSON.stringify(plainRules(b))

/** Pasted text: one per line, or separated by commas, semicolons, tabs or spaces; "Name <a@b.com>" works. */
export function parseAddresses(text: string): ParsedAddresses {
  const seen = new Set<string>()
  const out: ParsedAddresses = { valid: [], invalid: [], duplicates: 0 }
  for (const piece of text.split(/[\n\r,;\t]+/)) {
    const p = piece.trim()
    if (!p) continue
    const angled = p.match(/<([^>]*)>/)
    const tokens = angled ? [angled[1]] : p.includes('@') ? p.split(/\s+/) : [p]
    for (const t of tokens) {
      const email = t.trim().replace(/^mailto:/i, '').replace(/^["'(]+|["')]+$/g, '').toLowerCase()
      if (!email) continue
      if (!EMAIL_RE.test(email)) out.invalid.push(t.trim())
      else if (seen.has(email)) out.duplicates++
      else { seen.add(email); out.valid.push(email) }
    }
  }
  return out
}
