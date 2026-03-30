'use client'

import * as React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Eye, EyeOff, Trash2Icon, CheckCircle2, Lock, Mail, Loader2,
  Send, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, ChevronDown, Pencil, KeyRound, Copy, RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'
import { listTemplates, sendEmail } from '@/lib/api/email-templates'
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
    label: 'Client',
    vars: [
      { label: 'Client Name',    value: '{{client_name}}' },
      { label: 'Client Email',   value: '{{client_email}}' },
      { label: 'Client Phone',   value: '{{client_phone}}' },
      { label: 'Company Name',   value: '{{company_name}}' },
    ],
  },
  {
    label: 'Organization',
    vars: [
      { label: 'Org Name',       value: '{{org_name}}' },
      { label: 'Org Admin Name', value: '{{org_admin_name}}' },
      { label: 'Org Email',      value: '{{org_email}}' },
      { label: 'Org Phone',      value: '{{org_phone}}' },
    ],
  },
  {
    label: 'Credentials',
    vars: [
      { label: 'Login Email',    value: '{{login_email}}' },
      { label: 'Login Password', value: '{{login_password}}' },
      { label: 'Login URL',      value: '{{login_url}}' },
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
      <ToolbarButton onClick={() => exec('bold')} title="Bold"><Bold className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => exec('italic')} title="Italic"><Italic className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => exec('underline')} title="Underline"><Underline className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => exec('strikeThrough')} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></ToolbarButton>
      <span className="w-px h-4 bg-border mx-1" />
      <select title="Font Size" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { editorRef.current?.focus(); exec('fontSize', e.target.value) }} defaultValue="" className="h-7 rounded border border-input bg-background text-xs px-1 focus:outline-none focus:ring-1 focus:ring-ring">
        <option value="" disabled>Size</option>
        {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
      </select>
      <select title="Font Family" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { editorRef.current?.focus(); exec('fontName', e.target.value) }} defaultValue="" className="h-7 rounded border border-input bg-background text-xs px-1 focus:outline-none focus:ring-1 focus:ring-ring">
        <option value="" disabled>Font</option>
        {FONT_FAMILIES.map((f) => <option key={f} value={f === 'Default' ? 'inherit' : f}>{f}</option>)}
      </select>
      <span className="w-px h-4 bg-border mx-1" />
      <ToolbarButton onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeft className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => exec('justifyCenter')} title="Align Center"><AlignCenter className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => exec('justifyRight')} title="Align Right"><AlignRight className="h-3.5 w-3.5" /></ToolbarButton>
      <span className="w-px h-4 bg-border mx-1" />
      <label title="Text Color" className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground">
        <span className="text-xs font-bold underline decoration-2" style={{ textDecorationStyle: 'solid' }}>A</span>
        <input type="color" className="sr-only" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { editorRef.current?.focus(); exec('foreColor', e.target.value) }} />
      </label>
      <label title="Highlight Color" className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground">
        <span className="text-xs font-bold px-0.5 bg-yellow-200 text-black rounded-sm leading-none">H</span>
        <input type="color" defaultValue="#fef08a" className="sr-only" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { editorRef.current?.focus(); exec('hiliteColor', e.target.value) }} />
      </label>
      <span className="w-px h-4 bg-border mx-1" />
      <div className="relative" ref={varRef}>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); setVarOpen((v) => !v) }} className="h-7 inline-flex items-center gap-1 px-2 rounded text-xs font-medium border border-input bg-background hover:bg-muted transition-colors">
          <span className="text-primary font-mono text-[10px]">{'{{}}'}</span>
          Variables
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
        {varOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-border bg-popover shadow-lg z-50 py-1 max-h-52 overflow-y-auto">
            {VAR_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                {group.vars.map((v) => (
                  <button key={v.value} type="button" onMouseDown={(e) => { e.preventDefault(); onInsertVariable(v.value); setVarOpen(false) }} className="w-full text-left px-2.5 py-1 text-[11px] hover:bg-muted flex items-center justify-between gap-1">
                    <span>{v.label}</span>
                    <span className="text-[9px] font-mono text-primary/70 shrink-0">{v.value}</span>
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
  const [showPassword, setShowPassword] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [subjectVarOpen, setSubjectVarOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const subjectInputRef = useRef<HTMLInputElement>(null)
  const subjectVarRef = useRef<HTMLDivElement>(null)

  // Close subject var dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (subjectVarRef.current && !subjectVarRef.current.contains(e.target as Node)) {
        setSubjectVarOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // The email to use — client's registered email takes priority
  const clientEmail =
    clientDetails?.email?.trim() ||
    suggestedEmails.find((e) => e?.trim())?. trim() ||
    logins[0]?.email ||
    ''

  const currentLogin = logins[0] ?? null
  const hasCredentials = !!currentLogin?.password?.trim()

  // Sync logins when parent refreshes
  const initialLoginsKey = JSON.stringify(initialLogins)
  useEffect(() => {
    setLogins(initialLogins)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoginsKey])

  // Pre-fill subject + body from login template when compose opens
  useEffect(() => {
    if (!composeOpen) return
    listTemplates({ category: 'login' })
      .then((data) => {
        const tpl = data.find((t) => t.type === 'login_credentials') ?? data[0]
        if (!tpl) return
        setSubject(tpl.subject ?? '')
        if (editorRef.current) {
          editorRef.current.innerHTML = tpl.body ?? ''
          // fire the empty-check in RichEditor
          editorRef.current.dispatchEvent(new Event('input', { bubbles: true }))
        }
      })
      .catch(() => {})
  }, [composeOpen])

  const handleGeneratePassword = async () => {
    if (!clientEmail) {
      toast({ title: 'No email found', description: 'Client does not have a registered email address.', variant: 'destructive' })
      return
    }
    if (!onSave) return
    setIsGenerating(true)
    try {
      await onSave([{ email: clientEmail, password: '' }])
      toast({ title: 'Success', description: 'Password generated successfully.', variant: 'success' })
    } catch (error) {
      let message = 'Failed to generate password'
      if (error instanceof ApiError) message = typeof error.detail === 'string' ? error.detail : error.message
      else if (error instanceof Error) message = error.message
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRemove = async () => {
    if (!onRemoveLogin) return
    setIsRemoving(true)
    try {
      await onRemoveLogin()
      setLogins([])
      toast({ title: 'Removed', description: 'Login credentials deleted.', variant: 'success' })
    } catch {
      toast({ title: 'Error', description: 'Could not delete credentials. Please try again.', variant: 'destructive' })
    } finally {
      setIsRemoving(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: 'Copied', description: `${label} copied to clipboard.`, variant: 'success' })
    )
  }

  /* ── insert variable into subject at cursor ── */
  function insertSubjectVar(varStr: string) {
    const el = subjectInputRef.current
    if (!el) { setSubject((s) => s + varStr); return }
    const start = el.selectionStart ?? subject.length
    const end = el.selectionEnd ?? subject.length
    const next = subject.slice(0, start) + varStr + subject.slice(end)
    setSubject(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + varStr.length, start + varStr.length)
    })
    setSubjectVarOpen(false)
  }

  /* ── variable replacement for preview (snake_case = backend standard) ── */
  function resolveVars(html: string) {
    return html
      .replace(/\{\{client_name\}\}/g, clientDetails?.name ?? clientName ?? '')
      .replace(/\{\{client_email\}\}/g, clientDetails?.email ?? '')
      .replace(/\{\{client_phone\}\}/g, clientDetails?.phone ?? '')
      .replace(/\{\{company_name\}\}/g, clientDetails?.company ?? '')
      .replace(/\{\{org_name\}\}/g, senderDetails?.company ?? '')
      .replace(/\{\{org_admin_name\}\}/g, senderDetails?.name ?? '')
      .replace(/\{\{org_email\}\}/g, senderDetails?.email ?? '')
      .replace(/\{\{org_phone\}\}/g, senderDetails?.phone ?? '')
      .replace(/\{\{login_email\}\}/g, currentLogin?.email ?? '')
      .replace(/\{\{login_password\}\}/g, currentLogin?.password ?? '')
      .replace(/\{\{login_url\}\}/g, 'https://ca.navedhana.com')
  }

  function insertVariable(varStr: string) {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) { document.execCommand('insertText', false, varStr); return }
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

  /** Strip editor chip spans back to their {{var}} text — backend resolves all variables. */
  function cleanBodyForSend(rawHtml: string): string {
    const tmp = document.createElement('div')
    tmp.innerHTML = rawHtml
    tmp.querySelectorAll('span[contenteditable="false"]').forEach((span) => {
      span.replaceWith(document.createTextNode(span.textContent ?? ''))
    })
    return tmp.innerHTML
  }

  function getPreviewHtml() {
    return resolveVars(editorRef.current?.innerHTML ?? '')
  }

  function resolvedSubject() {
    return resolveVars(subject)
  }

  const handleSend = async () => {
    const to = currentLogin?.email
    if (!to) { toast({ title: 'No recipient', description: 'No login email found.', variant: 'destructive' }); return }
    if (!editorRef.current?.innerHTML.trim()) { toast({ title: 'Empty message', variant: 'destructive' }); return }
    setIsSending(true)
    try {
      const variables: Record<string, string> = {
        client_name: clientDetails?.name ?? clientName ?? '',
        client_email: clientDetails?.email ?? '',
        client_phone: clientDetails?.phone ?? '',
        company_name: clientDetails?.company ?? '',
        org_name: senderDetails?.company ?? '',
        org_admin_name: senderDetails?.name ?? '',
        org_email: senderDetails?.email ?? '',
        org_phone: senderDetails?.phone ?? '',
        login_email: currentLogin?.email ?? '',
        login_password: currentLogin?.password ?? '',
        login_url: 'https://ca.navedhana.com',
      }
      await sendEmail({ to, subject: resolveVars(subject), body: cleanBodyForSend(editorRef.current!.innerHTML), variables })
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
      <Card className="py-0 gap-0">
        <CardHeader className="px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Client Login Credentials</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {clientName ? `Login access for ${clientName}` : 'Manage client portal login access'}
              </CardDescription>
            </div>
            {hasCredentials && (
              <Badge variant="secondary" className="ml-auto text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />Active
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-5 py-4 space-y-4">
          {/* Email row — always shown, read-only */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Login Email</Label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/40">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm flex-1 truncate">
                {clientEmail || <span className="text-muted-foreground italic">No email on client profile</span>}
              </span>
              {clientEmail && (
                <button type="button" onClick={() => copyToClipboard(clientEmail, 'Email')} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Password row — only if credentials exist */}
          {hasCredentials && currentLogin && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-medium">Password</Label>
                <Badge variant="outline" className="text-[10px]">System Generated</Badge>
              </div>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/40">
                <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono flex-1">
                  {showPassword ? currentLogin.password : '••••••••••••'}
                </span>
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button type="button" onClick={() => copyToClipboard(currentLogin.password, 'Password')} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleGeneratePassword}
              disabled={isGenerating || !clientEmail}
              className="gap-1.5 h-8"
            >
              {isGenerating
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
                : hasCredentials
                  ? <><RefreshCw className="h-3.5 w-3.5" />Regenerate Password</>
                  : <><KeyRound className="h-3.5 w-3.5" />Generate Password</>
              }
            </Button>

            {hasCredentials && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isRemoving}
                className="gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isRemoving
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Removing…</>
                  : <><Trash2Icon className="h-3.5 w-3.5" />Remove</>
                }
              </Button>
            )}
          </div>

          {!clientEmail && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
              Add an email address to the client profile first to enable login credentials.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Compose Message Card (shown after credentials generated) ── */}
      {hasCredentials && (
        <Card className="py-0 gap-0">
          <CardHeader className="px-5 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Send Credentials</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Email login details to the client</CardDescription>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setComposeOpen((v) => !v)}>
                <Pencil className="h-3.5 w-3.5" />
                {composeOpen ? 'Close' : 'Compose'}
              </Button>
            </div>
          </CardHeader>

          {composeOpen && (
            <CardContent className="px-5 py-4 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Subject</Label>
                    <div className="relative" ref={subjectVarRef}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setSubjectVarOpen((v) => !v) }}
                        className="h-6 inline-flex items-center gap-1 px-2 rounded text-[10px] font-medium border border-input bg-background hover:bg-muted transition-colors"
                      >
                        <span className="text-primary font-mono text-[9px]">{'{{}}'}</span>
                        Variables
                        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                      </button>
                      {subjectVarOpen && (
                        <div className="absolute top-full right-0 mt-1 w-52 rounded-lg border border-border bg-popover shadow-lg z-50 py-1 text-sm max-h-56 overflow-y-auto">
                          {VAR_GROUPS.map((group) => (
                            <div key={group.label}>
                              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                              {group.vars.map((v) => (
                                <button key={v.value} type="button" onMouseDown={(e) => { e.preventDefault(); insertSubjectVar(v.value) }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center justify-between gap-2">
                                  <span>{v.label}</span>
                                  <span className="text-[10px] font-mono text-primary/70 shrink-0">{v.value}</span>
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Input ref={subjectInputRef} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject…" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Message</Label>
                  <div className="rounded-md border border-input overflow-hidden">
                    <Toolbar editorRef={editorRef} onInsertVariable={insertVariable} />
                    <RichEditor editorRef={editorRef} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto">
                  {VAR_GROUPS.flatMap((g) => g.vars).map((v) => (
                    <button key={v.value} type="button" onMouseDown={(e) => { e.preventDefault(); insertVariable(v.value) }} className="inline-flex items-center px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-[10px] font-mono text-primary/80 hover:bg-primary/15 transition-colors">
                      {v.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Send actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-3.5 w-3.5" />Preview
                </Button>
                <Button type="button" size="sm" className="gap-1.5 h-8" onClick={handleSend} disabled={isSending}>
                  {isSending ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Sending…</> : <><Send className="h-3.5 w-3.5" />Send Now</>}
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">To: {currentLogin?.email ?? '—'}</span>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Preview modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreviewOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold">Email Preview</h3>
            </div>
            {subject && (
              <div className="px-5 py-2 border-b border-border bg-muted/30 shrink-0">
                <p className="text-xs text-muted-foreground">Subject: <span className="text-foreground font-medium">{resolvedSubject()}</span></p>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4 prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
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
