'use client'

/**
 * One editor for "what to send": optionally start from a template, then edit the subject and
 * message freely. Edits apply to this send; "Save to template" writes them back (an org template is
 * updated, a shared template is saved as this organization's own copy).
 */
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichTextarea, type RichTextareaRef } from '@/components/ui/rich-textarea'
import { useToast } from '@/components/ui/use-toast'
import { createTemplate, updateTemplate } from '@/lib/api/email-templates'
import type { EmailTemplate } from '@/lib/api/types'
import type { TemplateVar } from '@/lib/template-variables'
import { VarLineInput, VarPickerButton, type VarLineInputHandle, type VarTagOptions } from './var-tags'

export const BLANK_BODY = 'Dear {{client_name}},<br><br>'

export interface ComposedMessage {
  /** The template this message started from (null = blank email) */
  template: EmailTemplate | null
  subject: string
  body: string
}

/** True when the subject or message differs from the template it was loaded from. */
export const isEdited = (m: ComposedMessage) =>
  !!m.template && (m.subject !== (m.template.subject ?? '') || m.body !== (m.template.body ?? ''))

/** Unchanged template -> send by id (keeps the template link); anything else -> send the text. */
export const toPayload = (m: ComposedMessage): { templateId?: number; subject?: string; body?: string } =>
  m.template && !isEdited(m)
    ? { templateId: Number(m.template.id) }
    : { subject: m.subject.trim(), body: m.body }

/** Header control: pick a template to start from (or a blank email). Asks before replacing edits. */
export function TemplatePicker({ templates, loading, value, onChange }: {
  templates: EmailTemplate[]
  loading: boolean
  value: ComposedMessage
  onChange: (m: ComposedMessage) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const { template } = value

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const load = (t: EmailTemplate | null) => {
    if (isEdited(value) && !window.confirm('Replace your edits with this template?')) return
    onChange(t ? { template: t, subject: t.subject ?? '', body: t.body ?? '' } : { template: null, subject: '', body: BLANK_BODY })
    setOpen(false)
    setSearch('')
  }

  const q = search.trim().toLowerCase()
  const shown = templates.filter((t) => !q || t.name.toLowerCase().includes(q) || (t.subject ?? '').toLowerCase().includes(q))

  return (
    <div ref={ref} className="relative">
      <Button type="button" variant="outline" className="w-full justify-between gap-2 bg-background font-normal" disabled={loading}
        aria-expanded={open} aria-label="Start from a template" onClick={() => setOpen((o) => !o)}>
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">
            {loading ? 'Loading templates…' : template ? <span className="font-medium">{template.name}</span> : <><span className="font-medium text-primary">Choose a template</span> <span className="text-muted-foreground">(optional, or write your own)</span></>}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </Button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-popover shadow-lg">
          <div className="border-b border-border p-2">
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…"
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {!q && (
              <button type="button" onClick={() => load(null)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${!template ? 'font-medium text-primary' : ''}`}>
                Blank email
                <span className="block text-xs font-normal text-muted-foreground">Write your own subject and message</span>
              </button>
            )}
            {shown.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matching templates</p>
            ) : shown.map((t) => (
              <button key={t.id} type="button" onClick={() => load(t)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${template?.id === t.id ? 'bg-primary/10 text-primary' : ''}`}>
                <span className="block truncate font-medium">{t.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{t.subject}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Subject + message, like an email client. The "edited from template" strip offers undo and save-back. */
export function MessageComposer({
  vars, tagOptions, value, onChange, onTemplateSaved,
}: {
  vars: TemplateVar[]
  tagOptions: VarTagOptions
  value: ComposedMessage
  onChange: (m: ComposedMessage) => void
  /** A template was updated or created from here: refresh the list */
  onTemplateSaved: (t: EmailTemplate) => void
}) {
  const { toast } = useToast()
  const subjectRef = useRef<VarLineInputHandle>(null)
  const bodyRef = useRef<RichTextareaRef>(null)
  const [saving, setSaving] = useState(false)
  // A clicked variable goes where the user was last typing (message by default)
  const lastField = useRef<'subject' | 'body'>('body')
  const insertVar = (token: string) =>
    lastField.current === 'subject' ? subjectRef.current?.insert(token) : bodyRef.current?.insert(token)
  const { template } = value
  const edited = isEdited(value)

  const saveToTemplate = async () => {
    if (!template) return
    setSaving(true)
    try {
      // Shared (global) templates are never changed from here: the org gets its own copy instead
      const saved = template.organizationId != null
        ? await updateTemplate(template.id, { subject: value.subject, body: value.body })
        : await createTemplate({ category: template.category, type: template.type, name: template.name, subject: value.subject, body: value.body })
      onTemplateSaved(saved)
      onChange({ template: saved, subject: saved.subject ?? value.subject, body: saved.body ?? value.body })
      toast({
        title: 'Template saved',
        description: template.organizationId != null ? `"${template.name}" now has these changes.` : `Saved as your organization's own copy of "${template.name}".`,
        variant: 'success',
      })
    } catch (err) {
      toast({ title: 'Could not save the template', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3" onFocusCapture={() => { lastField.current = 'subject' }}>
        <label className="w-16 shrink-0 text-sm font-medium text-foreground">Subject</label>
        <div id="compose-subject" className="min-w-0 flex-1">
          <VarLineInput ref={subjectRef} value={value.subject} onChange={(subject) => onChange({ ...value, subject })}
            vars={vars} ariaLabel="Subject" placeholder="What is this email about? (type @ to add a variable)" {...tagOptions} />
        </div>
      </div>

      <div id="compose-body" onFocusCapture={() => { lastField.current = 'body' }}>
        <RichTextarea ref={bodyRef} value={value.body} onChange={(body) => onChange({ ...value, body })}
          variables={vars} simple minHeight={220} placeholder="Write your message… (type @ to add a variable)" {...tagOptions}
          toolbarEnd={
            <VarPickerButton vars={vars} label="Insert variable" onPick={insertVar}
              hint="Click to add where you were typing, or drag into the subject or message." />
          } />
      </div>

      {edited && template && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm">
          <span className="mr-auto text-muted-foreground">
            Edited from <span className="font-medium text-foreground">{template.name}</span>. Changes apply to this send only.
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ template, subject: template.subject ?? '', body: template.body ?? '' })}>
            Undo changes
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={saveToTemplate} disabled={saving || !value.subject.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {template.organizationId != null ? 'Save to template' : 'Save as my template'}
          </Button>
        </div>
      )}
    </div>
  )
}
