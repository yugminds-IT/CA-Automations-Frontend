'use client'

import * as React from 'react'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
import { ApiError, getUserData, getOrganizationData } from '@/lib/api/client'
import { listTemplates, sendEmail } from '@/lib/api/email-templates'
import { renderEmailPreview } from '@/lib/utils/email-template'
import { customValuesFor, humanize, systemVariables, usedVariables, useTemplateVariables, type TemplateVar } from '@/lib/template-variables'
import { SaveVariableDialog } from '@/components/email-management/custom-variables-dialog'
import { chipify, relabelChips, useVarTags, VarLineInput, VarPickerButton, type VarLineInputHandle } from '@/components/email-management/var-tags'
import { stripChips } from '@/components/email-management/send-mails-utils'
import { cn } from '@/lib/utils'

const DEFAULT_LOGIN_PORTAL_URL = 'https://ca.navedhana.com'

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

const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '36']
const FONT_FAMILIES = ['Default', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS']

/* ───────────────── tiny rich-text editor ─────────────── */

interface RichEditorProps {
  editorRef: React.RefObject<HTMLDivElement | null>
  placeholder?: string
  tags: ReturnType<typeof useVarTags>
  onChange: (raw: string) => void
}

function RichEditor({ editorRef, placeholder = 'Write your message here…', tags, onChange }: RichEditorProps) {
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
        onInput={(e) => { checkEmpty(); onChange(stripChips(e.currentTarget.innerHTML)); tags.update(e.currentTarget) }}
        onFocus={checkEmpty}
        onKeyDown={(e) => { tags.onKeyDown(e) }}
        onKeyUp={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) tags.update(e.currentTarget) }}
        onClick={tags.click}
        onBlur={(e) => tags.blur(e.currentTarget)}
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
  vars,
  onInsertVariable,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>
  vars: TemplateVar[]
  onInsertVariable: (v: string) => void
}) {
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
      <VarPickerButton vars={vars} label="Variables" align="start" onPick={onInsertVariable} />
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
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const subjectInputRef = useRef<VarLineInputHandle>(null)
  const { vars, custom, reloadCustom } = useTemplateVariables()
  // drafting helpers: "@xyz" -> Create / click an unknown tag -> offer to save it as a custom variable
  const [saveKey, setSaveKey] = useState<string | null>(null)
  const tagOptions = {
    onCreateVariable: (key: string) => setSaveKey(key),
    onTagClick: (key: string, known: boolean) => {
      const el = document.getElementById(`lv-${key}`) as HTMLInputElement | null
      if (el) el.focus()
      else if (!known) setSaveKey(key)
    },
  }
  const tags = useVarTags(vars, tagOptions)
  // values asked for this send: "asked when sending" variables and one-off (unsaved) ones
  const [bodyRaw, setBodyRaw] = useState('')
  const [sendValues, setSendValues] = useState<Record<string, string>>({})
  const askKeys = vars.length
    ? usedVariables(`${subject} ${bodyRaw}`).filter((k) => {
        const v = vars.find((x) => x.key === k)
        return !v || v.source === 'send'
      })
    : []
  const missingAsk = askKeys.filter((k) => !sendValues[k]?.trim())
  useEffect(() => relabelChips(editorRef.current, vars), [vars])

  // The email to use — client's registered email takes priority
  const clientEmail =
    clientDetails?.email?.trim() ||
    suggestedEmails.find((e) => e?.trim())?. trim() ||
    logins[0]?.email ||
    ''

  const currentLogin = logins[0] ?? null
  const hasCredentials = !!currentLogin?.password?.trim()

  const loginPortalUrl =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL?.trim()) || DEFAULT_LOGIN_PORTAL_URL

  const templateVariables = useMemo((): Record<string, string> => {
    const u = getUserData()
    const orgStore = getOrganizationData()
    const orgName =
      senderDetails?.company ?? u?.organization?.name ?? orgStore?.name ?? ''
    const adminName = senderDetails?.name ?? u?.name ?? u?.full_name ?? ''
    const adminEmail = senderDetails?.email ?? u?.email ?? ''
    const adminPhone = senderDetails?.phone ?? u?.phone ?? ''

    return {
      client_name: clientDetails?.name ?? clientName ?? '',
      client_email: clientDetails?.email ?? '',
      client_phone: clientDetails?.phone ?? '',
      company_name: clientDetails?.company ?? '',
      org_name: orgName,
      org_admin_name: adminName,
      org_email: adminEmail,
      org_phone: adminPhone,
      login_email: currentLogin?.email ?? clientEmail ?? '',
      login_password: currentLogin?.password ?? '',
      login_url: loginPortalUrl,
    }
  }, [
    clientDetails,
    clientName,
    senderDetails,
    clientEmail,
    currentLogin?.email,
    currentLogin?.password,
    loginPortalUrl,
  ])

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
          editorRef.current.innerHTML = chipify(tpl.body ?? '', vars)
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

  const insertVariable = (token: string) => tags.insert(token, editorRef.current)

  // Same rules as the server: tags -> {{tokens}}, system values, values escaped, unknown -> blank
  const renderPreview = () =>
    renderEmailPreview(subject, stripChips(editorRef.current?.innerHTML ?? ''), { ...systemVariables(), ...customValuesFor(custom), ...templateVariables, ...sendValues }) // the server also fills this client's own custom values

  const handleSend = async () => {
    const to = currentLogin?.email
    if (!to) { toast({ title: 'No recipient', description: 'No login email found.', variant: 'destructive' }); return }
    if (!editorRef.current?.innerHTML.trim()) { toast({ title: 'Empty message', variant: 'destructive' }); return }
    setIsSending(true)
    try {
      await sendEmail({
        to,
        subject: subject.trim(),
        body: stripChips(editorRef.current!.innerHTML),
        variables: { ...templateVariables, ...sendValues },
      })
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
              <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
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
                <Badge variant="outline" className="text-xs">System Generated</Badge>
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
              className="gap-1.5 h-9"
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
                className="gap-1.5 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
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
              <Button type="button" variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setComposeOpen((v) => !v)}>
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
                    <VarPickerButton vars={vars} label="Variables" onPick={(t) => subjectInputRef.current?.insert(t)} />
                  </div>
                  <VarLineInput ref={subjectInputRef} {...tagOptions} value={subject} onChange={setSubject} vars={vars} ariaLabel="Subject" placeholder="Email subject… (type @ to add a variable)" className="h-8 py-1 leading-6" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Message</Label>
                  <div className="rounded-md border border-input overflow-hidden">
                    <Toolbar editorRef={editorRef} vars={vars} onInsertVariable={insertVariable} />
                    <RichEditor editorRef={editorRef} tags={tags} onChange={setBodyRaw} />
                    {tags.popup}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto">
                  {vars.filter((v) => ['client', 'org', 'login'].includes(v.source)).map((v) => (
                    <button key={v.key} type="button" title={v.token} onMouseDown={(e) => { e.preventDefault(); insertVariable(v.token) }} className="inline-flex items-center px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary/80 hover:bg-primary/15 transition-colors">
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {askKeys.length > 0 && (
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-medium">Values for this email</p>
                  {askKeys.map((k) => {
                    const v = vars.find((x) => x.key === k)
                    return (
                      <div key={k} className="space-y-1">
                        <label htmlFor={`lv-${k}`} className="text-xs">
                          {v?.label ?? humanize(k)} <span className="text-destructive">*</span>
                          {!v && (
                            <button type="button" className="ml-2 text-primary underline" onClick={() => setSaveKey(k)}>Save as custom variable</button>
                          )}
                        </label>
                        <Input id={`lv-${k}`} className="h-8 text-sm" value={sendValues[k] ?? ''} placeholder={v?.example || `Value for {{${k}}}`}
                          onChange={(e) => setSendValues((s) => ({ ...s, [k]: e.target.value }))} />
                      </div>
                    )
                  })}
                </div>
              )}
              <SaveVariableDialog keyName={saveKey} onClose={() => setSaveKey(null)} onSaved={reloadCustom} />

              {/* Send actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-3.5 w-3.5" />Preview
                </Button>
                <Button type="button" size="sm" className="gap-1.5 h-9" onClick={handleSend} disabled={isSending || missingAsk.length > 0}>
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
                <p className="text-xs text-muted-foreground">Subject: <span className="text-foreground font-medium">{renderPreview().subject}</span></p>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4 prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: renderPreview().bodyHtml }} />
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
              <Button type="button" size="sm" onClick={() => { setPreviewOpen(false); handleSend() }} disabled={isSending || missingAsk.length > 0}>
                <Send className="h-3.5 w-3.5 mr-1.5" />Send Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
