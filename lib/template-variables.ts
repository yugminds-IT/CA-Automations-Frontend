'use client'

/**
 * Template variables: one list for every editor, picker and send flow.
 * The catalog comes from the backend (GET /email-templates/variables) so frontend and server agree;
 * the org's industry adds its own client fields on top.
 */
import { useEffect, useMemo, useState } from 'react'
import { getVariables } from '@/lib/api/email-templates'
import { listCustomVariables, type CustomVariable } from '@/lib/api/custom-variables'
import type { IndustryMailConfig } from '@/lib/industry-config'

/** Who fills the value. 'custom' = the org's own variable (default / per-client value);
 *  'unknown' = not defined anywhere (typo or one-off): asked for when sending. */
export type VariableSource = 'client' | 'org' | 'system' | 'login' | 'send' | 'custom' | 'unknown'

export interface TemplateVar {
  /** "{{client_name}}" */
  token: string
  /** "client_name" */
  key: string
  label: string
  group: string
  source: VariableSource
  example: string
}

export const TOKEN_RE = /\{\{\s*(\w+)\s*\}\}/g

export const keyOf = (token: string) => token.replace(/[{}\s]/g, '')

/** "login_url" -> "Login Url" for variables that aren't in the catalog. */
export const humanize = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/** Variable keys used in a piece of text, in order, once each. */
export function usedVariables(text: string): string[] {
  return [...new Set([...text.matchAll(TOKEN_RE)].map((m) => m[1]))]
}

let catalogPromise: Promise<TemplateVar[]> | null = null
function loadCatalog(): Promise<TemplateVar[]> {
  catalogPromise ??= getVariables()
    .then((list) =>
      (Array.isArray(list) ? list : []).map((v: any) => ({
        token: `{{${keyOf(v.key)}}}`,
        key: keyOf(v.key),
        label: v.label,
        group: v.group ?? 'Other',
        source: (v.source ?? 'client') as VariableSource,
        example: v.example ?? '',
      })),
    )
    .catch((e) => {
      catalogPromise = null // retry on next mount
      throw e
    })
  return catalogPromise
}

/** Catalog + the industry's own client fields + the org's custom variables. */
export function useTemplateVariables(industry?: IndustryMailConfig | null) {
  const [catalog, setCatalog] = useState<TemplateVar[]>([])
  const [custom, setCustom] = useState<CustomVariable[]>([])
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    let alive = true
    loadCatalog().then((c) => alive && setCatalog(c)).catch(() => alive && setError(true))
    return () => { alive = false }
  }, [])
  useEffect(() => {
    let alive = true
    // not fatal: master admins (no org) and older backends just have none
    listCustomVariables().then((c) => alive && setCustom(Array.isArray(c) ? c : [])).catch(() => alive && setCustom([]))
    return () => { alive = false }
  }, [reloadKey])

  return useMemo(() => {
    const known = new Set(catalog.map((v) => v.key))
    const extra: TemplateVar[] = (industry?.variables ?? [])
      .filter((v) => !known.has(keyOf(v.value)))
      .map((v) => ({
        token: v.value, key: keyOf(v.value), label: v.label,
        group: `${industry!.recipientSingular} Fields`, source: 'client' as const, example: '',
      }))
    // industry fields go right after the Client group
    const firstOther = catalog.findIndex((v) => v.group !== 'Client')
    const cut = firstOther < 0 ? catalog.length : firstOther
    const own: TemplateVar[] = custom.map((c) => ({
      token: `{{${c.key}}}`, key: c.key, label: c.label, group: 'Custom', source: 'custom', example: c.defaultValue,
    }))
    const vars = [...catalog.slice(0, cut), ...extra, ...catalog.slice(cut), ...own]
    return { vars, custom, reloadCustom: () => setReloadKey((k) => k + 1), loading: !catalog.length && !error, error }
  }, [catalog, custom, error, industry])
}

/** Group variables for pickers, keeping catalog order. */
export function groupVariables(vars: TemplateVar[]): { label: string; vars: TemplateVar[] }[] {
  const groups: { label: string; vars: TemplateVar[] }[] = []
  for (const v of vars) {
    let g = groups.find((x) => x.label === v.group)
    if (!g) groups.push((g = { label: v.group, vars: [] }))
    g.vars.push(v)
  }
  return groups
}

export function findVariable(vars: TemplateVar[], key: string): TemplateVar | undefined {
  return vars.find((v) => v.key === key)
}

/** Closest known variable for a likely typo ({{clent_name}} -> Client Name), or undefined. */
export function suggestVariable(vars: TemplateVar[], key: string): TemplateVar | undefined {
  let best: TemplateVar | undefined
  let bestD = 3
  for (const v of vars) {
    const d = editDistance(key.toLowerCase(), v.key)
    if (d < bestD) { bestD = d; best = v }
  }
  return best
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

/** Same values the server fills (see backend template-render.ts systemVariables). */
export function systemVariables(now = new Date(), timeZone = 'Asia/Kolkata'): Record<string, string> {
  const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(now)
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'numeric', timeZone }).formatToParts(now)
  const y = Number(parts.find((p) => p.type === 'year')!.value)
  const m = Number(parts.find((p) => p.type === 'month')!.value)
  const start = m >= 4 ? y : y - 1
  const fy = (s: number) => `${s}-${String((s + 1) % 100).padStart(2, '0')}`
  return { today: date, current_date: date, date, financial_year: fy(start), assessment_year: fy(start + 1) }
}

/** "2026-12-15" -> "15 December 2026"; '' for empty/invalid. */
export function formatDate(value?: string | Date | null): string {
  if (!value) return ''
  const d = new Date(value)
  return isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

/** Sample values for previews where no real recipient is chosen. */
export function exampleValues(vars: TemplateVar[]): Record<string, string> {
  return { ...Object.fromEntries(vars.map((v) => [v.key, v.example || `[${v.label}]`])), ...systemVariables() }
}

/** One client's custom values: each variable's default, overridden by that client's own value. */
export function customValuesFor(custom: CustomVariable[], clientId?: string | number | null): Record<string, string> {
  return Object.fromEntries(custom.map((c) => [c.key, (clientId != null && c.values?.[String(clientId)]) || c.defaultValue || '']))
}
