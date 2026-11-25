// When a scheduled or repeating email goes out: the preview and wording in the Schedule sheet
// and the Emails page. The server decides with the same rule (ca-backend-nest repeat-rule.ts).
import type { RepeatRule } from './api/types'

export const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Months of each quarter by its 1st, 2nd or 3rd month (Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar) */
export const quarterMonths = (nth: number) => [1 + nth, 4 + nth, 7 + nth, 10 + nth]

/** What decides the dates: a new rule, or one saved on the server */
export interface RepeatDates {
  months: number[]
  days?: number[]
  weekdays?: number[] | null
  startDate?: string | null
  endDate?: string | null
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Local YYYY-MM-DD */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Does it go out on this date? `days` may hold -1 for the last day of the month. */
export function firesOn(r: RepeatDates, year: number, month: number, day: number): boolean {
  const date = `${year}-${pad(month)}-${pad(day)}`
  if (r.startDate && date < r.startDate) return false
  if (r.endDate && date > r.endDate) return false
  if (!r.months.includes(month)) return false
  if (r.weekdays?.length) return r.weekdays.includes(new Date(year, month - 1, day).getDay())
  const days = r.days ?? []
  const last = new Date(year, month, 0).getDate()
  return days.includes(day) || (day === last && days.includes(-1))
}

/** A local Date for a YYYY-MM-DD date and HH:MM time */
export const at = (date: string, time: string) => {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

/** The next `n` sends after `from` (at most `count` in all), looking up to ~3 years ahead. */
export function nextRuns(r: RepeatDates & { count?: number }, times: string[], from: Date, n = 5): Date[] {
  const slots = [...new Set(times.filter(Boolean))].sort()
  const out: Date[] = []
  if (!slots.length) return out
  const limit = Math.min(n, r.count ?? Infinity)
  const day = r.startDate ? at(r.startDate, '00:00') : new Date(from.getFullYear(), from.getMonth(), from.getDate())
  for (let i = 0; i < 1200 && out.length < limit; i++, day.setDate(day.getDate() + 1)) {
    if (!firesOn(r, day.getFullYear(), day.getMonth() + 1, day.getDate())) continue
    for (const t of slots) {
      const when = at(ymd(day), t)
      if (when > from && out.length < limit) out.push(when)
    }
  }
  return out
}

export const ordinal = (n: number) => {
  if (n === -1) return 'last day'
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${s}`
}

/** "14:30" → "2:30 PM" */
export const time12 = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}

/** "a, b and c" */
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

const sameSet = (a: number[], b: number[]) => a.length === b.length && b.every((x) => a.includes(x))

/** Plain words, e.g. "Every month on the 20th at 10:00 AM · 12 times" */
export function describeRepeat(
  r: RepeatDates & { frequency?: RepeatRule['every'] | null; count?: number | null },
  times: string[],
): string {
  const days = [...(r.days ?? [])].sort((a, b) => (a === -1 ? 99 : a) - (b === -1 ? 99 : b))
  const onDays = days.length ? `the ${list(days.map(ordinal))}` : ''
  const months = [...r.months].sort((a, b) => a - b)
  const wd = r.weekdays ?? []
  const every = r.frequency ?? (sameSet(months, ALL_MONTHS) ? 'month' : 'year')
  let what: string
  if (every === 'day' || every === 'week') {
    if (sameSet(wd, [0, 1, 2, 3, 4, 5, 6])) what = 'Every day'
    else if (sameSet(wd, [1, 2, 3, 4, 5])) what = 'Every weekday (Mon–Fri)'
    else what = `Every week on ${list([...wd].sort().map((d) => WEEKDAYS[d]))}`
  } else if (every === 'month') what = `Every month on ${onDays}`
  else if (every === 'quarter') what = `Every quarter on ${onDays} of ${list(months.map((m) => MONTHS[m - 1]))}`
  else what = `Every year on ${onDays} of ${list(months.map((m) => MONTHS[m - 1]))}`
  const when = times.length ? ` at ${list([...times].sort().map(time12))}` : ''
  const ends = r.endDate
    ? ` · until ${at(r.endDate, '00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : r.count ? ` · ${r.count} time${r.count > 1 ? 's' : ''}` : ''
  return what + when + ends
}

/** The browser's UTC offset, e.g. "+05:30" */
export function browserOffset(d = new Date()) {
  const min = -d.getTimezoneOffset()
  const abs = Math.abs(min)
  return `${min >= 0 ? '+' : '-'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}
