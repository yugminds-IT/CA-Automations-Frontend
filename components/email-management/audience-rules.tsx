'use client'

// "A group" in the recipients panel: conditions on contact fields, all of which must hold.
import { Plus, XClose, ChevronDown } from '@untitled-ui/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { ChoiceField, ChoiceOp, DateField, DateOp, Rule } from '@/lib/audience'

export interface RuleFieldInfo {
  field: ChoiceField | DateField
  label: string
  /** Choice fields only: the values to pick from */
  options?: string[]
}

const DATE_OPS: Record<DateField, { op: DateOp; text: string }[]> = {
  followUp: [{ op: 'next', text: 'is in the next' }, { op: 'overdue', text: 'has passed' }, { op: 'last', text: 'was in the last' },
    { op: 'on', text: 'is exactly' }, { op: 'ago', text: 'was exactly' }],
  onboard: [{ op: 'last', text: 'was in the last' }, { op: 'older', text: 'is more than' }, { op: 'next', text: 'is in the next' },
    { op: 'ago', text: 'was exactly' }, { op: 'yearly', text: 'anniversary is in' }],
}
const isDate = (f: string): f is DateField => f === 'followUp' || f === 'onboard'

/** Short text for the "To" chip, e.g. "LLP, Pvt Ltd · Follow-up date in 7 days" */
export function describeRules(rules: Rule[], fields: RuleFieldInfo[]): string {
  return rules
    .map((r) => {
      const label = fields.find((f) => f.field === r.field)?.label ?? r.field
      if (!('values' in r)) {
        if (r.op === 'overdue') return `${label} passed`
        if (r.op === 'older') return `${label} over ${r.days} days ago`
        if (r.op === 'on') return r.days ? `${label} in exactly ${r.days} days` : `${label} is today`
        if (r.op === 'ago') return r.days ? `${label} exactly ${r.days} days ago` : `${label} is today`
        if (r.op === 'yearly') return r.days ? `${label} anniversary in ${r.days} days` : `${label} anniversary today`
        return `${label} ${r.op === 'next' ? 'in next' : 'in last'} ${r.days} days`
      }
      if (r.op === 'empty') return `No ${label.toLowerCase()}`
      if (r.op === 'filled') return `Has ${label.toLowerCase()}`
      if (!r.values.length) return ''
      return `${r.op === 'none' ? 'Not ' : ''}${r.values.join(', ')}`
    })
    .filter(Boolean)
    .join(' · ')
}

export function AudienceRules({ rules, onChange, fields }: { rules: Rule[]; onChange: (rules: Rule[]) => void; fields: RuleFieldInfo[] }) {
  const update = (id: string, patch: Partial<Rule>) => onChange(rules.map((r) => (r.id === id ? ({ ...r, ...patch } as Rule) : r)))
  const add = (field: RuleFieldInfo['field']) => {
    const id = crypto.randomUUID()
    onChange([...rules, isDate(field) ? { id, field, op: DATE_OPS[field][0].op, days: field === 'onboard' ? 30 : 7 } : { id, field, op: 'any', values: [] }])
  }
  const select = 'h-9 rounded-md border border-input bg-background px-2 text-sm'

  return (
    <div className="space-y-2">
      {rules.length === 0 && <p className="text-sm text-muted-foreground">No conditions yet: everyone is in the group. Add one to narrow it down.</p>}
      {rules.map((r, i) => {
        const info = fields.find((f) => f.field === r.field)
        return (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-2">
            <span className="text-sm font-medium">{i > 0 && <span className="mr-1 font-normal text-muted-foreground">and</span>}{info?.label}</span>
            {'values' in r ? (
              <>
                <select aria-label={`${info?.label} condition`} className={select} value={r.op} onChange={(e) => update(r.id, { op: e.target.value as ChoiceOp })}>
                  <option value="any">{r.field === 'tags' ? 'has any of' : 'is any of'}</option>
                  <option value="none">{r.field === 'tags' ? 'has none of' : 'is none of'}</option>
                  <option value="filled">{r.field === 'tags' ? 'has any tag' : 'is filled in'}</option>
                  <option value="empty">{r.field === 'tags' ? 'has no tags' : 'is empty'}</option>
                </select>
                {(r.op === 'any' || r.op === 'none') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 min-w-0 max-w-full flex-1 justify-between gap-1 px-3">
                      <span className="truncate">{r.values.length === 0 ? 'Choose…' : r.values.length <= 2 ? r.values.join(', ') : `${r.values.length} chosen`}</span>
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-64 w-56 overflow-y-auto">
                    {!info?.options?.length ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No {info?.label.toLowerCase()} saved on any contact yet</div>
                    ) : info.options.map((opt) => {
                      const on = r.values.includes(opt)
                      return (
                        <DropdownMenuItem key={opt} onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2"
                          onClick={() => update(r.id, { values: on ? r.values.filter((v) => v !== opt) : [...r.values, opt] })}>
                          <input type="checkbox" readOnly checked={on} tabIndex={-1} className="h-4 w-4 accent-primary" />
                          <span className={on ? 'font-medium' : ''}>{opt}</span>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </>
            ) : (
              <>
                <select aria-label={`${info?.label} condition`} className={select} value={r.op}
                  onChange={(e) => update(r.id, { op: e.target.value as DateOp })}>
                  {DATE_OPS[r.field].map((o) => <option key={o.op} value={o.op}>{o.text}</option>)}
                </select>
                {r.op !== 'overdue' && (
                  <>
                    <Input type="number" min={0} max={3650} aria-label="Days" className="h-9 w-20" value={r.days}
                      onChange={(e) => update(r.id, { days: Math.max(0, Math.min(3650, Number(e.target.value) || 0)) })} />
                    <span className="text-sm text-muted-foreground">days{r.op === 'older' || r.op === 'ago' ? ' ago' : r.op === 'on' ? ' from today' : ''}</span>
                  </>
                )}
              </>
            )}
            <button type="button" aria-label={`Remove ${info?.label} condition`} onClick={() => onChange(rules.filter((x) => x.id !== r.id))}
              className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <XClose className="h-4 w-4" />
            </button>
          </div>
        )
      })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 bg-background">
            <Plus className="h-4 w-4" /> Add condition
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {fields.map((f) => <DropdownMenuItem key={f.field} onSelect={() => add(f.field)}>{f.label}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
