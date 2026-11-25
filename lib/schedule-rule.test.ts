import { describe, expect, it } from 'vitest'
import { ALL_MONTHS, describeRepeat, firesOn, nextRuns, ordinal, quarterMonths, time12, ymd } from './schedule-rule'

describe('firesOn', () => {
  it('handles the last day of the month, weekdays, months and the date window', () => {
    expect(firesOn({ months: ALL_MONTHS, days: [-1] }, 2027, 2, 28)).toBe(true)
    expect(firesOn({ months: ALL_MONTHS, days: [-1] }, 2028, 2, 28)).toBe(false)
    expect(firesOn({ months: ALL_MONTHS, weekdays: [1] }, 2026, 11, 23)).toBe(true) // a Monday
    expect(firesOn({ months: quarterMonths(0), days: [7] }, 2026, 8, 7)).toBe(false)
    expect(firesOn({ months: ALL_MONTHS, days: [1], endDate: '2026-12-31' }, 2027, 1, 1)).toBe(false)
  })
})

describe('nextRuns', () => {
  const from = new Date(2026, 10, 22, 12, 0) // 22 Nov 2026, noon

  it('skips times already past today and stops at the count', () => {
    const runs = nextRuns({ months: ALL_MONTHS, weekdays: [0, 1, 2, 3, 4, 5, 6], count: 3 }, ['09:00', '18:00'], from, 10)
    expect(runs.map((d) => `${ymd(d)} ${d.getHours()}`)).toEqual(['2026-11-22 18', '2026-11-23 9', '2026-11-23 18'])
  })

  it('quarterly on the 7th', () => {
    const runs = nextRuns({ months: quarterMonths(0), days: [7] }, ['10:00'], from, 3)
    expect(runs.map(ymd)).toEqual(['2027-01-07', '2027-04-07', '2027-07-07'])
  })

  it('starts on the start date', () => {
    expect(nextRuns({ months: ALL_MONTHS, days: [1], startDate: '2027-03-01' }, ['10:00'], from, 1).map(ymd)).toEqual(['2027-03-01'])
  })
})

describe('wording', () => {
  it('reads naturally', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(22)).toBe('22nd')
    expect(time12('00:05')).toBe('12:05 AM')
    expect(time12('14:30')).toBe('2:30 PM')
    expect(describeRepeat({ frequency: 'month', months: ALL_MONTHS, days: [20] }, ['10:00'])).toBe('Every month on the 20th at 10:00 AM')
    expect(describeRepeat({ frequency: 'day', months: ALL_MONTHS, weekdays: [1, 2, 3, 4, 5], count: 10 }, ['09:00']))
      .toBe('Every weekday (Mon–Fri) at 9:00 AM · 10 times')
    expect(describeRepeat({ frequency: 'quarter', months: quarterMonths(0), days: [-1, 7] }, []))
      .toBe('Every quarter on the 7th and last day of Jan, Apr, Jul and Oct')
    // an older monthly repeat with no frequency saved
    expect(describeRepeat({ months: [1, 6], days: [1] }, ['10:00'])).toBe('Every year on the 1st of Jan and Jun at 10:00 AM')
  })
})
