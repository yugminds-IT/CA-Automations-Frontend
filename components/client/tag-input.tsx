'use client'

// Tags on a contact ("VIP", "Class 10"): typed freely, suggested from the org's existing tags and the industry's starters.
import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const MAX_TAG_LENGTH = 40

/** Trimmed, single-spaced, case-insensitive repeats dropped (same rules as the server). */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  return tags
    .map((t) => t.replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH))
    .filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
}

export function TagChips({ tags, className }: { tags?: string[]; className?: string }) {
  if (!tags?.length) return null
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((t) => (
        <span key={t} className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">{t}</span>
      ))}
    </span>
  )
}

export function TagInput({ id, value, onChange, suggestions = [], placeholder = 'Type a tag and press Enter' }: {
  id?: string
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}) {
  const listId = useId()
  const [draft, setDraft] = useState('')
  const add = (text: string) => {
    const next = normalizeTags([...value, ...text.split(',')])
    if (next.length !== value.length) onChange(next)
    setDraft('')
  }
  const taken = new Set(value.map((t) => t.toLowerCase()))
  const offered = normalizeTags(suggestions).filter((s) => !taken.has(s.toLowerCase()))

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-sm font-medium text-primary">
            {t}
            <button type="button" aria-label={`Remove tag ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}
              className="rounded-full p-0.5 hover:bg-primary/15">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          aria-label={id ? undefined : "Tags"}
          list={listId}
          value={draft}
          maxLength={MAX_TAG_LENGTH}
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(draft) }
            else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <datalist id={listId}>{offered.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
      {offered.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Suggestions:</span>
          {offered.slice(0, 8).map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="rounded-full border border-dashed border-input px-2 py-0.5 text-xs text-foreground/80 hover:border-primary hover:text-primary">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
