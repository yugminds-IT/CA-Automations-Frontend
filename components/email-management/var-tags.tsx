'use client'

/**
 * Variable tags (Teams-mention style) shared by every editor: one-line subject boxes, message
 * editors, the "@" picker and the variable picker button. Tags show a label; the raw {{token}}
 * lives in data-var and is what gets saved/sent (see stripChips / chipText).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TOKEN_RE, groupVariables, humanize, keyOf, suggestVariable, usedVariables, type TemplateVar } from '@/lib/template-variables'
import { VAR_CHIP_CLASS, VAR_CHIP_CUSTOM_CLASS, chipText, escapeHtml } from './send-mails-utils'
import { parseInert, safeHtml } from '@/lib/safe-html'

export function chipHtml(token: string, vars: TemplateVar[]): string {
  const key = keyOf(token)
  const v = vars.find((x) => x.key === key)
  const title = v ? `{{${key}}}` : `{{${key}}} — not a saved variable. Click to fill it in or save it as a custom variable.`
  return `<span contenteditable="false" data-var="{{${key}}}" title="${escapeHtml(title)}" class="${v || !vars.length ? VAR_CHIP_CLASS : VAR_CHIP_CUSTOM_CLASS}">${escapeHtml(v?.label ?? humanize(key))}</span>`
}

/** Turn {{tokens}} in TEXT into tags. Tokens inside attributes (href="{{login_url}}") stay as they are. */
export function chipify(html: string, vars: TemplateVar[]): string {
  if (typeof document === 'undefined') return ''
  // Template HTML is not trusted: parse it without running anything, and clean what comes out.
  if (!html.includes('{{')) return safeHtml(html)
  const root = parseInert(html)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const texts: Text[] = []
  while (walker.nextNode()) texts.push(walker.currentNode as Text)
  const holder = document.createElement('div')
  for (const node of texts) {
    const s = node.data
    if (!/\{\{\s*\w+\s*\}\}/.test(s)) continue
    const frag = document.createDocumentFragment()
    let last = 0
    for (const m of s.matchAll(TOKEN_RE)) {
      frag.append(s.slice(last, m.index))
      holder.innerHTML = chipHtml(m[0], vars)
      frag.append(holder.firstChild!)
      last = m.index! + m[0].length
    }
    frag.append(s.slice(last))
    node.replaceWith(frag)
  }
  return safeHtml(root.innerHTML)
}

/** Re-render existing tags (e.g. once the variable list has loaded and labels are known). */
export function relabelChips(el: HTMLElement | null, vars: TemplateVar[]) {
  if (!el) return
  const holder = document.createElement('div')
  el.querySelectorAll<HTMLElement>('span[data-var]').forEach((span) => {
    holder.innerHTML = chipHtml(span.dataset.var!, vars)
    span.replaceWith(holder.firstChild!)
  })
}

/** Backspace/Delete next to a tag removes the whole tag. Returns true if it did. */
function deleteAdjacentChip(e: React.KeyboardEvent<HTMLElement>): boolean {
  if (e.key !== 'Backspace' && e.key !== 'Delete') return false
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.getRangeAt(0).collapsed) return false
  const range = sel.getRangeAt(0)
  const c = range.startContainer
  let target: Node | null
  if (e.key === 'Backspace') {
    target = c.nodeType === Node.ELEMENT_NODE ? (c as Element).childNodes[range.startOffset - 1] ?? null
      : range.startOffset === 0 ? c.previousSibling : null
  } else {
    target = c.nodeType === Node.ELEMENT_NODE ? (c as Element).childNodes[range.startOffset] ?? null
      : range.startOffset === (c.textContent ?? '').length ? c.nextSibling : null
  }
  if (target instanceof HTMLElement && target.contentEditable === 'false') {
    e.preventDefault()
    const editor = target.closest('[contenteditable="true"]')
    target.remove()
    editor?.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }
  return false
}

/** Drag type for variable chips; text/plain is set too so a drop elsewhere still gives "{{key}}". */
export const VAR_DRAG_TYPE = 'application/x-template-var'

/** Caret position under the mouse (Chrome/Safari: caretRangeFromPoint, Firefox: caretPositionFromPoint). */
function caretRangeAt(x: number, y: number): Range | null {
  const d = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  if (d.caretRangeFromPoint) return d.caretRangeFromPoint(x, y)
  const p = d.caretPositionFromPoint?.(x, y)
  if (!p) return null
  const r = document.createRange()
  r.setStart(p.offsetNode, p.offset)
  r.collapse(true)
  return r
}

/** Caret tracking, tag insertion and the "@" picker for one or more contentEditable editors. */
export interface VarTagOptions {
  /** "@xyz" with no match offers "Create xyz": the tag is inserted, then this is called (e.g. open a save dialog). */
  onCreateVariable?: (key: string) => void
  /** A tag was clicked (e.g. jump to its value box, or offer to save an unknown one). */
  onTagClick?: (key: string, known: boolean) => void
}

export function useVarTags(vars: TemplateVar[], opts: VarTagOptions = {}) {
  const savedRange = useRef<Range | null>(null)
  const [mention, setMention] = useState<{ query: string; x: number; top: number; bottom: number; el: HTMLElement } | null>(null)
  const [index, setIndex] = useState(0)
  const matches = mention
    ? vars.filter((v) => `${v.label} ${v.key}`.toLowerCase().includes(mention.query.toLowerCase()))
    : []
  // "@xyz" that matches no variable name exactly -> offer to create it
  const q = mention?.query.toLowerCase() ?? ''
  const createKey = opts.onCreateVariable && /^[a-z][a-z0-9_]{1,59}$/.test(q) && !vars.some((v) => v.key === q) ? q : null
  const items = [
    ...matches.map((v) => ({ token: v.token, label: v.label, hint: v.token, create: false })),
    ...(createKey ? [{ token: `{{${createKey}}}`, label: `Create “${createKey}” variable`, hint: 'new', create: true }] : []),
  ]

  const saveSelection = (el: HTMLElement | null) => {
    const sel = window.getSelection()
    if (el && sel?.rangeCount && el.contains(sel.getRangeAt(0).commonAncestorContainer)) savedRange.current = sel.getRangeAt(0).cloneRange()
  }

  /** Insert a tag at the saved caret, the live caret, or the end of `el`. Fires an input event. */
  const insert = (token: string, el: HTMLElement | null) => {
    if (!el) return
    const sel = window.getSelection()
    let range: Range
    if (savedRange.current && el.contains(savedRange.current.commonAncestorContainer)) range = savedRange.current
    else if (sel?.rangeCount && el.contains(sel.getRangeAt(0).commonAncestorContainer)) range = sel.getRangeAt(0)
    else { range = document.createRange(); range.selectNodeContents(el); range.collapse(false) }
    savedRange.current = null
    el.focus()
    range.deleteContents()
    const holder = document.createElement('div')
    holder.innerHTML = chipHtml(token, vars)
    const chip = holder.firstChild!
    range.insertNode(chip)
    range.setStartAfter(chip)
    range.collapse(true)
    sel?.removeAllRanges()
    sel?.addRange(range)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  /** Call on input/click/arrow keys: opens the picker when "@word" is right before the caret (start of word only, so emails don't trigger it). */
  const update = (el: HTMLElement | null) => {
    const sel = window.getSelection()
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null
    const node = range?.startContainer
    if (!el || !range || !range.collapsed || node?.nodeType !== Node.TEXT_NODE || !el.contains(node)) return setMention(null)
    const m = (node.textContent ?? '').slice(0, range.startOffset).match(/(?:^|\s)@(\w*)$/)
    if (!m) return setMention(null)
    if (mention?.query !== m[1]) setIndex(0)
    const r = range.getBoundingClientRect()
    setMention({ query: m[1], x: r.left, top: r.top, bottom: r.bottom, el })
  }

  const pick = (item: { token: string; create: boolean }) => {
    const { token } = item
    const sel = window.getSelection()
    if (!mention || !sel?.rangeCount) return
    const r = sel.getRangeAt(0).cloneRange()
    r.setStart(r.startContainer, Math.max(0, r.startOffset - mention.query.length - 1)) // cover "@query"
    savedRange.current = r
    const el = mention.el
    setMention(null)
    insert(token, el)
    document.execCommand('insertText', false, ' ')
    if (item.create) opts.onCreateVariable?.(keyOf(token))
  }

  /** onClick: a click on a tag goes to onTagClick, anywhere else updates the "@" picker. */
  const click = (e: React.MouseEvent<HTMLElement>) => {
    const tag = (e.target as HTMLElement).closest?.('[data-var]') as HTMLElement | null
    if (tag && opts.onTagClick) {
      const key = keyOf(tag.dataset.var ?? '')
      opts.onTagClick(key, vars.some((v) => v.key === key))
      return
    }
    update(e.currentTarget)
  }

  /** Picker navigation + whole-tag delete. Returns true when the key was handled. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>): boolean => {
    if (mention && items.length) {
      const n = items.length
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => (i + 1) % n); return true }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => (i - 1 + n) % n); return true }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(items[Math.min(index, n - 1)]); return true }
    }
    if (mention && e.key === 'Escape') { e.preventDefault(); setMention(null); return true }
    return deleteAdjacentChip(e)
  }

  // Open below the caret, or above it when there isn't room. Portalled + fixed so overflow-hidden or
  // transformed parents (dialogs) don't clip or offset it; pointer-events-auto because modal dialogs disable them on body.
  const below = mention ? window.innerHeight - mention.bottom > 260 : true
  const popup = mention && items.length > 0 ? createPortal(
    <div role="listbox" aria-label="Insert variable"
      className="pointer-events-auto fixed z-[300] w-64 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg py-1"
      style={below ? { left: mention.x, top: mention.bottom + 4 } : { left: mention.x, bottom: window.innerHeight - mention.top + 4 }}>
      {items.map((v, i) => (
        <button key={v.token + v.create} type="button" role="option" aria-selected={i === index}
          onMouseDown={(e) => { e.preventDefault(); pick(v) }}
          onMouseEnter={() => setIndex(i)}
          className={cn('w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2', i === index && 'bg-muted', v.create && 'border-t border-border')}>
          <span className={cn('font-medium', v.create ? 'text-primary' : 'text-foreground')}>{v.create ? '+ ' : ''}{v.label}</span>
          <span className="font-mono text-muted-foreground truncate">{v.hint}</span>
        </button>
      ))}
    </div>,
    document.body,
  ) : null

  /** onBlur: remember the caret, close the picker, and turn hand-typed {{tokens}} into tags (value is unchanged). */
  const blur = (el: HTMLElement | null) => {
    saveSelection(el)
    setMention(null)
    if (el && /\{\{\s*\w+\s*\}\}/.test(el.textContent ?? '')) el.innerHTML = chipify(el.innerHTML, vars)
  }

  /** onDragOver: accept variable chips. */
  const dragOver = (e: React.DragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes(VAR_DRAG_TYPE)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  /** onDrop: insert the dragged variable as a tag where it was dropped. */
  const drop = (e: React.DragEvent<HTMLElement>) => {
    const token = e.dataTransfer.getData(VAR_DRAG_TYPE)
    if (!token) return
    e.preventDefault()
    const el = e.currentTarget
    const r = caretRangeAt(e.clientX, e.clientY)
    savedRange.current = r && el.contains(r.startContainer) ? r : null
    insert(token, el)
  }

  return { saveSelection, insert, update, click, onKeyDown, blur, dragOver, drop, close: () => setMention(null), popup }
}

/** Grouped variable list behind a small button. `onPick` gets "{{key}}". */
export function VarPickerButton({ vars, onPick, label = 'Variable', align = 'end', hint }: {
  vars: TemplateVar[]; onPick: (token: string) => void; label?: string; align?: 'start' | 'end'; hint?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button type="button" onMouseDown={(e) => e.preventDefault() /* keep the editor's caret */}
          className="h-7 inline-flex items-center gap-1 px-2 rounded text-xs font-medium border border-input bg-background hover:bg-muted transition-colors">
          <span className="text-primary font-mono">{'{{}}'}</span>
          {label}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64 max-h-80 overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
        {hint && <p className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">{hint}</p>}
        {groupVariables(vars).map((g) => (
          <div key={g.label}>
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">{g.label}</DropdownMenuLabel>
            {g.vars.map((v) => (
              <DropdownMenuItem key={v.key} onSelect={() => onPick(v.token)} draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(VAR_DRAG_TYPE, v.token)
                  e.dataTransfer.setData('text/plain', v.token)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                onDragEnd={() => setOpen(false)}
                className="flex items-center justify-between gap-2 text-xs cursor-grab active:cursor-grabbing">
                <span>{v.label}</span>
                <span className="font-mono text-muted-foreground truncate">{v.token}</span>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export interface VarLineInputHandle { insert: (token: string) => void; focus: () => void }

/** One-line text box (e.g. a subject) that shows variables as tags. `value` is the raw text with {{tokens}}. */
export const VarLineInput = forwardRef<VarLineInputHandle, {
  value: string
  onChange: (value: string) => void
  vars: TemplateVar[]
  placeholder?: string
  id?: string
  ariaLabel?: string
  className?: string
} & VarTagOptions>(function VarLineInput({ value, onChange, vars, placeholder, id, ariaLabel, className, onCreateVariable, onTagClick }, ref) {
  const el = useRef<HTMLDivElement>(null)
  const tags = useVarTags(vars, { onCreateVariable, onTagClick })

  useEffect(() => {
    if (el.current && chipText(el.current) !== value) el.current.innerHTML = chipify(escapeHtml(value), vars)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  useEffect(() => relabelChips(el.current, vars), [vars])

  useImperativeHandle(ref, () => ({ insert: (t) => tags.insert(t, el.current), focus: () => el.current?.focus() }))

  return (
    <>
      <div
        ref={el}
        id={id}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onKeyDown={(e) => { if (!tags.onKeyDown(e) && e.key === 'Enter') e.preventDefault() /* single line */ }}
        onInput={(e) => {
          const text = chipText(e.currentTarget)
          if (!text) e.currentTarget.innerHTML = '' // drop stray <br> so the placeholder shows
          onChange(text)
          tags.update(e.currentTarget)
        }}
        onKeyUp={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) tags.update(e.currentTarget) }}
        onClick={tags.click}
        onBlur={(e) => tags.blur(e.currentTarget)}
        onDragOver={tags.dragOver}
        onDrop={tags.drop}
        onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\s*\n\s*/g, ' ')) }}
        className={cn(
          'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 whitespace-nowrap overflow-x-auto [scrollbar-width:none]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground',
          className,
        )}
      />
      {tags.popup}
    </>
  )
})

/** Lists {{variables}} in `text` that aren't in the list (typos or custom values), with a "did you mean". */
export function UnknownVarsNotice({ text, vars, onSave }: { text: string; vars: TemplateVar[]; onSave?: (key: string) => void }) {
  if (!vars.length) return null
  const unknown = usedVariables(text).filter((k) => !vars.some((v) => v.key === k))
  if (!unknown.length) return null
  return (
    <div role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200 space-y-0.5">
      {unknown.map((k) => {
        const guess = suggestVariable(vars, k)
        return (
          <p key={k}>
            <span className="font-mono">{`{{${k}}}`}</span> isn&apos;t a known variable
            {guess ? <> — did you mean <strong>{guess.label}</strong> (<span className="font-mono">{guess.token}</span>)?</> : '.'}
            {' '}If it&apos;s intentional,{' '}
            {onSave
              ? <button type="button" className="underline font-medium" onClick={() => onSave(k)}>save it as a custom variable</button>
              : 'add it under Custom variables'}
            , or the sender will be asked for a value when sending.
          </p>
        )
      })}
    </div>
  )
}
