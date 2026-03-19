'use client'

import * as React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Eye, EyeOff, PlusIcon, Trash2Icon, CheckCircle2, Lock, Mail, Loader2,
  Send, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, ChevronDown, X, LayoutTemplate, Pencil,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ApiError } from '@/lib/api/client'
import { checkLoginEmailExists } from '@/lib/api/clients'
import { listTemplates, sendEmail } from '@/lib/api/email-templates'
import type { EmailTemplate } from '@/lib/api/types'
import { cn } from '@/lib/utils'

/* ─────────────────────── types ─────────────────────── */

export interface ClientLogin {
  email: string
  password: string
}

interface ClientLoginTabProps {
  clientName?: string
  initialLogins?: ClientLogin[]
  suggestedEmails?: string[]
  organizationId?: number
  onSave?: (logins: ClientLogin[]) => void | Promise<void>
  onRemoveLogin?: () => void | Promise<void>
  clientDetails?: {
    name?: string
    email?: string
    phone?: string
    company?: string
  }
  senderDetails?: {
    name?: string
    email?: string
    company?: string
    phone?: string
  }
}

/* ─────────────────── variable definitions ────────────── */

const VAR_GROUPS = [
  {
    label: 'Client Details',
    vars: [
      { label: 'Client Name',    value: '{{clientName}}' },
      { label: 'Client Email',   value: '{{clientEmail}}' },
      { label: 'Client Phone',   value: '{{clientPhone}}' },
      { label: 'Client Company', value: '{{clientCompany}}' },
    ],
  },
  {
    label: 'Sender Details',
    vars: [
      { label: 'Sender Name',    value: '{{senderName}}' },
      { label: 'Sender Email',   value: '{{senderEmail}}' },
      { label: 'Sender Company', value: '{{senderCompany}}' },
      { label: 'Sender Phone',   value: '{{senderPhone}}' },
    ],
  },
  {
    label: 'Credentials',
    vars: [
      { label: 'Login Email',    value: '{{loginEmail}}' },
      { label: 'Login Password', value: '{{loginPassword}}' },
    ],
  },
]

const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '36']
const FONT_FAMILIES = ['Default', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS']

/* ───────────────── tiny rich-text editor ─────────────── */

interface RichEditorProps {
  editorRef: React.RefObject<HTMLDivElement | null>
  placeholder?: string
}

function RichEditor({ editorRef, placeholder = 'Write your message here…' }: RichEditorProps) {
  const [isEmpty, setIsEmpty] = useState(true)

  const checkEmpty = useCallback(() => {
    setIsEmpty((editorRef.current?.innerText?.trim() ?? '') === '')
  }, [editorRef])

  return (
    <div className="relative min-h-[180px]">
      {isEmpty && (
        <p className="pointer-events-none absolute top-3 left-3 text-sm text-muted-foreground select-none">
          {placeholder}
        </p>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={checkEmpty}
        onFocus={checkEmpty}
        className="min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring [&_b]:font-bold [&_i]:italic [&_u]:underline [&_s]:line-through"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      />
    </div>
  )
}

/* ─────────────────── formatting toolbar ─────────────── */

function ToolbarButton({
  onClick, active = false, title, children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={cn(
        'h-7 w-7 inline-flex items-center justify-center rounded text-sm transition-colors',
        active
          ? 'bg-primary/15 text-primary'
          : 'hover:bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Toolbar({
  editorRef,
  onInsertVariable,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>
  onInsertVariable: (v: string) => void
}) {
  const [varOpen, setVarOpen] = useState(false)
  const varRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (varRef.current && !varRef.current.contains(e.target as Node)) setVarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-input bg-muted/30 rounded-t-md">
      {/* Text style */}
      <ToolbarButton onClick={() => exec('bold')} title="Bold"><Bold className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => exec('italic')} title="Italic"><Italic className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => exec('underline')} title="Underline"><Underline className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => exec('strikeThrough')} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></ToolbarButton>

      <span className="w-px h-4 bg-border mx-1" />

      {/* Font size */}
      <select
        title="Font Size"
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => { editorRef.current?.focus(); exec('fontSize', e.target.value) }}
        defaultValue=""
        className="h-7 rounded border border-input bg-background text-xs px-1 focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="" disabled>Size</option>
        {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
      </select>

      {/* Font family */}
      <select
        title="Font Family"
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => { editorRef.current?.focus(); exec('fontName', e.target.value) }}
        defaultValue=""
        className="h-7 rounded border border-input bg-background text-xs px-1 focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="" disabled>Font</option>
        {FONT_FAMILIES.map((f) => <option key={f} value={f === 'Default' ? 'inherit' : f}>{f}</option>)}
      </select>

      <span className="w-px h-4 bg-border mx-1" />

      {/* Alignment */}
      <ToolbarButton onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeft className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => exec('justifyCenter')} title="Align Center"><AlignCenter className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => exec('justifyRight')} title="Align Right"><AlignRight className="h-3.5 w-3.5" /></ToolbarButton>

      <span className="w-px h-4 bg-border mx-1" />

      {/* Text color */}
      <label title="Text Color" className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground">
        <span className="text-xs font-bold underline decoration-2" style={{ textDecorationStyle: 'solid' }}>A</span>
        <input
          type="color"
          className="sr-only"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { editorRef.current?.focus(); exec('foreColor', e.target.value) }}
        />
      </label>

      {/* Highlight color */}
      <label title="Highlight Color" className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground">
        <span className="text-xs font-bold px-0.5 bg-yellow-200 text-black rounded-sm leading-none">H</span>
        <input
          type="color"
          defaultValue="#fef08a"
          className="sr-only"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { editorRef.current?.focus(); exec('hiliteColor', e.target.value) }}
        />
      </label>

      <span className="w-px h-4 bg-border mx-1" />

      {/* Variables dropdown */}
      <div className="relative" ref={varRef}>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setVarOpen((v) => !v) }}
          className="h-7 inline-flex items-center gap-1 px-2 rounded text-xs font-medium border border-input bg-background hover:bg-muted transition-colors"
        >
          <span className="text-primary font-mono text-[10px]">{'{{}}'}</span>
          Variables
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
        {varOpen && (
          <div className="absolute top-full left-0 mt-1 w-52 rounded-lg border border-border bg-popover shadow-lg z-50 py-1 text-sm">
            {VAR_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                {group.vars.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onInsertVariable(v.value); setVarOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center justify-between gap-2"
                  >
                    <span>{v.label}</span>
                    <span className="text-[10px] font-mono text-primary/70">{v.value}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────── main component ─────────────────── */

export function ClientLoginTab({
  clientName = '',
  initialLogins = [],
  suggestedEmails = [],
  organizationId,
  onSave,
  onRemoveLogin,
  clientDetails,
  senderDetails,
}: ClientLoginTabProps) {
  const { toast } = useToast()
  const [logins, setLogins] = useState<ClientLogin[]>(initialLogins)
  const [newEmail, setNewEmail] = useState('')
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeMode, setComposeMode] = useState<'template' | 'custom'>('template')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  const hasGeneratedCredentials = logins.some((l) => l.password && l.password.trim())

  // Emails deleted locally — prevent the sync effect from restoring them
  const deletedEmailsRef = useRef<Set<string>>(new Set())

  // Sync logins when parent refreshes (e.g. after save), but skip locally-deleted ones
  const initialLoginsKey = JSON.stringify(initialLogins)
  useEffect(() => {
    if (initialLogins.length > 0) {
      const filtered = initialLogins.filter(
        (l) => !deletedEmailsRef.current.has(l.email.toLowerCase()),
      )
      setLogins(filtered)
    } else if (initialLogins.length === 0) {
      setLogins([])
      deletedEmailsRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoginsKey])

  // Pre-fill suggested email
  useEffect(() => {
    if (logins.length === 0 && suggestedEmails.length > 0 && !newEmail) {
      const first = suggestedEmails.find((e) => e?.trim() && validateEmail(e.trim()))
      if (first) setNewEmail(first.trim())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logins.length, suggestedEmails.join(','), newEmail])

  // Load templates when compose opens in template mode
  useEffect(() => {
    if (!composeOpen || composeMode !== 'template') return
    setTemplatesLoading(true)
    listTemplates()
      .then((data) => setTemplates(data))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false))
  }, [composeOpen, composeMode])

  // When template selected, populate subject
  useEffect(() => {
    if (selectedTemplate) setSubject(selectedTemplate.subject ?? '')
  }, [selectedTemplate])

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const addEmailToLogins = async (emailToAdd: string) => {
    const trimmed = emailToAdd.trim()
    if (!trimmed) { toast({ title: 'Validation Error', description: 'Please enter an email address', variant: 'destructive' }); return }
    if (!validateEmail(trimmed)) { toast({ title: 'Validation Error', description: 'Please enter a valid email address', variant: 'destructive' }); return }
    if (logins.some((l) => l.email.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: 'Duplicate Email', description: 'This email address is already added.', variant: 'destructive' }); return
    }
    setIsCheckingEmail(true)
    try {
      const { exists } = await checkLoginEmailExists(trimmed, organizationId)
      if (exists) { toast({ title: 'Email already exists', description: 'This email is already in use in your organization.', variant: 'destructive' }); return }
    } catch {
      toast({ title: 'Error', description: 'Could not verify email. Please try again.', variant: 'destructive' }); return
    } finally {
      setIsCheckingEmail(false)
    }
    setLogins([...logins, { email: trimmed, password: '' }])
    toast({ title: 'Email Added', description: 'Password will be system-generated when you save.', variant: 'success' })
    setNewEmail('')
  }

  const handleRemoveLogin = async (index: number) => {
    const loginToRemove = logins[index]
    const hadSaved = initialLogins.some((l) => l.email === loginToRemove.email)
    const next = logins.filter((_, i) => i !== index)

    // Mark as deleted so the sync effect won't restore it
    deletedEmailsRef.current.add(loginToRemove.email.toLowerCase())
    setLogins(next)

    if (hadSaved && onRemoveLogin && next.filter((l) => initialLogins.some((il) => il.email === l.email)).length === 0) {
      setIsRemoving(true)
      try {
        await onRemoveLogin()
        toast({ title: 'Login credentials removed', description: 'Credentials deleted from server.', variant: 'success' })
        deletedEmailsRef.current.clear()
      } catch (error) {
        // Keep local deletion — just warn the user
        toast({ title: 'Removed locally', description: 'Could not confirm deletion on server. Refresh if the login reappears.', variant: 'destructive' })
      } finally {
        setIsRemoving(false)
      }
    } else {
      toast({ title: 'Removed', description: 'Login credentials removed' })
    }
  }

  const handleSave = async () => {
    if (logins.length === 0) { toast({ title: 'Validation Error', description: 'Please add at least one email address', variant: 'destructive' }); return }
    for (const login of logins) {
      if (!validateEmail(login.email)) { toast({ title: 'Validation Error', description: 'Please enter a valid email address', variant: 'destructive' }); return }
    }
    if (!onSave) { toast({ title: 'Warning', description: 'Save handler not configured', variant: 'destructive' }); return }
    setIsGenerating(true)
    try {
      await onSave(logins)
      toast({ title: 'Success', description: 'Login credentials saved. Password has been system-generated.', variant: 'success' })
    } catch (error) {
      let title = 'Error', message = 'Failed to save login credentials'
      if (error instanceof ApiError) {
        message = typeof error.detail === 'string' ? error.detail : error.message
        if (error.status === 409) { title = 'Email already in use'; message += ' Please use a different email.' }
      } else if (error instanceof Error) {
        message = error.message
      }
      toast({ title, description: message, variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const togglePasswordVisibility = (index: number) => setShowPasswords((p) => ({ ...p, [index]: !p[index] }))

  /* ── variable replacement for preview ── */
  function resolveVars(html: string) {
    const firstLogin = logins.find((l) => l.password)
    return html
      .replace(/\{\{clientName\}\}/g, clientDetails?.name ?? clientName ?? '')
      .replace(/\{\{clientEmail\}\}/g, clientDetails?.email ?? '')
      .replace(/\{\{clientPhone\}\}/g, clientDetails?.phone ?? '')
      .replace(/\{\{clientCompany\}\}/g, clientDetails?.company ?? '')
      .replace(/\{\{senderName\}\}/g, senderDetails?.name ?? '')
      .replace(/\{\{senderEmail\}\}/g, senderDetails?.email ?? '')
      .replace(/\{\{senderCompany\}\}/g, senderDetails?.company ?? '')
      .replace(/\{\{senderPhone\}\}/g, senderDetails?.phone ?? '')
      .replace(/\{\{loginEmail\}\}/g, firstLogin?.email ?? '')
      .replace(/\{\{loginPassword\}\}/g, firstLogin?.password ?? '')
  }

  /* ── insert variable into editor ── */
  function insertVariable(varStr: string) {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      document.execCommand('insertText', false, varStr)
      return
    }
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const span = document.createElement('span')
    span.className = 'inline-flex items-center px-1 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary mx-0.5'
    span.textContent = varStr
    span.contentEditable = 'false'
    range.insertNode(span)
    range.setStartAfter(span)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }

  /* ── strip variable span wrappers, keeping resolved text ── */
  function cleanBodyForSend(rawHtml: string): string {
    const resolved = resolveVars(rawHtml)
    const tmp = document.createElement('div')
    tmp.innerHTML = resolved
    tmp.querySelectorAll('span[contenteditable="false"]').forEach((span) => {
      span.replaceWith(document.createTextNode(span.textContent ?? ''))
    })
    return tmp.innerHTML
  }

  /* ── preview content ── */
  function getPreviewHtml() {
    if (composeMode === 'template' && selectedTemplate) return resolveVars(selectedTemplate.body)
    return resolveVars(editorRef.current?.innerHTML ?? '')
  }

  /* ── send ── */
  const handleSend = async () => {
    const to = logins.find((l) => l.email)?.email
    if (!to) { toast({ title: 'No recipient', description: 'No login email found to send to.', variant: 'destructive' }); return }

    if (composeMode === 'template' && !selectedTemplate) {
      toast({ title: 'No template selected', description: 'Please select a template.', variant: 'destructive' }); return
    }
    if (composeMode === 'custom' && !editorRef.current?.innerHTML.trim()) {
      toast({ title: 'Empty message', description: 'Please write a message before sending.', variant: 'destructive' }); return
    }

    setIsSending(true)
    try {
      const firstLogin = logins.find((l) => l.password)
      const variables: Record<string, string> = {
        clientName: clientDetails?.name ?? clientName,
        clientEmail: clientDetails?.email ?? '',
        clientPhone: clientDetails?.phone ?? '',
        clientCompany: clientDetails?.company ?? '',
        senderName: senderDetails?.name ?? '',
        senderEmail: senderDetails?.email ?? '',
        senderCompany: senderDetails?.company ?? '',
        senderPhone: senderDetails?.phone ?? '',
        loginEmail: firstLogin?.email ?? '',
        loginPassword: firstLogin?.password ?? '',
      }
      await sendEmail(
        composeMode === 'template'
          ? { to, templateId: selectedTemplate!.id, variables }
          : { to, subject, body: cleanBodyForSend(editorRef.current!.innerHTML), variables },
      )
      toast({ title: 'Sent!', description: `Email sent to ${to}`, variant: 'success' })
      setComposeOpen(false)
    } catch {
      toast({ title: 'Send failed', description: 'Could not send email. Please try again.', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  /* ─────────────── render ──────────────── */
  return (
    <div className="space-y-4">
      {/* ── Credentials Card ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
              <Lock className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base font-semibold">Client Login Credentials</CardTitle>
                {logins.length > 0 && <Badge variant="secondary" className="text-xs">{logins.length}</Badge>}
              </div>
              <CardDescription className="text-xs leading-relaxed">
                {clientName
                  ? `Manage login credentials for ${clientName}. Passwords are system-generated by the backend.`
                  : 'Add email address for client login access. Password will be system-generated automatically.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Suggested emails */}
          {suggestedEmails.length > 0 && (() => {
            const added = new Set(logins.map((l) => l.email.toLowerCase()))
            const notAdded = suggestedEmails.map((e) => e?.trim()).filter((e): e is string => !!e && validateEmail(e) && !added.has(e.toLowerCase()))
            if (!notAdded.length) return null
            return (
              <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/20">
                <Label className="text-xs font-medium text-muted-foreground">Suggested emails (from client profile)</Label>
                <div className="flex flex-wrap gap-2">
                  {notAdded.map((email) => (
                    <Button key={email} type="button" variant="outline" size="sm" className="text-xs" disabled={isCheckingEmail} onClick={() => addEmailToLogins(email)}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" />{email}
                    </Button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Add new login */}
          <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <PlusIcon className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Add New Login Credentials</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email" className="text-xs">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-email"
                  type="email"
                  placeholder="Enter email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newEmail) { e.preventDefault(); addEmailToLogins(newEmail) } }}
                  className="pl-9"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Password will be automatically generated by the system when you save.</p>
            </div>
            <Button type="button" onClick={() => addEmailToLogins(newEmail)} className="w-full sm:w-auto" disabled={!newEmail || isCheckingEmail}>
              {isCheckingEmail ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking...</> : <><PlusIcon className="h-4 w-4 mr-2" />Add Email</>}
            </Button>
          </div>

          {/* Existing logins */}
          {logins.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Saved Login Credentials</Label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {logins.map((login, index) => (
                  <div key={index} className="group flex items-center gap-3 p-3 border border-border rounded-md bg-card hover:bg-muted/50 hover:border-primary/20 transition-all duration-200">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0 grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="text-sm font-medium truncate">{login.email}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Password</Label>
                        <div className="flex items-center gap-2">
                          {login.password?.trim() ? (
                            <>
                              <p className="text-sm font-mono truncate">{showPasswords[index] ? login.password : '••••••••'}</p>
                              <Button type="button" variant="ghost" size="sm" onClick={() => togglePasswordVisibility(index)} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {showPasswords[index] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                              <Badge variant="outline" className="text-[10px] ml-1">System Generated</Badge>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Password will be generated when you save</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveLogin(index)} disabled={isRemoving} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md bg-muted/30">
              <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No login credentials added yet</p>
              <p className="text-xs mt-1">Add an email address to enable client login. Password will be system-generated.</p>
            </div>
          )}

          {logins.length > 0 && (
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} type="button" disabled={isGenerating}>
                {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Password...</> : 'Save & Generate Password'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Compose Message Card (shown after credentials generated) ── */}
      {hasGeneratedCredentials && (
        <Card>
          <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Compose Message</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Send login credentials to the client</CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
                onClick={() => setComposeOpen((v) => !v)}
              >
                <Pencil className="h-3.5 w-3.5" />
                {composeOpen ? 'Close' : 'Compose'}
              </Button>
            </div>
          </CardHeader>

          {composeOpen && (
            <CardContent className="pt-0 px-4 pb-4 sm:px-6 sm:pb-5 space-y-4">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => setComposeMode('template')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                    composeMode === 'template' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground',
                  )}
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Template
                </button>
                <button
                  type="button"
                  onClick={() => setComposeMode('custom')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-border',
                    composeMode === 'custom' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground',
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Custom
                </button>
              </div>

              {/* ── Template mode ── */}
              {composeMode === 'template' && (
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Template</Label>
                  {templatesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
                    </div>
                  ) : templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">No templates found.</p>
                  ) : (
                    <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTemplate(t)}
                          className={cn(
                            'text-left p-3 rounded-lg border transition-colors',
                            selectedTemplate?.id === t.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40 hover:bg-muted/50',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{t.name}</span>
                            <Badge variant={t.organizationId ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                              {t.organizationId ? 'Custom' : 'Pre-built'}
                            </Badge>
                          </div>
                          {t.subject && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.subject}</p>}
                          {t.category && <p className="text-[10px] text-muted-foreground/70 mt-0.5 capitalize">{t.category}</p>}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedTemplate && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Preview snippet</p>
                      <p className="text-xs text-foreground line-clamp-3" dangerouslySetInnerHTML={{ __html: resolveVars(selectedTemplate.body).replace(/<[^>]+>/g, ' ') }} />
                    </div>
                  )}
                </div>
              )}

              {/* ── Custom mode ── */}
              {composeMode === 'custom' && (
                <div className="space-y-3">
                  {/* Subject */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject…"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Editor */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Message</Label>
                    <div className="rounded-md border border-input overflow-hidden">
                      <Toolbar editorRef={editorRef} onInsertVariable={insertVariable} />
                      <RichEditor editorRef={editorRef} />
                    </div>
                  </div>

                  {/* Variable reference chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {VAR_GROUPS.flatMap((g) => g.vars).map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); insertVariable(v.value) }}
                        className="inline-flex items-center px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-[10px] font-mono text-primary/80 hover:bg-primary/15 transition-colors"
                      >
                        {v.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => setPreviewOpen(true)}
                  disabled={composeMode === 'template' ? !selectedTemplate : false}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={handleSend}
                  disabled={isSending || (composeMode === 'template' ? !selectedTemplate : false)}
                >
                  {isSending ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Sending…</> : <><Send className="h-3.5 w-3.5" />Send Now</>}
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">
                  To: {logins.find((l) => l.email)?.email ?? '—'}
                </span>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Preview modal ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreviewOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold">Email Preview</h3>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {subject && (
              <div className="px-5 py-2 border-b border-border bg-muted/30 shrink-0">
                <p className="text-xs text-muted-foreground">Subject: <span className="text-foreground font-medium">{subject}</span></p>
              </div>
            )}
            <div
              className="flex-1 overflow-y-auto px-5 py-4 prose prose-sm max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
            />
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
              <Button type="button" size="sm" onClick={() => { setPreviewOpen(false); handleSend() }} disabled={isSending}>
                <Send className="h-3.5 w-3.5 mr-1.5" />Send Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
