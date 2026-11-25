// Pure helpers for the Send Mails composer (see send-mails-utils.test.ts).
import { substituteTokens } from '@/lib/utils/email-template'
import { formatDate } from '@/lib/template-variables'


export interface ClientItem {
  id: string | number
  name: string
  email: string
  companyName: string
  businessType?: string
  city?: string
  state?: string
  status?: string
  phone?: string | null
  services?: { id: number; name: string; description?: string }[]
  panNumber?: string
  gstNumber?: string
  address?: string
  /** formatted, e.g. "15 December 2026" */
  followUpDate?: string
  onboardDate?: string
  /** raw YYYY-MM-DD, for audience rules */
  followUpOn?: string
  onboardedOn?: string
  tags?: string[]
  additionalNotes?: string
  directors?: { name: string; designation?: string }[]
}

const isoDay = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined)

export function transformClient(raw: any): ClientItem {
  const bt = raw.businessType ?? raw.business_type
  const businessType =
    typeof bt === 'object' && bt !== null && 'name' in bt
      ? (bt as { name: string }).name
      : typeof bt === 'string' ? bt : undefined
  const services = Array.isArray(raw.services)
    ? raw.services.map((s: any) => ({ id: s.id, name: s.name ?? '', ...(s.description ? { description: s.description } : {}) })).filter((s: any) => s.name)
    : undefined
  const directors = Array.isArray(raw.directors)
    ? raw.directors.map((d: any) => ({ name: d.directorName ?? d.name ?? '', designation: d.designation ?? undefined })).filter((d: any) => d.name)
    : undefined
  return {
    id: raw.id,
    name: raw.name ?? raw.client_name ?? '',
    email: raw.email ?? '',
    companyName: raw.companyName ?? raw.company_name ?? '',
    businessType,
    city: raw.city ?? undefined,
    state: raw.state ?? undefined,
    status: raw.status ?? undefined,
    phone: raw.phone ?? raw.phone_number ?? null,
    services,
    // fields variables are built from (previously dropped, so {{due_date}} etc. were always blank)
    panNumber: raw.panNumber ?? raw.pan_number ?? undefined,
    gstNumber: raw.gstNumber ?? raw.gst_number ?? undefined,
    address: raw.address ?? undefined,
    followUpDate: formatDate(raw.followupDate ?? raw.followUpDate ?? raw.follow_up_date) || undefined,
    onboardDate: formatDate(raw.onboardDate ?? raw.onboard_date) || undefined,
    followUpOn: isoDay(raw.followupDate ?? raw.followUpDate ?? raw.follow_up_date),
    onboardedOn: isoDay(raw.onboardDate ?? raw.onboard_date),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    additionalNotes: raw.additionalNotes ?? raw.additional_notes ?? undefined,
    directors,
  }
}

/** Sender/org values from the logged-in user (the server re-fills these authoritatively when sending). */
export function orgVariables(user: any): Record<string, string> {
  return {
    org_name: user?.organization?.name ?? user?.org_name ?? '',
    org_admin_name: user?.name ?? user?.full_name ?? '',
    org_email: user?.organization?.email ?? user?.org_email ?? user?.email ?? '',
    org_phone: user?.organization?.phone ?? user?.org_phone ?? user?.phone ?? '',
  }
}

/** Every client-sourced variable for one client: catalog fields + the industry's own fields. */
export function clientVariables(
  c: ClientItem,
  industry: { resolveClientVars: (client: any, user: any) => Record<string, string> },
  user: any,
  custom: Record<string, string> = {},
): Record<string, string> {
  const base: Record<string, string> = {
    client_name: c.name ?? '',
    client_email: c.email ?? '',
    client_phone: c.phone ?? '',
    company_name: c.companyName ?? '',
    client_city: c.city ?? '',
    pan_number: c.panNumber ?? '',
    gst_number: c.gstNumber ?? '',
    service_name: c.services?.[0]?.name ?? '',
    service_description: c.services?.[0]?.description ?? '',
    follow_up_date: c.followUpDate ?? '',
    onboard_date: c.onboardDate ?? '',
    additional_notes: c.additionalNotes ?? '',
  }
  // industry values only fill gaps; they never blank a base value
  for (const [k, v] of Object.entries(industry.resolveClientVars(c, user))) if (v || !(k in base)) base[k] = v
  return { ...custom, ...base } // built-in fields can't be shadowed by a custom one
}

/** Replace {{ var }} tokens with plain-text values (unknown -> ''). Use only where the result is rendered as text. */
export function substituteVars(text: string, vars: Record<string, string>): string {
  return substituteTokens(text, vars, false)
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Replace {{var}} tokens inside HTML, escaping the values so client data cannot inject markup. */
export function substituteVarsHtml(html: string, vars: Record<string, string>): string {
  return substituteTokens(html, vars, true)
}

/** Strip variable-chip spans and substitute values, then resolve remaining {{}} tokens (HTML-safe). */
export function cleanAndSubstituteVars(html: string, vars: Record<string, string>): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('span[contenteditable="false"]').forEach((span) => {
    span.replaceWith(document.createTextNode(substituteVars((span as HTMLElement).dataset.var ?? span.textContent ?? '', vars)))
  })
  return substituteVarsHtml(tmp.innerHTML, vars)
}
/** Strip variable-chip spans back to their {{var}} text without substituting — backend resolves all variables */
export function stripChips(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('span[contenteditable="false"]').forEach((span) => {
    span.replaceWith(document.createTextNode((span as HTMLElement).dataset.var ?? span.textContent ?? ''))
  })
  return tmp.innerHTML
}

/** Plain text of a one-line tag editor: chips become their {{token}}, nbsp becomes a space */
export function chipText(el: HTMLElement): string {
  return stripChips(el.innerHTML).replace(/<[^>]*>/g, '').replace(/&nbsp;| /g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&')
}

/** Inline variable tag (mention-style dark gray text; label visible, {{token}} kept in data-var) */
export const VAR_CHIP_CLASS =
  'inline px-1 rounded bg-slate-200 text-slate-800 font-semibold select-none cursor-default dark:bg-slate-700 dark:text-slate-100'

/** Same tag for a variable that isn't in the catalog (typo or custom value asked for when sending). */
export const VAR_CHIP_CUSTOM_CLASS =
  'inline px-1 rounded bg-amber-100 text-amber-900 font-semibold select-none cursor-pointer ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-700'

export const FONT_SIZES_SM = ['12', '14', '16', '18', '20', '24', '28', '32']
export const FONT_FAMILIES_SM = ['Default', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana']
