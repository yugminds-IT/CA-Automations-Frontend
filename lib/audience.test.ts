import { describe, expect, it } from 'vitest'
import { matchesRules, parseAddresses, type Rule } from './audience'

const today = '2026-11-22'
const c = {
  businessType: 'LLP',
  services: [{ name: 'GST' }, { name: 'Audit' }],
  status: 'active',
  city: 'Pune',
  state: 'Maharashtra',
  followUpOn: '2026-11-25',
  onboardedOn: '2026-01-10',
}
type NoId<T> = T extends unknown ? Omit<T, 'id'> : never
const ok = (...rules: NoId<Rule>[]) => matchesRules(c, rules.map((r, i) => ({ ...r, id: String(i) }) as Rule), today)

describe('matchesRules', () => {
  it('choice fields: any of / none of, case-insensitive; empty rule ignored', () => {
    expect(ok({ field: 'businessType', op: 'any', values: ['llp', 'Pvt Ltd'] })).toBe(true)
    expect(ok({ field: 'service', op: 'any', values: ['TDS'] })).toBe(false)
    expect(ok({ field: 'service', op: 'none', values: ['TDS'] })).toBe(true)
    expect(ok({ field: 'city', op: 'none', values: ['Pune'] })).toBe(false)
    expect(ok({ field: 'state', op: 'any', values: [] })).toBe(true)
  })

  it('all rules must hold', () => {
    expect(ok({ field: 'status', op: 'any', values: ['active'] }, { field: 'city', op: 'any', values: ['Delhi'] })).toBe(false)
  })

  it('dates: due in the next N days, overdue, onboarded in the last N days or longer ago', () => {
    expect(ok({ field: 'followUp', op: 'next', days: 7 })).toBe(true)
    expect(ok({ field: 'followUp', op: 'next', days: 2 })).toBe(false)
    expect(ok({ field: 'followUp', op: 'overdue', days: 0 })).toBe(false)
    expect(matchesRules({ followUpOn: '2026-11-01' }, [{ id: 'a', field: 'followUp', op: 'overdue', days: 0 }], today)).toBe(true)
    expect(ok({ field: 'onboard', op: 'last', days: 30 })).toBe(false)
    expect(ok({ field: 'onboard', op: 'older', days: 180 })).toBe(true)
    expect(matchesRules({}, [{ id: 'a', field: 'onboard', op: 'last', days: 30 }], today)).toBe(false)
  })

  it('dates: exactly N days ahead or ago, and yearly anniversaries', () => {
    const at = (c: { followUpOn?: string; onboardedOn?: string }, r: NoId<Rule>) =>
      matchesRules(c, [{ id: 'x', ...r } as Rule], '2026-11-22')
    expect(at({ followUpOn: '2026-11-25' }, { field: 'followUp', op: 'on', days: 3 })).toBe(true)
    expect(at({ followUpOn: '2026-11-26' }, { field: 'followUp', op: 'on', days: 3 })).toBe(false)
    expect(at({ followUpOn: '2026-11-22' }, { field: 'followUp', op: 'on', days: 0 })).toBe(true)
    expect(at({ onboardedOn: '2026-11-15' }, { field: 'onboard', op: 'ago', days: 7 })).toBe(true)
    expect(at({ onboardedOn: '2024-11-29' }, { field: 'onboard', op: 'yearly', days: 7 })).toBe(true)
    expect(at({ onboardedOn: '2024-11-22' }, { field: 'onboard', op: 'yearly', days: 0 })).toBe(true)
    expect(at({ onboardedOn: '2027-11-22' }, { field: 'onboard', op: 'yearly', days: 0 })).toBe(false) // not yet happened
  })
})

describe('tags and custom fields', () => {
  const t = { tags: ['VIP', 'Class 10'], custom: { batch: '2026', policy: '' } }
  const has = (...rules: NoId<Rule>[]) => matchesRules(t, rules.map((r, i) => ({ ...r, id: String(i) }) as Rule), today)
  it('tags: has any / none of, no tags, has tags', () => {
    expect(has({ field: 'tags', op: 'any', values: ['vip'] })).toBe(true)
    expect(has({ field: 'tags', op: 'none', values: ['Class 10'] })).toBe(false)
    expect(has({ field: 'tags', op: 'filled', values: [] })).toBe(true)
    expect(matchesRules({}, [{ id: 'a', field: 'tags', op: 'empty', values: [] }], today)).toBe(true)
  })
  it('custom fields: value match, blank counts as empty', () => {
    expect(has({ field: 'custom:batch', op: 'any', values: ['2026'] })).toBe(true)
    expect(has({ field: 'custom:policy', op: 'empty', values: [] })).toBe(true)
    expect(has({ field: 'custom:missing', op: 'filled', values: [] })).toBe(false)
  })
})

describe('parseAddresses', () => {
  it('splits lines, commas, semicolons, tabs and spaces; reads "Name <email>"; dedupes', () => {
    const r = parseAddresses('Asha <ASHA@x.com>, ravi@x.com; ravi@X.com\n\tbad@\n"kim@y.org" lee@y.org\nJohn Smith')
    expect(r.valid).toEqual(['asha@x.com', 'ravi@x.com', 'kim@y.org', 'lee@y.org'])
    expect(r.invalid).toEqual(['bad@', 'John Smith'])
    expect(r.duplicates).toBe(1)
  })

  it('empty input', () => {
    expect(parseAddresses('  \n, ;')).toEqual({ valid: [], invalid: [], duplicates: 0 })
  })
})

describe('saved rules', () => {
  it('round-trips through the stored shape and compares without ids', async () => {
    const { plainRules, toRules, sameRules } = await import('./audience')
    const rules: import('./audience').Rule[] = [
      { id: 'a', field: 'tags', op: 'any', values: ['vip'] },
      { id: 'b', field: 'followUp', op: 'next', days: 7 },
    ]
    const stored = JSON.parse(JSON.stringify(plainRules(rules)))
    expect(stored).toEqual([{ field: 'tags', op: 'any', values: ['vip'] }, { field: 'followUp', op: 'next', days: 7 }])
    const back = toRules(stored)
    expect(back[0].id).not.toBe('a')
    expect(sameRules(back, rules)).toBe(true)
    expect(sameRules(back, [rules[0]])).toBe(false)
  })
})
