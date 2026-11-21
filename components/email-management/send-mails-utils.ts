// Pure helpers for the Send Mails composer (see send-mails-utils.test.ts).

export type ScheduleMode = 'single_date' | 'date_range' | 'multiple_dates' | 'all_dates' | 'daily' | 'weekly' | 'monthly'

export interface ClientItem {
  id: string | number
  name: string
  email: string
  companyName: string
  businessType?: string
  city?: string
  status?: string
  phone?: string | null
  services?: { id: number; name: string }[]
}

export function transformClient(raw: any): ClientItem {
  const bt = raw.businessType ?? raw.business_type
  const businessType =
    typeof bt === 'object' && bt !== null && 'name' in bt
      ? (bt as { name: string }).name
      : typeof bt === 'string' ? bt : undefined
  const services = Array.isArray(raw.services)
    ? raw.services.map((s: any) => ({ id: s.id, name: s.name ?? '' })).filter((s: any) => s.name)
    : undefined
  return {
    id: raw.id,
    name: raw.name ?? raw.client_name ?? '',
    email: raw.email ?? '',
    companyName: raw.companyName ?? raw.company_name ?? '',
    businessType,
    city: raw.city ?? undefined,
    status: raw.status ?? undefined,
    phone: raw.phone ?? raw.phone_number ?? null,
    services,
  }
}

/** Replace {{var}} tokens with plain-text values. Use only where the result is rendered as text. */
export function substituteVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Replace {{var}} tokens inside HTML, escaping the values so client data cannot inject markup. */
export function substituteVarsHtml(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? ''))
}

/** Strip variable-chip spans and substitute values, then resolve remaining {{}} tokens (HTML-safe). */
export function cleanAndSubstituteVars(html: string, vars: Record<string, string>): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('span[contenteditable="false"]').forEach((span) => {
    span.replaceWith(document.createTextNode(substituteVars(span.textContent ?? '', vars)))
  })
  return substituteVarsHtml(tmp.innerHTML, vars)
}

/** Strip variable-chip spans back to their {{var}} text without substituting — backend resolves all variables */
export function stripChips(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('span[contenteditable="false"]').forEach((span) => {
    span.replaceWith(document.createTextNode(span.textContent ?? ''))
  })
  return tmp.innerHTML
}

export const FONT_SIZES_SM = ['12', '14', '16', '18', '20', '24', '28', '32']
export const FONT_FAMILIES_SM = ['Default', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana']
