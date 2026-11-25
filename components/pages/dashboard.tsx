"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, Repeat, SquarePen, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SmtpAlertBanner } from "@/components/dashboard/smtp-alert-banner"
import { Calendar3D, Clock3D, Draft3D, Folder3D, Mail3D, Person3D, Sent3D } from "@/components/dashboard/illustrations"
import { getUserData, getRoleFromUser, getOrganizationData } from "@/lib/api/index"
import { getClients } from "@/lib/api/clients"
import { getFormSubmissions } from "@/lib/api/developer"
import { listDrafts, listRecurringSchedules, listSchedules } from "@/lib/api/mail-management"
import type { RecurringSchedule } from "@/lib/api/types"
import { useRealtimeEvent } from "@/lib/realtime"
import { COMPOSE_PATH, pagesFor, toIndustry } from "@/lib/nav"
import { transformClient, type ClientItem } from "@/components/email-management/send-mails-utils"
import {
  groupEmails, messageOf, statusOf, toLabel, toMs, whenLabel, type EmailGroup, type SendRow,
} from "@/components/email-management/emails"
import { cn } from "@/lib/utils"

const DAY = 86_400_000
const EMAILS = "/email-management/scheduled-mails"
const emailLink = (g: EmailGroup, tab: "scheduled" | "sent") => `${EMAILS}?tab=${tab}&open=${encodeURIComponent(g.key)}`

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

interface Data {
  sends: SendRow[]
  repeats: RecurringSchedule[]
  drafts: number
  clients: ClientItem[] | null
  inquiries: number
  /** when it was loaded */
  at: number
}

export function Dashboard() {
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
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
  const pages = useMemo(() => pagesFor(me.industry, me.role), [me.industry, me.role])
  const clientsPage = pages.find((p) => p.id === "clients")
  const inquiriesPage = pages.find((p) => p.id === "inquiries")
  const hasInquiries = !!inquiriesPage

  const load = useCallback(async () => {
    const [s, r, d, c, i] = await Promise.all([
      listSchedules().catch(() => null),
      listRecurringSchedules().catch(() => null),
      listDrafts().catch(() => null),
      getClients().catch(() => null),
      hasInquiries ? getFormSubmissions("new").catch(() => null) : Promise.resolve(null),
    ])
    if (!s) { setFailed(true); return }
    setFailed(false)
    setData({
      sends: (Array.isArray(s) ? s : (s as { schedules?: SendRow[] }).schedules ?? []) as SendRow[],
      repeats: Array.isArray(r) ? (r as RecurringSchedule[]) : [],
      drafts: d?.length ?? 0,
      clients: c ? c.clients.map(transformClient) : null,
      inquiries: Array.isArray(i) ? i.length : 0,
      at: Date.now(),
    })
  }, [hasInquiries])

  useEffect(() => { void load() }, [load])
  useRealtimeEvent("mail.status", () => { void load() })

  const view = useMemo(() => {
    if (!data) return null
    const now = data.at
    const today = localDay(now)
    const monthAgo = now - 30 * DAY
    const groups = groupEmails(data.sends, data.repeats)

    let sent = 0, bounced = 0
    for (const s of data.sends) {
      if (toMs(s.sentAt ?? s.scheduledAt) < monthAgo) continue
      if (s.status === "sent") sent += s.recipientEmails.length
      if (s.status === "failed") bounced += s.recipientEmails.length
    }
    const upcoming = groups.filter((g) => g.upcoming).sort((a, b) => (a.next ?? Infinity) - (b.next ?? Infinity))
    const recent = groups.filter((g) => !g.upcoming && g.last != null).sort((a, b) => b.last! - a.last!)
    const failedWeek = recent.filter((g) => g.problems && g.last! >= now - 7 * DAY)
    const followUps = (data.clients ?? [])
      .filter((c) => c.followUpOn && daysBetween(today, c.followUpOn) <= 7)
      .map((c) => ({ ...c, inDays: daysBetween(today, c.followUpOn!) }))
      .sort((a, b) => a.inDays - b.inDays)
    return {
      sent, bounced,
      rate: sent + bounced ? Math.round((sent / (sent + bounced)) * 100) : null,
      upcoming, recent, failedWeek, followUps,
      overdue: followUps.filter((c) => c.inDays < 0).length,
      dueToday: followUps.filter((c) => c.inDays === 0).length,
    }
  }, [data])

  const clientsWord = clientsPage?.label ?? "Clients"

  const upcoming = view?.upcoming ?? []
  const recent = view?.recent ?? []
  const follow = view?.followUps ?? []

  const counts = !view || !data ? [] : [
    { Art: Mail3D, n: view.sent, text: "Delivered in 30 days", href: `${EMAILS}?tab=sent` },
    { Art: Clock3D, n: upcoming.length, text: "Scheduled", href: `${EMAILS}?tab=scheduled` },
    { Art: Draft3D, n: data.drafts, text: data.drafts === 1 ? "Draft waiting" : "Drafts waiting", href: `${EMAILS}?tab=drafts` },
    { Art: Person3D, n: data.clients?.length ?? 0, text: clientsWord, href: clientsPage?.path ?? "/client-management" },
    // problems only show up when there are some
    ...(view.failedWeek.length ? [{ Art: Mail3D, n: view.failedWeek.length, warn: true, text: "Failed this week", href: `${EMAILS}?tab=sent` }] : []),
    ...(view.overdue ? [{ Art: Calendar3D, n: view.overdue, warn: true, text: view.overdue === 1 ? "Overdue follow-up" : "Overdue follow-ups", href: clientsPage?.path ?? "/client-management" }] : []),
    ...(inquiriesPage && data.inquiries ? [{ Art: Mail3D, n: data.inquiries, text: data.inquiries === 1 ? "New inquiry" : "New inquiries", href: inquiriesPage.path }] : []),
  ]

  return (
    // Desktop: exactly one screen, lists scroll inside their cards. Phone: a normal scrolling page.
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:h-full lg:min-h-0">
      <SmtpAlertBanner />

      {failed && !data && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          Couldn’t load your dashboard. <button type="button" className="font-medium underline" onClick={() => void load()}>Try again</button>
        </div>
      )}

      <h1 className="sr-only">Dashboard</h1>
      <section aria-label="Today" className="flex shrink-0 flex-wrap items-center gap-3 rounded-3xl border bg-gradient-to-br from-orange-50 via-card to-card p-3 shadow-sm dark:from-orange-950/30 sm:p-4">
        <ul aria-label="At a glance" className="grid w-full grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] sm:gap-3 lg:w-auto lg:flex-1">
          {!view && [0, 1, 2, 3].map((i) => <li key={i}><Skeleton className="h-[4.5rem] w-full rounded-2xl" /></li>)}
          {counts.map((c) => (
            <li key={c.text}>
              <Link href={c.href} className="flex h-full items-center gap-3 rounded-2xl border bg-background/80 py-2 pl-2 pr-4 transition-colors hover:border-primary/40 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <c.Art className="h-12 w-12 sm:h-14 sm:w-14" />
                <span className="min-w-0">
                  <span className={cn("block text-xl font-semibold leading-7 tabular-nums sm:text-2xl sm:leading-8", "warn" in c && c.warn && "text-red-600 dark:text-red-400")}>{c.n.toLocaleString()}</span>
                  <span className="block text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-5">{c.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex w-full gap-2 sm:justify-end lg:w-auto">
          {clientsPage && (
            <Button asChild variant="outline" className="h-10 bg-background/70"><Link href={`${clientsPage.path}?add=1`}><UserPlus className="mr-1.5 h-4 w-4" />Add {clientsWord.toLowerCase().replace(/s$/, "")}</Link></Button>
          )}
          <Button asChild className="h-10"><Link href={COMPOSE_PATH}><SquarePen className="mr-1.5 h-4 w-4" />Compose email</Link></Button>
        </div>
      </section>

      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-3">
        <Card Art={Clock3D} title="Up next" count={view ? upcoming.length : undefined} href={`${EMAILS}?tab=scheduled`}>
          {!view ? <Rows /> : upcoming.length
            ? <EmailList groups={upcoming} tab="scheduled" now={data!.at} />
            : <Empty Art={Clock3D} title="Nothing is scheduled" text="Write an email and pick a time, and it will wait here."
                action={<Button asChild size="sm"><Link href={COMPOSE_PATH}>Schedule an email</Link></Button>} />}
        </Card>

        <Card Art={Sent3D} title="Just sent" href={`${EMAILS}?tab=sent`}>
          {!view ? <Rows /> : recent.length
            ? <EmailList groups={recent.slice(0, 20)} tab="sent" now={data!.at} />
            : <Empty Art={Sent3D} title="No emails sent yet" text="Emails you send show up here with how they did." />}
        </Card>

        <Card Art={Folder3D} title="Follow-ups" count={view && data?.clients ? follow.length : undefined}
          href={clientsPage?.path} linkText={data?.clients ? `All ${clientsWord.toLowerCase()}` : undefined}>
          {!view ? <Rows /> : !data?.clients ? <Empty Art={Person3D} title={`Couldn’t load ${clientsWord.toLowerCase()}`} text="Reload the page to try again." />
            : follow.length ? (
              <ul className="space-y-0.5 p-2">
                {follow.map((c) => (
                  <li key={c.id}>
                    <Link href={`/client-management/${c.id}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-200 to-orange-400 text-sm font-semibold text-orange-950">
                        {(c.name || c.email || "?").trim().slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.name || c.companyName || c.email}</span>
                        <span className="block truncate text-xs text-muted-foreground">{c.followUpDate}</span>
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        c.inDays < 0 ? "bg-red-500/10 text-red-700 dark:text-red-300" : c.inDays === 0 ? "bg-amber-500/15 text-amber-800 dark:text-amber-200" : "bg-muted text-muted-foreground")}>
                        {c.inDays < 0 ? `${-c.inDays}d overdue` : c.inDays === 0 ? "Today" : c.inDays === 1 ? "Tomorrow" : `In ${c.inDays} days`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <Empty Art={Folder3D} title="No follow-ups this week" text={`Add a follow-up date to any of your ${clientsWord.toLowerCase()} and it will show up here.`} />}
        </Card>
      </div>
    </div>
  )
}

type ArtComponent = (p: { className?: string }) => React.ReactNode
type Tone = "green" | "red" | "amber" | "blue" | "gray"
const CHIP: Record<Tone, string> = {
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  gray: "bg-muted text-muted-foreground",
}

function Card({ Art, title, count, href, linkText = "See all", children }: {
  Art: ArtComponent; title: string; count?: number; href?: string; linkText?: string; children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col overflow-hidden rounded-3xl border bg-card shadow-sm lg:min-h-0">
      <div className="flex shrink-0 items-center gap-2.5 border-b px-4 py-2.5">
        <Art className="h-9 w-9" />
        <h2 className="font-semibold">{title}</h2>
        {count != null && count > 0 && <span className="rounded-full bg-primary/10 px-2 text-xs font-semibold tabular-nums text-orange-800 dark:text-orange-300">{count}</span>}
        {href && <Link href={href} className="ml-auto text-sm font-medium text-primary hover:underline">{linkText}</Link>}
      </div>
      {/* relative: keeps absolutely positioned bits (sr-only labels) inside the scroll box, or they stretch the page */}
      <div className="relative max-h-96 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">{children}</div>
    </section>
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

function Empty({ Art, title, text, action }: { Art: ArtComponent; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-1.5 px-6 py-6 text-center">
      <Art className="mb-1 h-28 w-28" />
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-64 text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

const Rows = () => (
  <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}</div>
)
