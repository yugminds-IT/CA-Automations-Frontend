"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, Loader2, Repeat, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { SmtpAlertBanner } from "@/components/dashboard/smtp-alert-banner"
import { getUserData, getRoleFromUser, getOrganizationData } from "@/lib/api/index"
import { getClients } from "@/lib/api/clients"
import { convertSubmissionToLead, getFormSubmissions, type FormSubmissionItem } from "@/lib/api/developer"
import { listLeads, listOpenTasks, type Lead, type LeadTask } from "@/lib/api/leads"
import { listBusinessUnits, type BusinessUnit } from "@/lib/api/business-units"
import { getStandardReport, type StandardReport } from "@/lib/api/reports"
import { listRecurringSchedules, listSchedules } from "@/lib/api/mail-management"
import type { RecurringSchedule } from "@/lib/api/types"
import { useRealtimeEvent } from "@/lib/realtime"
import { COMPOSE_PATH, pagesFor, toIndustry } from "@/lib/nav"
import { usePermissions } from "@/lib/use-permissions"
import { pickerLabel } from "@/lib/unit-structure"
import { transformClient, type ClientItem } from "@/components/email-management/send-mails-utils"
import {
  groupEmails, messageOf, statusOf, toLabel, toMs, whenLabel, type EmailGroup, type SendRow,
} from "@/components/email-management/emails"
import { cn } from "@/lib/utils"

const DAY = 86_400_000
const EMAILS = "/email-management/scheduled-mails"
const emailLink = (g: EmailGroup, tab: "scheduled" | "sent") => `${EMAILS}?tab=${tab}&open=${encodeURIComponent(g.key)}`
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

/** YYYY-MM-DD in the viewer's own calendar */
const localDay = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY)
/** "4:42 PM" today, "Tomorrow", "Yesterday", else "28 Nov" */
const shortDate = (ms: number, now: number) => {
  const d = daysBetween(localDay(now), localDay(ms))
  if (d === 0) return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  if (d === 1) return "Tomorrow"
  if (d === -1) return "Yesterday"
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

/** The pill on a task or follow-up: how far away it is. */
const dueChip = (inDays: number) => ({
  text: inDays < 0 ? `${-inDays}d overdue` : inDays === 0 ? "Today" : inDays === 1 ? "Tomorrow" : `In ${inDays} days`,
  cls: inDays < 0
    ? "bg-red-500/10 text-red-700 dark:text-red-300"
    : inDays === 0 ? "bg-amber-500/15 text-amber-800 dark:text-amber-200" : "bg-muted text-muted-foreground",
})

interface Data {
  sends: SendRow[]
  repeats: RecurringSchedule[]
  clients: ClientItem[] | null
  /** New form submissions, null when the viewer cannot see the inbox */
  inquiries: FormSubmissionItem[] | null
  /** Open lead count and the most recently active leads, null when the viewer cannot see leads */
  leads: { open: number; recent: Lead[] } | null
  tasks: LeadTask[] | null
  report: StandardReport | null
  units: BusinessUnit[]
  /** when it was loaded */
  at: number
}

export function Dashboard() {
  const { toast } = useToast()
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const [converting, setConverting] = useState<number | null>(null)
  const [me, setMe] = useState<{ name: string; industry: ReturnType<typeof toIndustry>; role: string | null }>({ name: "", industry: toIndustry(null), role: null })

  useEffect(() => {
    const user = getUserData() as any
    // eslint-disable-next-line react-hooks/set-state-in-effect -- user data lives in localStorage, read once on arrival
    setMe({
      name: String(user?.name ?? user?.full_name ?? "").split(" ")[0],
      industry: toIndustry(getOrganizationData()?.industry || user?.organization?.industry),
      role: getRoleFromUser(user),
    })
  }, [])
  const permissions = usePermissions(me.role)
  const can = useCallback((key: string) => !permissions || permissions.includes(key), [permissions])
  const pages = useMemo(() => pagesFor(me.industry, me.role, permissions), [me.industry, me.role, permissions])
  const clientsPage = pages.find((p) => p.id === "clients")
  const inquiriesPage = pages.find((p) => p.id === "inquiries")
  const hasInquiries = !!inquiriesPage
  const hasLeads = pages.some((p) => p.id === "leads")
  const hasReports = pages.some((p) => p.id === "reports")

  const load = useCallback(async () => {
    const [s, r, c, i, lo, lr, t, rep, u] = await Promise.all([
      listSchedules().catch(() => null),
      listRecurringSchedules().catch(() => null),
      getClients().catch(() => null),
      hasInquiries ? getFormSubmissions("new").catch(() => null) : Promise.resolve(null),
      hasLeads ? listLeads({ status: "open", limit: 1 }).catch(() => null) : Promise.resolve(null),
      hasLeads ? listLeads({ limit: 8 }).catch(() => null) : Promise.resolve(null),
      hasLeads ? listOpenTasks().catch(() => null) : Promise.resolve(null),
      hasReports ? getStandardReport({}).catch(() => null) : Promise.resolve(null),
      listBusinessUnits().catch(() => [] as BusinessUnit[]),
    ])
    // Nothing at all loaded: show the retry notice instead of an empty page.
    if (!s && !i && !lo && !t) { setFailed(true); return }
    setFailed(false)
    setData({
      sends: (Array.isArray(s) ? s : (s as { schedules?: SendRow[] } | null)?.schedules ?? []) as SendRow[],
      repeats: Array.isArray(r) ? (r as RecurringSchedule[]) : [],
      clients: c ? c.clients.map(transformClient) : null,
      inquiries: Array.isArray(i) ? i : null,
      leads: lo && lr ? { open: lo.total, recent: lr.items } : null,
      tasks: Array.isArray(t) ? t : null,
      report: rep,
      units: u,
      at: Date.now(),
    })
  }, [hasInquiries, hasLeads, hasReports])

  useEffect(() => { void load() }, [load])
  useRealtimeEvent("mail.status", () => { void load() })
  useRealtimeEvent("developer.submission.created", () => { void load() })

  const brandOf = useCallback((id?: number | null) => {
    if (!data || id == null || data.units.length <= 1) return ""
    const u = data.units.find((x) => x.id === id)
    return u ? pickerLabel(u, data.units) : ""
  }, [data])

  const view = useMemo(() => {
    if (!data) return null
    const now = data.at
    const today = localDay(now)
    const monthAgo = now - 30 * DAY
    const groups = groupEmails(data.sends, data.repeats)

    let sent = 0
    for (const s of data.sends) {
      if (toMs(s.sentAt ?? s.scheduledAt) < monthAgo) continue
      if (s.status === "sent") sent += s.recipientEmails.length
    }
    const upcoming = groups.filter((g) => g.upcoming).sort((a, b) => (a.next ?? Infinity) - (b.next ?? Infinity))
    const recent = groups.filter((g) => !g.upcoming && g.last != null).sort((a, b) => b.last! - a.last!)
    const failedWeek = recent.filter((g) => g.problems && g.last! >= now - 7 * DAY)

    // Lead tasks due within a week, soonest first. Tasks with no date are left to the Tasks page.
    const tasks = (data.tasks ?? [])
      .filter((t) => t.dueAt)
      .map((t) => ({ ...t, inDays: daysBetween(today, localDay(Date.parse(t.dueAt as string))) }))
      .filter((t) => t.inDays <= 7)
      .sort((a, b) => Date.parse(a.dueAt as string) - Date.parse(b.dueAt as string))
    const followUps = (data.clients ?? [])
      .filter((c) => c.followUpOn && daysBetween(today, c.followUpOn) <= 7)
      .map((c) => ({ ...c, inDays: daysBetween(today, c.followUpOn!) }))
      .sort((a, b) => a.inDays - b.inDays)

    // Leads by stage. Stages with the same name in different pipelines are added together.
    const byLabel = new Map<string, number>()
    for (const row of data.report?.byStage ?? []) {
      const n = row.values.lead_count ?? 0
      if (n > 0) byLabel.set(row.label, (byLabel.get(row.label) ?? 0) + n)
    }
    const stages = [...byLabel].map(([label, n]) => ({ label, n }))

    return {
      sent, upcoming, recent, failedWeek, tasks, followUps, stages,
      taskDue: tasks.filter((t) => t.inDays <= 0).length,
      taskOverdue: tasks.filter((t) => t.inDays < 0).length,
    }
  }, [data])

  const convert = async (item: FormSubmissionItem) => {
    setConverting(item.id)
    try {
      const res = await convertSubmissionToLead(item.id)
      toast({
        title: res.duplicate ? "Added to existing lead" : "Lead created",
        description: res.duplicate ? "A lead with the same email or phone already exists." : "The enquiry is now a lead.",
        variant: "success",
      })
      setData((prev) => prev && {
        ...prev,
        inquiries: prev.inquiries?.filter((x) => x.id !== item.id) ?? null,
        leads: prev.leads ? { ...prev.leads, open: prev.leads.open + (res.duplicate ? 0 : 1) } : prev.leads,
      })
      void load()
    } catch (e) {
      toast({ title: "Could not create the lead", description: (e as Error).message, variant: "destructive" })
    } finally {
      setConverting(null)
    }
  }

  const clientsWord = clientsPage?.label ?? "Clients"
  const upcoming = view?.upcoming ?? []
  const recent = view?.recent ?? []
  const tasks = view?.tasks ?? []
  const follow = view?.followUps ?? []
  const inquiries = data?.inquiries ?? null
  const canConvert = can("inbox.manage") && can("leads.create")

  type Count = { n: number; text: string; href: string; warn?: boolean }
  const counts: Count[] = !view || !data ? [] : [
    ...(inquiries ? [{ n: inquiries.length, text: inquiries.length === 1 ? "New inquiry" : "New inquiries", href: inquiriesPage?.path ?? "/developer/inbox" }] : []),
    ...(data.leads ? [{ n: data.leads.open, text: data.leads.open === 1 ? "Open lead" : "Open leads", href: "/leads" }] : []),
    ...(data.tasks ? [{ n: view.taskDue, text: view.taskDue === 1 ? "Task due" : "Tasks due", href: "/tasks", warn: view.taskOverdue > 0 }] : []),
    { n: view.sent, text: "Emails delivered, 30 days", href: `${EMAILS}?tab=sent` },
    // problems only show up when there are some
    ...(view.failedWeek.length ? [{ n: view.failedWeek.length, warn: true, text: "Emails failed this week", href: `${EMAILS}?tab=sent` }] : []),
  ]

  const totals = data?.report?.totals

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6">
      <SmtpAlertBanner />

      {failed && !data && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          Couldn’t load your dashboard. <button type="button" className="font-medium underline" onClick={() => void load()}>Try again</button>
        </div>
      )}

      <h1 className="sr-only">Dashboard</h1>
      <section aria-label="Today" className="flex shrink-0 flex-wrap items-center gap-3 rounded-3xl border bg-gradient-to-br from-orange-50 via-card to-card p-3 shadow-sm dark:from-orange-950/30 sm:p-4">
        <ul aria-label="At a glance" className="grid w-full grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] sm:gap-3 lg:w-auto lg:flex-1">
          {!view && [0, 1, 2, 3].map((i) => <li key={i}><Skeleton className="h-[4.5rem] w-full rounded-2xl" /></li>)}
          {counts.map((c) => (
            <li key={c.text}>
              <Link href={c.href} className="flex h-full items-center gap-3 rounded-2xl border bg-background/80 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="min-w-0">
                  <span className={cn("block text-xl font-semibold leading-7 tabular-nums sm:text-2xl sm:leading-8", c.warn && "text-red-600 dark:text-red-400")}>{c.n.toLocaleString()}</span>
                  <span className="block text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-5">{c.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Work to do: new enquiries to review, tasks that are due, and who was active lately */}
      <div className="grid gap-5 lg:grid-cols-3">
        {(hasInquiries || !data) && (
          <Card title="New inquiries" count={inquiries?.length} href={inquiriesPage?.path} linkText="Open inbox">
            {!view ? <Rows /> : !inquiries ? <Empty title="Couldn’t load inquiries" text="Reload the page to try again." />
              : inquiries.length ? (
                <ul className="space-y-0.5 p-2">
                  {inquiries.slice(0, 20).map((q) => {
                    const brand = brandOf(q.businessUnitId)
                    const who = q.senderName || q.senderEmail || "Website visitor"
                    return (
                      <li key={q.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted">
                        <Link href={inquiriesPage?.path ?? "/developer/inbox"} className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none">
                          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-200 to-orange-400 text-sm font-semibold text-orange-950">
                            {who.trim().slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{who}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[brand, q.formName || "Contact form"].filter(Boolean).join(" · ")} · {shortDate(Date.parse(q.createdAt), data!.at)}
                            </span>
                          </span>
                        </Link>
                        {canConvert && (
                          <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" disabled={converting === q.id} onClick={() => void convert(q)}
                            title="Create a lead from this enquiry">
                            {converting === q.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Target className="mr-1 h-3.5 w-3.5" />}To lead
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : <Empty title="No new inquiries" text="Messages from your website forms show up here, ready to turn into leads." />}
          </Card>
        )}

        {(hasLeads || !data) && (
          <Card title="Tasks due" count={data?.tasks ? tasks.length + follow.length : undefined} href="/tasks" linkText="All tasks">
            {!view ? <Rows /> : !data?.tasks ? <Empty title="Couldn’t load tasks" text="Reload the page to try again." />
              : tasks.length || follow.length ? (
                <div className="space-y-1 p-2">
                  {tasks.length > 0 && (
                    <ul className="space-y-0.5">
                      {tasks.map((t) => {
                        const chip = dueChip(t.inDays)
                        return (
                          <li key={`t-${t.id}`}>
                            <Link href={`/leads/${t.leadId}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", t.inDays < 0 ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600")}>
                                <Clock className="h-4 w-4" aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{t.title}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {new Date(t.dueAt as string).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                </span>
                              </span>
                              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", chip.cls)}>{chip.text}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {follow.length > 0 && (
                    <>
                      <p className="px-2.5 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{clientsWord} follow-ups</p>
                      <ul className="space-y-0.5">
                        {follow.map((c) => {
                          const chip = dueChip(c.inDays)
                          return (
                            <li key={`c-${c.id}`}>
                              <Link href={`/client-management/${c.id}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-200 to-orange-400 text-sm font-semibold text-orange-950">
                                  {(c.name || c.email || "?").trim().slice(0, 1).toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium">{c.name || c.companyName || c.email}</span>
                                  <span className="block truncate text-xs text-muted-foreground">{c.followUpDate}</span>
                                </span>
                                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", chip.cls)}>{chip.text}</span>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  )}
                </div>
              ) : <Empty title="Nothing due this week" text="Add a task to a lead and it will show up here when it is due." />}
          </Card>
        )}

        {(hasLeads || !data) && (
          <Card title="Recent leads" href="/leads">
            {!view ? <Rows /> : !data?.leads ? <Empty title="Couldn’t load leads" text="Reload the page to try again." />
              : data.leads.recent.length ? (
                <ul className="space-y-0.5 p-2">
                  {data.leads.recent.map((l) => {
                    const brand = brandOf(l.businessUnitId)
                    const at = Date.parse(l.lastActivityAt ?? l.createdAt)
                    return (
                      <li key={l.id}>
                        <Link href={`/leads/${l.id}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-200 to-sky-400 text-sm font-semibold text-sky-950">
                            {(l.name || l.email || "?").trim().slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{l.name || l.email}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[brand, l.company || l.source].filter(Boolean).join(" · ") || "No details yet"}
                            </span>
                          </span>
                          {l.status !== "open" ? (
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", l.status === "won" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300")}>
                              {l.status === "won" ? "Won" : "Lost"}
                            </span>
                          ) : (
                            <span className="shrink-0 text-xs text-muted-foreground">{shortDate(at, data.at)}</span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : <Empty title="No leads yet" text="Convert a form enquiry or add a lead and it will appear here."
                  action={<Button asChild size="sm"><Link href="/leads?new=1">Add a lead</Link></Button>} />}
          </Card>
        )}
      </div>

      {/* Pipeline and email activity */}
      <div className="grid gap-5 lg:grid-cols-3">
        {hasReports && (
          <Card title="Leads by stage" href="/reports" linkText="Reports">
            {!view ? <Rows /> : !data?.report ? <Empty title="Couldn’t load the pipeline" text="Reload the page to try again." />
              : view.stages.length ? (
                <div>
                  <p className="px-4 pt-3 text-xs text-muted-foreground">
                    Leads from the last 30 days
                    {totals && totals.pipelineValue > 0 ? ` · Open pipeline ${inr.format(totals.pipelineValue)}` : ""}
                    {totals?.winRate != null ? ` · Win rate ${totals.winRate}%` : ""}
                  </p>
                  <StageBars rows={view.stages} />
                </div>
              ) : <Empty title="No leads in the last 30 days" text="Once leads come in you will see where each one sits in your pipeline." />}
          </Card>
        )}

        <Card title="Up next" count={view ? upcoming.length : undefined} href={`${EMAILS}?tab=scheduled`}>
          {!view ? <Rows /> : upcoming.length
            ? <EmailList groups={upcoming} tab="scheduled" now={data!.at} />
            : <Empty title="Nothing is scheduled" text="Write an email and pick a time, and it will wait here."
                action={<Button asChild size="sm"><Link href={COMPOSE_PATH}>Schedule an email</Link></Button>} />}
        </Card>

        <Card title="Just sent" href={`${EMAILS}?tab=sent`}>
          {!view ? <Rows /> : recent.length
            ? <EmailList groups={recent.slice(0, 20)} tab="sent" now={data!.at} />
            : <Empty title="No emails sent yet" text="Emails you send show up here with how they did." />}
        </Card>
      </div>
    </div>
  )
}
type Tone = "green" | "red" | "amber" | "blue" | "gray"
const CHIP: Record<Tone, string> = {
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  gray: "bg-muted text-muted-foreground",
}

function Card({ title, count, href, linkText = "See all", children }: {
  title: string; count?: number; href?: string; linkText?: string; children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="flex h-[22rem] flex-col overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="flex shrink-0 items-center gap-2.5 border-b px-4 py-2.5">
        <h2 className="font-semibold">{title}</h2>
        {count != null && count > 0 && <span className="rounded-full bg-primary/10 px-2 text-xs font-semibold tabular-nums text-orange-800 dark:text-orange-300">{count}</span>}
        {href && <Link href={href} className="ml-auto text-sm font-medium text-primary hover:underline">{linkText}</Link>}
      </div>
      {/* relative: keeps absolutely positioned bits (sr-only labels) inside the scroll box, or they stretch the page */}
      <div className="relative min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  )
}

/** One bar per stage, scaled to the busiest stage. */
function StageBars({ rows }: { rows: { label: string; n: number }[] }) {
  const max = Math.max(...rows.map((r) => r.n), 1)
  return (
    <ul className="space-y-3 p-4">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{r.n}</span>
          </div>
          <div className="h-2 rounded-full bg-muted" role="presentation">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(4, (r.n / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function EmailList({ groups, tab, now }: { groups: EmailGroup[]; tab: "scheduled" | "sent"; now: number }) {
  return (
    <ul className="space-y-0.5 p-2">
      {groups.map((g) => {
        const st = statusOf(g)
        const repeating = g.repeats.length > 0
        const tone: Tone = st.tone === "green" ? "green" : st.tone === "red" ? "red" : st.tone === "amber" ? "amber" : st.tone === "gray" ? "gray" : "blue"
        const problem = tone === "red" || tone === "amber"
        const Icon = problem ? AlertCircle : repeating ? Repeat : tab === "sent" ? CheckCircle2 : Clock
        const at = tab === "sent" ? g.last : g.next
        return (
          <li key={g.key}>
            <Link href={emailLink(g, tab)} title={whenLabel(g)}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", CHIP[tone])}>
                <Icon className="h-4 w-4" aria-hidden /><span className="sr-only">{st.label}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{messageOf(g).title}</span>
                <span className="block truncate text-xs text-muted-foreground">{toLabel(g)}</span>
              </span>
              <span className={cn("shrink-0 text-right text-xs", problem ? "font-medium" : "text-muted-foreground",
                tone === "red" && "text-red-600 dark:text-red-400", tone === "amber" && "text-amber-700 dark:text-amber-300")}>
                {problem ? st.label : at != null ? shortDate(at, now) : repeating ? "Repeats" : ""}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-1.5 px-6 py-6 text-center">
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-64 text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

const Rows = () => (
  <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}</div>
)
