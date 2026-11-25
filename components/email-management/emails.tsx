'use client'

// Scheduled Mails: one row per email (every time slot, monthly repeat and resend of it share a batch),
// with Drafts, Scheduled and Sent tabs and a detail panel showing what happened to each recipient.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, FileText, Inbox, Loader2, Pause, Pencil, Play, RotateCcw, Search, Send, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LekvyaLoader } from '@/components/ui/lekvya-loader'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useRealtimeEvent } from '@/lib/realtime'
import { renderEmailPreview } from '@/lib/utils/email-template'
import { toRules } from '@/lib/audience'
import {
  cancelSchedule, createDraft, deleteDraft, deleteRecurringSchedule, getDeliveries, listDrafts, listRecurringSchedules,
  listSchedules, resendFailed, startRecurringSchedule, stopRecurringSchedule, type Delivery, type ServerDraft,
} from '@/lib/api/mail-management'
import type { MailAttachment, RecurringSchedule } from '@/lib/api/types'
import type { SendDraft } from './send-mails-draft'
import { describeRepeat } from '@/lib/schedule-rule'
import { NO_ATTACHMENTS } from './attachments-panel'

/** One time an email goes out (a row of email_schedules) */
export interface SendRow {
  id: number
  batchId?: string | null
  templateId?: number | null
  template?: { name?: string; subject?: string; body?: string } | null
  subject?: string | null
  body?: string | null
  recipientEmails: string[]
  recipientVariables?: Record<string, Record<string, string>> | null
  variables?: Record<string, string> | null
  attachments?: MailAttachment[] | null
  cc?: string | null
  bcc?: string | null
  segment?: {
    label?: string | null
    rules: { field: string; op: string; values?: string[]; days?: number }[]
    excludeIds?: number[]
    resolvedAt?: string
    matched?: number
  } | null
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled'
  progress?: number
  scheduledAt: string
  sentAt?: string | null
  errorMessage?: string | null
}

/** Everything that belongs to one email */
export interface EmailGroup {
  key: string
  sends: SendRow[]
  repeats: RecurringSchedule[]
  upcoming: boolean
  next: number | null
  last: number | null
  problems: boolean
}

type Tab = 'drafts' | 'scheduled' | 'sent'
const PAGE = 50
const POLL_MS = 30_000

/** Server times may come without a zone; they are UTC */
export function toMs(val: string | null | undefined): number {
  if (!val) return NaN
  let s = String(val).trim().replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T').replace(/(\.\d{3})\d+/, '$1')
  if (!/Z$|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z'
  return new Date(s).getTime()
}
const when = (ms: number | null) => (ms == null || Number.isNaN(ms) ? '—'
  : new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }))
const humanVars = (s: string) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => `[${k.replace(/_/g, ' ')}]`)
const isWaiting = (s: SendRow) => s.status === 'pending' || s.status === 'sending'
/** Gone wrong or cancelled, nothing left to send: can be taken off the list */
const isRemovable = (g: EmailGroup) => !g.upcoming && g.sends.length > 0 && g.sends.every((s) => s.status === 'failed' || s.status === 'cancelled')
/** Words to search in: title, subject, recipients, group */
const haystack = (g: EmailGroup) => {
  const m = messageOf(g)
  return [m.title, m.subject, toLabel(g), ...recipientsOf(g)].join(' ').toLowerCase()
}
/** A note that only says some addresses were skipped is not a problem */
const hasProblem = (s: SendRow) => s.status === 'failed' || (s.status === 'sent' && !!s.errorMessage && !/^Skipped \d+ /.test(s.errorMessage))

export function groupEmails(sends: SendRow[], repeats: RecurringSchedule[]): EmailGroup[] {
  const m = new Map<string, EmailGroup>()
  const at = (key: string) => {
    let g = m.get(key)
    if (!g) m.set(key, (g = { key, sends: [], repeats: [], upcoming: false, next: null, last: null, problems: false }))
    return g
  }
  for (const s of sends) at(s.batchId ?? `s${s.id}`).sends.push(s)
  for (const r of repeats) at(r.batchId ?? `r${r.id}`).repeats.push(r)
  for (const g of m.values()) {
    g.sends.sort((a, b) => toMs(a.scheduledAt) - toMs(b.scheduledAt))
    const waiting = g.sends.filter(isWaiting)
    g.upcoming = waiting.length > 0 || g.repeats.some((r) => r.status === 'active')
    g.next = waiting.length ? toMs(waiting[0].scheduledAt) : null
    const done = g.sends.filter((s) => s.status === 'sent' || s.status === 'failed')
    g.last = done.length ? Math.max(...done.map((s) => toMs(s.sentAt ?? s.scheduledAt))) : null
    g.problems = g.sends.some(hasProblem)
  }
  return [...m.values()]
}

/** The message, from a send or (for monthly emails that haven't gone out yet) the repeat */
export function messageOf(g: EmailGroup) {
  const s = g.sends[0]
  const r = g.repeats[0]
  const template = s?.template ?? r?.template ?? null
  const first = s?.recipientEmails[0]
  return {
    templateId: s?.templateId ?? r?.templateId ?? null,
    title: humanVars(template?.name ?? s?.subject ?? r?.subject ?? 'Email'),
    subject: (s?.template?.subject ?? s?.subject ?? r?.subject ?? '') as string,
    body: (s?.template?.body ?? s?.body ?? r?.body ?? '') as string,
    vars: { ...(s?.variables ?? r?.variables ?? {}), ...((first && s?.recipientVariables?.[first]) || {}), ...(!s && r?.recipientVariables ? Object.values(r.recipientVariables)[0] : {}) },
    cc: s?.cc ?? r?.cc ?? '',
    bcc: s?.bcc ?? r?.bcc ?? '',
    attachments: s?.attachments ?? r?.attachments ?? [],
  }
}

function recipientsOf(g: EmailGroup) {
  const all = new Set<string>()
  for (const s of g.sends) s.recipientEmails.forEach((e) => all.add(e))
  for (const r of g.repeats) r.recipientEmails.forEach((e) => all.add(e))
  return [...all]
}

export function toLabel(g: EmailGroup): string {
  const seg = [...g.sends].reverse().find((s) => s.segment)?.segment ?? g.repeats[0]?.segment
  if (seg) return `${seg.label || 'A group'} · ${seg.resolvedAt ? `${(seg.matched ?? 0).toLocaleString()} matched` : 'decided when it sends'}`
  const list = recipientsOf(g)
  return list.length ? `${list[0]}${list.length > 1 ? ` +${(list.length - 1).toLocaleString()} more` : ''}` : '—'
}

export function whenLabel(g: EmailGroup): string {
  const r = g.repeats[0]
  if (r) return describeRepeat({ ...r, count: r.maxSends }, r.times)
  if (g.upcoming) {
    const more = g.sends.filter(isWaiting).length - 1
    return `${when(g.next)}${more > 0 ? ` · +${more} more` : ''}`
  }
  return when(g.last ?? toMs(g.sends.at(-1)?.scheduledAt))
}

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray'
const TONE: Record<Tone, string> = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  gray: 'bg-muted text-muted-foreground',
}
export function statusOf(g: EmailGroup): { label: string; tone: Tone } {
  const sending = g.sends.find((s) => s.status === 'sending')
  if (sending) return { label: `Sending ${sending.progress ?? 0} of ${sending.recipientEmails.length}`, tone: 'blue' }
  if (g.repeats.length) {
    if (g.repeats.some((r) => r.status === 'active')) return { label: 'Repeating', tone: 'blue' }
    return g.repeats.some((r) => r.status === 'stopped') ? { label: 'Paused', tone: 'gray' } : { label: 'Finished', tone: 'gray' }
  }
  if (g.upcoming) return { label: 'Scheduled', tone: 'blue' }
  if (g.sends.every((s) => s.status === 'cancelled')) return { label: 'Cancelled', tone: 'gray' }
  if (g.sends.every((s) => s.status === 'failed' || s.status === 'cancelled')) return { label: 'Failed', tone: 'red' }
  if (g.problems) return { label: 'Sent, with problems', tone: 'amber' }
  return { label: 'Sent', tone: 'green' }
}
const SEND_STATUS: Record<SendRow['status'], { label: string; tone: Tone }> = {
  pending: { label: 'Scheduled', tone: 'blue' },
  sending: { label: 'Sending', tone: 'blue' },
  sent: { label: 'Sent', tone: 'green' },
  failed: { label: 'Failed', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
}
export const Pill = ({ label, tone }: { label: string; tone: Tone }) => (
  <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium', TONE[tone])}>{label}</span>
)

/** The email as a Send Mails draft: same message, same people (a group stays a group) */
function draftFrom(g: EmailGroup): SendDraft {
  const m = messageOf(g)
  const repeat = g.repeats[0]
  const seg = repeat?.segment ?? g.sends.find((s) => s.segment)?.segment
  // For a group, only addresses added next to it; once sent, the list also holds the group's members
  const extra = repeat?.segment ? repeat.recipientEmails
    : seg ? (g.sends.find((s) => s.segment && !s.segment.resolvedAt)?.recipientEmails ?? []) : recipientsOf(g)
  return {
    v: 1,
    savedAt: Date.now(),
    audience: seg ? (seg.rules.length ? 'filtered' : 'all') : null,
    rules: seg ? toRules(seg.rules) : [],
    pickedIds: [],
    excludedIds: seg?.excludeIds ?? [],
    customRecipients: extra.join('\n'),
    cc: m.cc,
    bcc: m.bcc,
    templateId: m.templateId,
    subject: m.subject,
    body: m.body,
    sendValues: {},
    attachments: { ...NO_ATTACHMENTS, shared: m.attachments },
  }
}

interface Confirm { title: string; body: string; label: string; destructive?: boolean; run: () => Promise<void> }

export function Emails() {
  const { toast } = useToast()
  const router = useRouter()
  const [sends, setSends] = useState<SendRow[]>([])
  const [repeats, setRepeats] = useState<RecurringSchedule[]>([])
  const [drafts, setDrafts] = useState<ServerDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('scheduled')
  const [onlyProblems, setOnlyProblems] = useState(false)
  const [shownFor, setShownFor] = useState({ key: '', n: PAGE })
  const [query, setQuery] = useState('')
  /** Ticked rows (group keys, or draft ids as "d<id>") */
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const togglePick = (k: string) => setPicked((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [s, r, d] = await Promise.all([
      listSchedules().catch(() => null),
      listRecurringSchedules().catch(() => null),
      listDrafts().catch(() => null),
    ])
    if (s) setSends((Array.isArray(s) ? s : (s as { schedules?: SendRow[] }).schedules ?? []) as SendRow[])
    if (r) setRepeats(Array.isArray(r) ? (r as RecurringSchedule[]) : [])
    if (d) setDrafts(d)
    if (!s) toast({ title: 'Could not load your emails', description: 'Check your connection and try again.', variant: 'destructive' })
    setLoading(false)
  }, [toast])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL on arrival
    if (t === 'drafts' || t === 'sent' || t === 'scheduled') setTab(t)
    if (params.get('open')) setOpenKey(params.get('open')) // e.g. an email picked on the dashboard
    void load()
    const id = setInterval(() => { void load() }, POLL_MS)
    return () => clearInterval(id)
  }, [load])
  useRealtimeEvent('mail.status', () => { void load() })

  const groups = useMemo(() => groupEmails(sends, repeats), [sends, repeats])
  const scheduled = useMemo(() => groups.filter((g) => g.upcoming).sort((a, b) => (a.next ?? Infinity) - (b.next ?? Infinity)), [groups])
  const sent = useMemo(() => groups.filter((g) => !g.upcoming).sort((a, b) => (b.last ?? toMs(b.sends.at(-1)?.scheduledAt)) - (a.last ?? toMs(a.sends.at(-1)?.scheduledAt))), [groups])
  const q = query.trim().toLowerCase()
  const rows = (tab === 'scheduled' ? scheduled : (onlyProblems ? sent.filter((g) => g.problems) : sent))
    .filter((g) => !q || haystack(g).includes(q))
  const shownDrafts = drafts.filter((d) => !q || d.title.toLowerCase().includes(q))
  const listKey = `${tab}|${onlyProblems}|${q}`
  // ticks only count for rows on screen in this tab
  const pickedRows = rows.filter((g) => picked.has(g.key))
  const pickedDrafts = shownDrafts.filter((d) => picked.has(`d${d.id}`))
  const nPicked = tab === 'drafts' ? pickedDrafts.length : pickedRows.length
  const allKeys = tab === 'drafts' ? shownDrafts.map((d) => `d${d.id}`) : rows.slice(0, shownFor.key === listKey ? shownFor.n : PAGE).map((g) => g.key)
  const allPicked = allKeys.length > 0 && allKeys.every((k) => picked.has(k))
  const pickAll = () => setPicked(allPicked ? new Set() : new Set(allKeys))
  const shown = shownFor.key === listKey ? shownFor.n : PAGE
  const open = groups.find((g) => g.key === openKey) ?? null

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try { await fn() } catch (err) {
      toast({ title: 'That didn’t work', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally { setBusy(false); setConfirm(null); void load() }
  }

  /** Save the email as a draft, then (once that worked) run \`then\` and open the draft */
  const toDraft = async (g: EmailGroup, then?: () => Promise<unknown>) => {
    const d = await createDraft(messageOf(g).title, draftFrom(g))
    await then?.()
    router.push(`/all-clients-mail-setup?draft=${d.id}`)
  }
  const stopAll = async (g: EmailGroup) => {
    await Promise.all([
      ...g.sends.filter(isWaiting).map((s) => cancelSchedule(s.id)),
      ...g.repeats.filter((r) => r.status === 'active').map((r) => stopRecurringSchedule(r.id)),
    ])
  }

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: 'drafts', label: 'Drafts', n: drafts.length },
    { key: 'scheduled', label: 'Scheduled', n: scheduled.length },
    { key: 'sent', label: 'Sent', n: sent.length },
  ]

  return (
    <div className="flex min-h-full flex-col bg-background px-4 pt-4 pb-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-xl font-semibold tracking-tight">Scheduled Mails</h1>
        <Button onClick={() => router.push('/all-clients-mail-setup')}><Send className="mr-1.5 h-4 w-4" />New email</Button>
      </div>

      <div role="tablist" aria-label="Emails" className="mb-3 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setPicked(new Set()) }}
            className={cn('-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.label} <span className="ml-1 rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{t.n}</span>
          </button>
        ))}
        {tab === 'sent' && (
          <label className="ml-auto flex cursor-pointer items-center gap-2 self-center text-sm text-muted-foreground">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
            Only ones with problems
          </label>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search emails"
            placeholder="Search by subject, title or recipient" className="h-10 pl-9 text-sm" />
        </div>
        {nPicked > 0 && (
          <div role="toolbar" aria-label="Selected emails" className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 py-1 pl-3 pr-1">
            <span className="text-sm font-medium">{nPicked} selected</span>
            {tab === 'drafts' && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}
                onClick={() => setConfirm({ title: `Delete ${nPicked} draft${nPicked > 1 ? 's' : ''}?`, body: 'They will be deleted. This can’t be undone.', label: 'Delete', destructive: true,
                  run: async () => { await Promise.all(pickedDrafts.map((d) => deleteDraft(d.id))); setPicked(new Set()) } })}>
                <Trash2 className="mr-1.5 h-4 w-4" />Delete
              </Button>
            )}
            {tab === 'scheduled' && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}
                onClick={() => setConfirm({ title: `Cancel ${nPicked} email${nPicked > 1 ? 's' : ''}?`, body: 'Sends waiting to go out are cancelled and repeats are paused. Anything already sent stays sent.', label: 'Cancel them', destructive: true,
                  run: async () => { await Promise.all(pickedRows.map(stopAll)); setPicked(new Set()) } })}>
                <XCircle className="mr-1.5 h-4 w-4" />Cancel
              </Button>
            )}
            {tab === 'sent' && pickedRows.some(isRemovable) && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}
                onClick={() => {
                  const gone = pickedRows.filter(isRemovable)
                  setConfirm({ title: `Remove ${gone.length} from the list?`, body: `Failed or cancelled emails are removed. Nothing is sent.${gone.length < nPicked ? ' Emails that went out stay.' : ''}`, label: 'Remove', destructive: true,
                    run: async () => { await Promise.all(gone.flatMap((g) => g.sends.map((x) => cancelSchedule(x.id)))); setPicked(new Set()) } })
                }}>
                <Trash2 className="mr-1.5 h-4 w-4" />Remove failed
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>Clear</Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LekvyaLoader /></div>
      ) : tab === 'drafts' ? (
        shownDrafts.length === 0 ? (
          <EmptyState icon={FileText} title={q ? 'No matching drafts' : 'No drafts'} description={q ? undefined : 'Emails you start and don’t send are saved here automatically.'} />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {shownDrafts.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <input type="checkbox" className="h-4 w-4 accent-primary" aria-label={`Select ${d.title}`}
                  checked={picked.has(`d${d.id}`)} onChange={() => togglePick(`d${d.id}`)} />
                <div className="mr-auto min-w-0">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="text-sm text-muted-foreground">Saved {when(toMs(d.updatedAt))}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirm({ title: 'Delete this draft?', body: `“${d.title}” will be deleted. This can’t be undone.`, label: 'Delete', destructive: true,
                    run: async () => { await deleteDraft(d.id) } })}>
                  <Trash2 className="mr-1.5 h-4 w-4" />Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push(`/all-clients-mail-setup?draft=${d.id}`)}>
                  <Pencil className="mr-1.5 h-4 w-4" />Continue
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title={q ? 'Nothing matches your search' : tab === 'scheduled' ? 'Nothing scheduled' : onlyProblems ? 'No problems' : 'Nothing sent yet'}
          description={tab === 'scheduled' ? 'Emails waiting to go out, and repeating emails, show here.' : undefined} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:flex">
            <input type="checkbox" className="h-4 w-4 accent-primary" aria-label="Select all shown" checked={allPicked} onChange={pickAll} />
            <div className="grid flex-1 grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.3fr)_auto] gap-4">
            <span>Email</span><span>To</span><span>{tab === 'scheduled' ? 'Next' : 'Date'}</span><span className="w-36">Status</span>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {rows.slice(0, shown).map((g) => {
              const st = statusOf(g)
              return (
                <li key={g.key} className="flex items-center gap-3 pl-4">
                  <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" aria-label={`Select ${messageOf(g).title}`}
                    checked={picked.has(g.key)} onChange={() => togglePick(g.key)} />
                  <button type="button" onClick={() => setOpenKey(g.key)}
                    className="grid min-w-0 flex-1 gap-1 py-3 pr-4 text-left hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.3fr)_auto] md:items-center md:gap-4">
                    <span className="truncate text-sm font-medium">{messageOf(g).title}</span>
                    <span className="truncate text-sm text-muted-foreground">{toLabel(g)}</span>
                    <span className="truncate text-sm text-muted-foreground">{whenLabel(g)}</span>
                    <span className="md:w-36"><Pill {...st} /></span>
                  </button>
                </li>
              )
            })}
          </ul>
          {rows.length > shown && (
            <button type="button" onClick={() => setShownFor({ key: listKey, n: shown + PAGE })}
              className="w-full border-t border-border px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted/40">
              Show {Math.min(PAGE, rows.length - shown)} more
            </button>
          )}
        </div>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenKey(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          {open && (
            <EmailDetail key={open.key} group={open} busy={busy}
              onAsk={setConfirm}
              onDuplicate={() => run(() => toDraft(open))}
              onEdit={() => setConfirm({
                title: 'Edit this email?',
                body: open.repeats.length
                  ? 'It moves back to a draft so you can change the message, the people or how often it repeats. This repeat is removed; schedule it again when you’re done.'
                  : 'It moves back to a draft so you can change anything. Its scheduled sends are cancelled; schedule it again when you’re done.',
                label: 'Edit as draft',
                run: () => toDraft(open, () => Promise.all([
                  ...open.sends.filter(isWaiting).map((s) => cancelSchedule(s.id)),
                  ...open.repeats.map((r) => deleteRecurringSchedule(r.id)),
                ])),
              })}
              onCancelAll={() => setConfirm({
                title: 'Cancel this email?',
                body: open.repeats.length ? 'Sends waiting to go out are cancelled and the repeat is paused.' : 'Sends waiting to go out are cancelled. Anything already sent stays sent.',
                label: 'Cancel email', destructive: true,
                run: () => stopAll(open),
              })}
              onDone={(msg) => { toast({ title: msg, variant: 'success' }); void load() }}
            />
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && !busy && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Keep it</Button>
            <Button variant={confirm?.destructive ? 'destructive' : 'default'} disabled={busy} onClick={() => confirm && run(confirm.run)}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{confirm?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmailDetail({ group: g, busy, onAsk, onDuplicate, onEdit, onCancelAll, onDone }: {
  group: EmailGroup
  busy: boolean
  onAsk: (c: Confirm) => void
  onDuplicate: () => void
  onEdit: () => void
  onCancelAll: () => void
  onDone: (message: string) => void
}) {
  const { toast } = useToast()
  const m = messageOf(g)
  const preview = renderEmailPreview(m.subject, m.body, m.vars)
  const finished = g.sends.filter((s) => s.status !== 'pending')
  const [picked, setPicked] = useState<number | null>(finished.at(-1)?.id ?? null)
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null)

  useEffect(() => {
    if (picked == null) return
    let live = true
    getDeliveries(picked).then((d) => { if (live) setDeliveries(d) }).catch(() => { if (live) setDeliveries([]) })
    return () => { live = false }
  }, [picked])

  const failed = deliveries?.filter((d) => d.status === 'failed') ?? []
  const count = (st: Delivery['status']) => deliveries?.filter((d) => d.status === st).length ?? 0
  const removable = isRemovable(g)
  const activeRepeats = g.repeats.filter((r) => r.status === 'active')

  const act = async (fn: () => Promise<unknown>, message: string) => {
    try { await fn(); onDone(message) } catch (err) {
      toast({ title: 'That didn’t work', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <>
      <SheetHeader className="border-b border-border">
        <SheetTitle className="pr-8">{m.title}</SheetTitle>
        <SheetDescription>To {toLabel(g)}{m.cc && ` · Cc ${m.cc}`}</SheetDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {g.upcoming && !g.sends.some((s) => s.status === 'sending') && (
            <Button size="sm" variant="outline" disabled={busy} onClick={onEdit}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
          )}
          <Button size="sm" variant="outline" disabled={busy} onClick={onDuplicate}><Copy className="mr-1.5 h-4 w-4" />Duplicate</Button>
          {g.repeats.length > 0 && (activeRepeats.length ? (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => act(() => Promise.all(activeRepeats.map((r) => stopRecurringSchedule(r.id))), 'Repeat paused')}>
              <Pause className="mr-1.5 h-4 w-4" />Pause repeat
            </Button>
          ) : g.repeats.some((r) => r.status === 'stopped') && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => act(() => Promise.all(g.repeats.filter((r) => r.status === 'stopped').map((r) => startRecurringSchedule(r.id))), 'Repeat resumed')}>
              <Play className="mr-1.5 h-4 w-4" />Resume repeat
            </Button>
          ))}
          {g.repeats.length > 0 && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}
              onClick={() => onAsk({ title: 'Delete the repeat?', body: 'No more emails will go out from it. Emails already sent stay in Sent.', label: 'Delete repeat', destructive: true,
                run: async () => { await Promise.all(g.repeats.map((r) => deleteRecurringSchedule(r.id))) } })}>
              <Trash2 className="mr-1.5 h-4 w-4" />Delete repeat
            </Button>
          )}
          {g.sends.some(isWaiting) && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={onCancelAll}>
              <XCircle className="mr-1.5 h-4 w-4" />Cancel
            </Button>
          )}
          {removable && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}
              onClick={() => onAsk({ title: 'Remove from the list?', body: 'This email will no longer appear here. Nothing is sent.', label: 'Remove', destructive: true,
                run: async () => { await Promise.all(g.sends.map((s) => cancelSchedule(s.id))) } })}>
              <Trash2 className="mr-1.5 h-4 w-4" />Remove
            </Button>
          )}
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <section aria-label="Message">
          <h3 className="mb-2 text-sm font-semibold">Message</h3>
          <div className="rounded-lg border border-border">
            <p className="border-b border-border px-3 py-2 text-sm"><span className="text-muted-foreground">Subject: </span>{preview.subject || '—'}</p>
            <div className="max-h-64 overflow-y-auto px-3 py-2 text-sm [&_a]:text-primary [&_a]:underline [&_p]:my-1"
              dangerouslySetInnerHTML={{ __html: preview.bodyHtml }} />
            {m.attachments.length > 0 && (
              <p className="border-t border-border px-3 py-2 text-sm text-muted-foreground">Attached: {m.attachments.map((a) => a.name).join(', ')}</p>
            )}
          </div>
        </section>

        <section aria-label="Sends">
          <h3 className="mb-2 text-sm font-semibold">{g.sends.length === 1 ? 'Send' : `Sends (${g.sends.length})`}</h3>
          {g.repeats.length > 0 && (
            <p className="mb-2 text-sm text-muted-foreground">
              {whenLabel(g)}{activeRepeats.length ? ' · each send appears below once it’s due'
                : g.repeats.some((r) => r.status === 'stopped') ? ' · paused'
                : ' · finished: it reached its end date or number of sends. Use Duplicate to set it up again.'}
            </p>
          )}
          {g.sends.length === 0 ? null : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {g.sends.map((s) => {
                const st = SEND_STATUS[s.status]
                const canPick = s.status !== 'pending'
                return (
                  <li key={s.id}>
                    <button type="button" disabled={!canPick} onClick={() => setPicked(s.id)}
                      aria-pressed={picked === s.id}
                      className={cn('flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-sm',
                        canPick && 'hover:bg-muted/40', picked === s.id && 'bg-primary/5')}>
                      <span className="mr-auto">{when(toMs(s.status === 'sent' || s.status === 'failed' ? (s.sentAt ?? s.scheduledAt) : s.scheduledAt))}</span>
                      <span className="text-muted-foreground">
                        {s.status === 'sending' ? `${s.progress ?? 0} of ${s.recipientEmails.length}`
                          : s.segment && !s.segment.resolvedAt ? 'group' : `${s.recipientEmails.length.toLocaleString()} recipient${s.recipientEmails.length === 1 ? '' : 's'}`}
                      </span>
                      <Pill {...st} />
                      {s.errorMessage && <span className="w-full text-xs text-muted-foreground">{s.errorMessage}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {picked != null && (
          <section aria-label="Recipients">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="mr-auto text-sm font-semibold">Who got it</h3>
              {failed.length > 0 && (
                <Button size="sm" disabled={busy}
                  onClick={() => act(async () => { await resendFailed(picked) }, `Resending to ${failed.length} recipient${failed.length === 1 ? '' : 's'}`)}>
                  <RotateCcw className="mr-1.5 h-4 w-4" />Resend to {failed.length} failed
                </Button>
              )}
            </div>
            {deliveries === null ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : deliveries.length === 0 ? (
              <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                No per-recipient results for this send. They are recorded for emails sent from now on.
              </p>
            ) : (
              <>
                <p className="mb-2 text-sm text-muted-foreground">
                  {count('sent')} sent{count('failed') ? ` · ${count('failed')} failed` : ''}{count('skipped') ? ` · ${count('skipped')} skipped (unsubscribed or bounced)` : ''}
                </p>
                <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {deliveries.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-sm">
                      <span className="mr-auto min-w-0 truncate">{d.email}</span>
                      <Pill label={d.status === 'sent' ? 'Sent' : d.status === 'failed' ? 'Failed' : 'Skipped'}
                        tone={d.status === 'sent' ? 'green' : d.status === 'failed' ? 'red' : 'gray'} />
                      {d.reason && <span className="w-full text-xs text-muted-foreground">{d.reason}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </div>
    </>
  )
}
