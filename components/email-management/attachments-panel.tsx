'use client'

/**
 * Attachments for a send: files everyone gets, plus (optionally) a different file per client,
 * matched by a CSV with "email" and "file" columns. Files go to storage as soon as they are picked.
 */
import { useRef, useState } from 'react'
import { ChevronDown, FileText, Loader2, Paperclip, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { uploadMailAttachment } from '@/lib/api/mail-management'
import type { MailAttachment } from '@/lib/api/types'
import { csvRecords, toCsv } from '@/lib/csv'

export interface AttachmentsState {
  /** Files every recipient gets */
  shared: MailAttachment[]
  /** Files uploaded for individual clients */
  perClient: MailAttachment[]
  /** lower-cased email -> file names, from the matching CSV */
  mapping: Record<string, string[]>
  mappingName: string | null
}

export const NO_ATTACHMENTS: AttachmentsState = { shared: [], perClient: [], mapping: {}, mappingName: null }

const MAX_FILE = 10 * 1024 * 1024
const MAX_PER_EMAIL = 20 * 1024 * 1024
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip'

export const fileSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const norm = (s: string) => s.trim().toLowerCase()

export const hasAttachments = (s: AttachmentsState) => s.shared.length > 0 || s.perClient.length > 0

/** The client's own files for this send (not including the shared ones). */
export function filesFor(s: AttachmentsState, email: string): MailAttachment[] {
  const names = s.mapping[norm(email)] ?? []
  return names.map((n) => s.perClient.find((f) => norm(f.name) === norm(n))).filter((f): f is MailAttachment => !!f)
}

/** Things to fix or know before sending; shown in the panel and in the send confirmation. */
export function attachmentIssues(s: AttachmentsState, emails: string[]): string[] {
  const out: string[] = []
  const sharedBytes = s.shared.reduce((n, f) => n + f.size, 0)
  const tooBig = emails.filter((e) => sharedBytes + filesFor(s, e).reduce((n, f) => n + f.size, 0) > MAX_PER_EMAIL)
  if (sharedBytes > MAX_PER_EMAIL || tooBig.length) out.push(`Attachments are over 20 MB for ${tooBig.length || 'every'} email${tooBig.length === 1 ? '' : 's'}; remove some files.`)
  if (!s.perClient.length && !s.mappingName) return out

  const uploaded = new Set(s.perClient.map((f) => norm(f.name)))
  const missing = [...new Set(Object.values(s.mapping).flat().filter((n) => !uploaded.has(norm(n))))]
  if (missing.length) out.push(`${missing.length} file${missing.length === 1 ? ' named in the CSV is' : 's named in the CSV are'} not uploaded: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`)
  if (!s.mappingName) out.push('Upload the matching CSV so each client gets their own file.')
  else {
    const without = emails.filter((e) => !filesFor(s, e).length).length
    if (without) out.push(`${without} of ${emails.length} recipient${emails.length === 1 ? '' : 's'} ${without === 1 ? 'has' : 'have'} no file of their own and will get the email without one.`)
    const used = new Set(emails.flatMap((e) => filesFor(s, e).map((f) => norm(f.name))))
    const unused = s.perClient.filter((f) => !used.has(norm(f.name))).length
    if (unused) out.push(`${unused} uploaded client file${unused === 1 ? ' is' : 's are'} not matched to anyone being sent to.`)
  }
  return out
}

function FileChips({ files, onRemove }: { files: MailAttachment[]; onRemove: (f: MailAttachment) => void }) {
  if (!files.length) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((f) => (
        <li key={f.key} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate max-w-[220px]" title={f.name}>{f.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{fileSize(f.size)}</span>
          <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemove(f)}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function AttachmentsPanel({ value, onChange, recipientEmails }: {
  value: AttachmentsState
  onChange: (next: AttachmentsState | ((prev: AttachmentsState) => AttachmentsState)) => void
  /** Everyone this send goes to, for matching and the CSV template */
  recipientEmails: string[]
}) {
  const { toast } = useToast()
  const sharedInput = useRef<HTMLInputElement>(null)
  const clientInput = useRef<HTMLInputElement>(null)
  const csvInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [showPerClient, setShowPerClient] = useState(value.perClient.length > 0 || !!value.mappingName)

  const upload = async (list: FileList | null, into: 'shared' | 'perClient') => {
    const files = [...(list ?? [])]
    const big = files.filter((f) => f.size > MAX_FILE)
    if (big.length) toast({ title: 'Some files are too big', description: `${big.map((f) => f.name).join(', ')}: files can be up to 10 MB each.`, variant: 'destructive' })
    const ok = files.filter((f) => f.size <= MAX_FILE)
    for (let i = 0; i < ok.length; i++) {
      setBusy(`Uploading ${i + 1} of ${ok.length}…`)
      try {
        const ref = await uploadMailAttachment(ok[i])
        // a re-uploaded file with the same name replaces the old one
        onChange((s) => ({ ...s, [into]: [...s[into].filter((f) => norm(f.name) !== norm(ref.name)), ref] }))
      } catch (err) {
        toast({ title: `Could not upload ${ok[i].name}`, description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
      }
    }
    setBusy(null)
  }

  const readCsv = async (file: File | undefined) => {
    if (!file) return
    const rows = csvRecords(await file.text())
    const emailCol = rows.length ? Object.keys(rows[0]).find((k) => k.includes('email')) : undefined
    const fileCol = rows.length ? Object.keys(rows[0]).find((k) => k.includes('file')) : undefined
    if (!emailCol || !fileCol) {
      toast({ title: 'CSV needs two columns', description: 'Name them "email" and "file" (the file name, e.g. INV-104.pdf).', variant: 'destructive' })
      return
    }
    const mapping: Record<string, string[]> = {}
    for (const r of rows) {
      const email = norm(r[emailCol] ?? '')
      const name = (r[fileCol] ?? '').trim()
      if (email && name) (mapping[email] ??= []).push(name)
    }
    onChange((s) => ({ ...s, mapping, mappingName: file.name }))
  }

  const downloadTemplate = () => {
    const csv = toCsv([['email', 'file'], ...recipientEmails.map((e) => [e, ''])])
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'client-files.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  const matched = value.mappingName ? recipientEmails.filter((e) => filesFor(value, e).length).length : 0

  return (
    <div className="space-y-2">
      {/* One row under the message, like an email client; problems are listed in "Before you send" */}
      <div className="flex flex-wrap items-center gap-2">
        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <FileChips files={value.shared} onRemove={(f) => onChange((s) => ({ ...s, shared: s.shared.filter((x) => x.key !== f.key) }))} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="gap-1 text-primary" disabled={!!busy}>
              <Plus className="h-4 w-4" />Attach<ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuItem onSelect={() => sharedInput.current?.click()} className="flex-col items-start gap-0">
              <span className="font-medium">Files for everyone</span>
              <span className="text-xs text-muted-foreground">Up to 10 MB per file, 20 MB per email</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setShowPerClient(true)} className="flex-col items-start gap-0">
              <span className="font-medium">A different file for each client</span>
              <span className="text-xs text-muted-foreground">Matched to clients with a CSV</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {busy && <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{busy}</span>}
      </div>
      <input ref={sharedInput} type="file" multiple accept={ACCEPT} className="hidden"
        onChange={(e) => { void upload(e.target.files, 'shared'); e.target.value = '' }} />

      {showPerClient && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">A different file for each client</p>
              <p className="text-muted-foreground">
                Upload each client&apos;s files, then a CSV with an <code className="rounded bg-muted px-1">email</code> and a{' '}
                <code className="rounded bg-muted px-1">file</code> column saying which file goes to whom.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowPerClient(false); onChange((s) => ({ ...s, perClient: [], mapping: {}, mappingName: null })) }}>
              Remove
            </Button>
          </div>

          <FileChips files={value.perClient} onRemove={(f) => onChange((s) => ({ ...s, perClient: s.perClient.filter((x) => x.key !== f.key) }))} />

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => clientInput.current?.click()}>
              1. Upload client files{value.perClient.length ? ` (${value.perClient.length})` : ''}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => csvInput.current?.click()}>
              2. {value.mappingName ? 'Replace' : 'Upload'} matching CSV
            </Button>
            <button type="button" onClick={downloadTemplate} disabled={!recipientEmails.length}
              className="text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline">
              Download a CSV to fill in
            </button>
          </div>
          <input ref={clientInput} type="file" multiple accept={ACCEPT} className="hidden"
            onChange={(e) => { void upload(e.target.files, 'perClient'); e.target.value = '' }} />
          <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { void readCsv(e.target.files?.[0]); e.target.value = '' }} />

          {value.mappingName && (
            <p className="text-sm">
              <span className="font-medium">{value.mappingName}</span>
              <span className="text-muted-foreground"> · {matched} of {recipientEmails.length} recipient{recipientEmails.length === 1 ? '' : 's'} matched to a file</span>
            </p>
          )}
        </div>
      )}

    </div>
  )
}
