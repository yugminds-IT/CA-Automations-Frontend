/**
 * Send Mails draft: the audience and message, autosaved on the server (see lib/api drafts) so a refresh,
 * a closed tab or another computer doesn't lose a long email. Every email is its own draft.
 * The localStorage helpers below only move a draft saved by the old one-per-browser version to the server.
 */
import type { AttachmentsState } from './attachments-panel'
import type { Rule } from '@/lib/audience'

export type Audience = 'all' | 'filtered' | 'pick' | null

export interface SendDraft {
  v: 1
  savedAt: number
  audience: Audience
  /** "A group" conditions; older drafts saved categories/services instead */
  rules?: Rule[]
  categories?: string[]
  services?: string[]
  /** Only for "Choose one by one"; the other audiences are recomputed from the client list */
  pickedIds: (string | number)[]
  /** Unticked from "All" or "A group" */
  excludedIds?: (string | number)[]
  customRecipients: string
  cc: string
  bcc: string
  templateId: number | null
  subject: string
  body: string
  sendValues: Record<string, string>
  attachments: AttachmentsState | null
}

const keyFor = (userId: unknown) => `lekvya:send-mails-draft:${userId ?? 'me'}`

export function loadDraft(userId: unknown): SendDraft | null {
  try {
    const d = JSON.parse(localStorage.getItem(keyFor(userId)) ?? 'null')
    return d?.v === 1 ? { ...d, attachments: d.attachments && !Array.isArray(d.attachments) ? d.attachments : null } : null
  } catch {
    return null
  }
}

export function clearDraft(userId: unknown) {
  try { localStorage.removeItem(keyFor(userId)) } catch { /* ignore */ }
}

const text = (html: string) => html.replace(/<[^>]*>|&nbsp;/g, ' ').replace(/\{\{\s*client_name\s*\}\}|Dear|,/g, '').trim()

/** Nothing worth keeping: no audience, no extra addresses, no subject, only the default greeting, no files. */
export function isEmptyDraft(d: Omit<SendDraft, 'v' | 'savedAt'>): boolean {
  return !d.audience && !d.customRecipients.trim() && !d.subject.trim() && !text(d.body) && !d.attachments?.shared.length && !d.attachments?.perClient.length
}
