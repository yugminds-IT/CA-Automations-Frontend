'use client'

// "Schedule for later": send once (one or more dates) or repeat (every day/week/month/quarter/year),
// with a plain-words summary and the next sends before anything is saved.
import { useMemo, useState } from 'react'
import { CalendarClock, CalendarHeart, Clock, Loader2, Plus, Repeat, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { RepeatRule, ScheduleConfig } from '@/lib/api/types'
import {
  ALL_MONTHS, MONTHS, WEEKDAYS, at, browserOffset, describeRepeat, nextRuns, ordinal, quarterMonths, time12, ymd,
} from '@/lib/schedule-rule'

type Every = RepeatRule['every']
const EVERY: { value: Every; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
]
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6]
const WORK_WEEK = [1, 2, 3, 4, 5]

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const fmt = (d: Date) => d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** Pill button that can be on or off */
function Chip({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn('h-9 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-primary/50', className)}>
      {children}
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}{hint && <span className="font-normal text-muted-foreground"> · {hint}</span>}</p>
      {children}
    </div>
  )
}

const toggle = (xs: number[], x: number) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x])

/** A rule added to the group for "when a date comes": checked every day at the send time */
export interface DateRule { field: 'followUp' | 'onboard'; op: 'on' | 'ago' | 'yearly'; days: number }
type AutoDate = 'followUp' | 'onboard' | 'anniversary'
type AutoWhen = 'before' | 'on' | 'after'
const AUTO_DATES: { value: AutoDate; label: string }[] = [
  { value: 'followUp', label: 'Follow-up date' },
  { value: 'onboard', label: 'Onboarding date' },
  { value: 'anniversary', label: 'Onboarding anniversary (every year)' },
]

/** "3 days before their follow-up date" → the group rule that picks those clients on a given day */
export function toDateRule(date: AutoDate, when: AutoWhen, days: number): DateRule {
  const n = when === 'on' ? 0 : days
  if (date === 'anniversary') return { field: 'onboard', op: 'yearly', days: n }
  return { field: date, op: when === 'after' ? 'ago' : 'on', days: n }
}

export function ScheduleSheet({ open, onOpenChange, audience, problem, busy, onSchedule, groupSend }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** e.g. "9 clients" */
  audience: string
  /** Why it can't be scheduled yet (no recipients, missing values…) */
  problem: string | null
  busy: boolean
  onSchedule: (schedule: ScheduleConfig, dateRule?: DateRule) => void
  /** Going to All clients or A group (needed for "when a date comes") */
  groupSend: boolean
}) {
  const today = ymd(new Date())
  const [kind, setKind] = useState<'once' | 'repeat' | 'auto'>('once')
  const [autoDate, setAutoDate] = useState<AutoDate>('followUp')
  const [autoWhen, setAutoWhen] = useState<AutoWhen>('before')
  const [autoDays, setAutoDays] = useState(3)
  const [dates, setDates] = useState<string[]>([ymd(addDays(new Date(), 1))])
  const [times, setTimes] = useState<string[]>(['09:00'])
  const [every, setEvery] = useState<Every>('month')
  const [weekdays, setWeekdays] = useState<number[]>([1])
  const [dailyWorkdays, setDailyWorkdays] = useState(false)
  const [days, setDays] = useState<number[]>([1])
  const [quarterNth, setQuarterNth] = useState(0)
  const [yearMonths, setYearMonths] = useState<number[]>([4])
  const [startDate, setStartDate] = useState(today)
  const [ends, setEnds] = useState<'never' | 'on' | 'after'>('never')
  const [endDate, setEndDate] = useState('')
  const [count, setCount] = useState(12)

  const validTimes = [...new Set(times.filter(Boolean))].sort()
  const rule: RepeatRule = useMemo(() => kind === 'auto' ? {
    every: 'day',
    months: ALL_MONTHS,
    weekdays: ALL_WEEK,
    startDate: startDate || today,
    ...(ends === 'on' && endDate ? { endDate } : {}),
  } : ({
    every,
    months: every === 'quarter' ? quarterMonths(quarterNth) : every === 'year' ? [...yearMonths].sort((a, b) => a - b) : ALL_MONTHS,
    ...(every === 'day' ? { weekdays: dailyWorkdays ? WORK_WEEK : ALL_WEEK }
      : every === 'week' ? { weekdays: [...weekdays].sort() } : { days }),
    startDate: startDate || today,
    ...(ends === 'on' && endDate ? { endDate } : {}),
    ...(ends === 'after' && count > 0 ? { count } : {}),
  }), [kind, every, quarterNth, yearMonths, dailyWorkdays, weekdays, days, startDate, today, ends, endDate, count])
  const autoText = (() => {
    const what = AUTO_DATES.find((d) => d.value === autoDate)!.label.replace(' (every year)', '').toLowerCase()
    const when = autoWhen === 'on' ? 'is today' : autoWhen === 'before' ? `is in ${autoDays} day${autoDays === 1 ? '' : 's'}` : `was ${autoDays} day${autoDays === 1 ? '' : 's'} ago`
    return `Every day at ${validTimes.map(time12).join(' and ') || '…'}, each client whose ${what} ${when} gets this email.`
  })()

  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute with the inputs, not every render's clock
  const now = useMemo(() => new Date(), [open, kind, dates, times, rule])
  const onceRuns = useMemo(() => dates.filter(Boolean).flatMap((d) => validTimes.map((t) => at(d, t))).sort((a, b) => +a - +b),
    [dates, validTimes])
  const runs = kind === 'once' ? onceRuns : nextRuns(rule, validTimes, now, 5)

  const issue = (() => {
    if (!validTimes.length) return 'Add a send time.'
    if (kind === 'once') {
      if (!dates.some(Boolean)) return 'Pick a date.'
      const past = onceRuns.find((d) => d <= now)
      return past ? `${fmt(past)} has already passed.` : null
    }
    if (kind === 'auto') {
      if (!groupSend) return 'This sends to All clients or A group. Change who it goes to under “To”.'
      if (autoWhen !== 'on' && autoDays < 1) return 'Enter how many days.'
      if (ends === 'on' && (!endDate || endDate < rule.startDate)) return 'Pick an end date after the start date.'
      return null
    }
    if (every === 'week' && !weekdays.length) return 'Pick at least one day of the week.'
    if (every === 'year' && !yearMonths.length) return 'Pick at least one month.'
    if (!['day', 'week'].includes(every) && !days.length) return 'Pick at least one day of the month.'
    if (ends === 'on' && (!endDate || endDate < rule.startDate)) return 'Pick an end date after the start date.'
    if (!runs.length) return 'No send falls on these dates. Try “Last day” for months without that date.'
    return null
  })()
  const blocked = problem ?? issue

  const submit = () => {
    if (blocked) return
    const timeZoneOffset = browserOffset()
    const valid = dates.filter(Boolean)
    if (kind === 'auto') {
      onSchedule({ type: 'repeat', repeat: rule, times: validTimes, timeZoneOffset }, toDateRule(autoDate, autoWhen, autoDays))
      return
    }
    onSchedule(kind === 'repeat'
      ? { type: 'repeat', repeat: rule, times: validTimes, timeZoneOffset }
      : valid.length === 1
        ? { type: 'single_date', date: valid[0], times: validTimes, timeZoneOffset }
        : { type: 'multiple_dates', dates: [...new Set(valid)].sort(), times: validTimes, timeZoneOffset })
  }

  const quick = (date: Date, time: string) => { setKind('once'); setDates([ymd(date)]); setTimes([time]) }
  const now0 = new Date()
  const nextMonday = addDays(now0, ((8 - now0.getDay()) % 7) || 7)
  const firstNextMonth = new Date(now0.getFullYear(), now0.getMonth() + 1, 1)
  const longMonthDays = days.some((d) => d > 28)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2 text-lg"><CalendarClock className="h-5 w-5 text-primary" /> Schedule this email</SheetTitle>
          <SheetDescription>To {audience}. Times are in your time zone (GMT{browserOffset()}).</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div role="radiogroup" aria-label="How often" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {([['once', 'Send once', CalendarClock], ['repeat', 'Repeat', Repeat], ['auto', 'On a client date', CalendarHeart]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                className={cn('flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors',
                  kind === k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {kind === 'auto' ? (
            <>
              <p className="text-sm text-muted-foreground">
                Checked every day: each client gets this email when their date comes round. Good for follow-up reminders and onboarding anniversaries.
              </p>
              <Field label="Their">
                <select value={autoDate} aria-label="Which date" onChange={(e) => { const v = e.target.value as AutoDate; setAutoDate(v); if (v === 'anniversary' && autoWhen === 'after') setAutoWhen('before') }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {AUTO_DATES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Field>
              <Field label="Send">
                <div className="flex flex-wrap items-center gap-2">
                  {autoWhen !== 'on' && (
                    <Input type="number" min={1} max={365} value={autoDays} aria-label="Days" className="h-10 w-20 text-sm"
                      onChange={(e) => setAutoDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
                  )}
                  {(['before', 'on', 'after'] as const).filter((w) => !(autoDate === 'anniversary' && w === 'after')).map((w) => (
                    <Chip key={w} on={autoWhen === w} onClick={() => setAutoWhen(w)}>
                      {w === 'before' ? 'days before' : w === 'on' ? 'on the day' : 'days after'}
                    </Chip>
                  ))}
                </div>
              </Field>
            </>
          ) : kind === 'once' ? (
            <>
              <Field label="Quick pick">
                <div className="flex flex-wrap gap-2">
                  <Chip on={false} onClick={() => quick(addDays(now0, 1), '09:00')}>Tomorrow, 9 AM</Chip>
                  <Chip on={false} onClick={() => quick(nextMonday, '09:00')}>Next Monday, 9 AM</Chip>
                  <Chip on={false} onClick={() => quick(firstNextMonth, '10:00')}>1st of next month, 10 AM</Chip>
                </div>
              </Field>
              <Field label={dates.length > 1 ? 'Dates' : 'Date'}>
                <div className="space-y-2">
                  {dates.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="date" min={today} value={d} aria-label={`Date ${i + 1}`} className="h-10 text-sm"
                        onChange={(e) => setDates((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} />
                      {dates.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" aria-label="Remove this date" onClick={() => setDates((xs) => xs.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="gap-1 px-2 text-primary" onClick={() => setDates((xs) => [...xs, ''])}>
                    <Plus className="h-4 w-4" /> Add another date
                  </Button>
                </div>
              </Field>
            </>
          ) : (
            <>
              <Field label="Every">
                <div className="flex flex-wrap gap-2">
                  {EVERY.map((e) => <Chip key={e.value} on={every === e.value} onClick={() => setEvery(e.value)}>{e.label}</Chip>)}
                </div>
              </Field>

              {every === 'day' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={dailyWorkdays} onChange={(e) => setDailyWorkdays(e.target.checked)} />
                  Only on weekdays (Mon–Fri)
                </label>
              )}

              {every === 'week' && (
                <Field label="On">
                  <div className="flex flex-wrap gap-2">
                    {WEEK_ORDER.map((d) => <Chip key={d} className="w-14 px-0" on={weekdays.includes(d)} onClick={() => setWeekdays((xs) => toggle(xs, d))}>{WEEKDAYS[d]}</Chip>)}
                  </div>
                </Field>
              )}

              {every === 'quarter' && (
                <Field label="In the quarter's">
                  <div className="flex flex-wrap gap-2">
                    {[0, 1, 2].map((n) => (
                      <Chip key={n} on={quarterNth === n} onClick={() => setQuarterNth(n)}>
                        {ordinal(n + 1)} month <span className="ml-1 font-normal opacity-80">({quarterMonths(n).map((m) => MONTHS[m - 1]).join(', ')})</span>
                      </Chip>
                    ))}
                  </div>
                </Field>
              )}

              {every === 'year' && (
                <Field label="In" hint="pick one or more months">
                  <div className="grid grid-cols-6 gap-2">
                    {ALL_MONTHS.map((m) => <Chip key={m} className="px-0" on={yearMonths.includes(m)} onClick={() => setYearMonths((xs) => toggle(xs, m))}>{MONTHS[m - 1]}</Chip>)}
                  </div>
                </Field>
              )}

              {['month', 'quarter', 'year'].includes(every) && (
                <Field label="On day" hint="pick one or more">
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <Chip key={d} className="h-9 px-0" on={days.includes(d)} onClick={() => setDays((xs) => toggle(xs, d))}>{d}</Chip>
                    ))}
                    <Chip className="col-span-4 h-9 px-0" on={days.includes(-1)} onClick={() => setDays((xs) => toggle(xs, -1))}>Last day</Chip>
                  </div>
                  {longMonthDays && <p className="text-sm text-muted-foreground">Months without that date are skipped. Pick “Last day” to cover every month.</p>}
                </Field>
              )}
            </>
          )}

          <Field label={validTimes.length > 1 ? 'Times' : 'Time'}>
            <div className="flex flex-wrap items-center gap-2">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input type="time" value={t} aria-label={`Time ${i + 1}`} className="h-10 w-36 text-sm"
                    onChange={(e) => setTimes((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} />
                  {times.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove this time" onClick={() => setTimes((xs) => xs.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" className="gap-1 px-2 text-primary" onClick={() => setTimes((xs) => [...xs, ''])}>
                <Plus className="h-4 w-4" /> Add time
              </Button>
            </div>
          </Field>

          {kind !== 'once' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts">
                <Input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 text-sm" aria-label="Start date" />
              </Field>
              <Field label="Ends">
                <select value={ends} onChange={(e) => setEnds(e.target.value as typeof ends)} aria-label="Ends"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="never">Never (until stopped)</option>
                  <option value="on">On a date</option>
                  {kind === 'repeat' && <option value="after">After a number of sends</option>}
                </select>
                {ends === 'on' && <Input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 text-sm" aria-label="End date" />}
                {ends === 'after' && (
                  <div className="flex items-center gap-2 text-sm">
                    <Input type="number" min={1} max={1000} value={count} onChange={(e) => setCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))} className="h-10 w-24 text-sm" aria-label="Number of sends" />
                    sends
                  </div>
                )}
              </Field>
            </div>
          )}

          <section aria-live="polite" className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-semibold">
              {kind === 'auto' ? autoText
                : kind === 'repeat' ? describeRepeat({ ...rule, frequency: every }, validTimes)
                : `${runs.length} send${runs.length === 1 ? '' : 's'}`}
            </p>
            {kind !== 'auto' && runs.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm text-muted-foreground">{kind === 'repeat' ? 'Next sends' : 'Goes out'}</p>
                <ul className="space-y-1 text-sm">
                  {runs.slice(0, 5).map((d) => (
                    <li key={+d} className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> {fmt(d)}</li>
                  ))}
                  {kind === 'once' && runs.length > 5 && <li className="text-muted-foreground">and {runs.length - 5} more</li>}
                </ul>
              </div>
            )}
            {kind !== 'once' && <p className="text-sm text-muted-foreground">Pause or stop it any time from Scheduled Mails.</p>}
          </section>
        </div>

        <SheetFooter className="border-t px-6 py-4">
          <div className="w-full space-y-2">
            {blocked && <p role="alert" className="text-sm text-destructive">{blocked}</p>}
            <Button type="button" className="h-11 w-full gap-2 text-base" disabled={busy || !!blocked} onClick={submit}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Scheduling…</>
                : kind === 'auto' ? <><CalendarHeart className="h-4 w-4" /> Turn on</>
                : kind === 'repeat' ? <><Repeat className="h-4 w-4" /> Start repeating</>
                : <><CalendarClock className="h-4 w-4" /> Schedule{runs.length > 1 ? ` ${runs.length} sends` : ''}</>}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
