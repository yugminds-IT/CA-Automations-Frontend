'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import {
  SearchMd, Mail01, CheckSquare as UUICheckSquare,
  Send01, ChevronDown, ChevronUp, Eye, XClose, Users01,
  Calendar, Clock, Plus, Trash01,
  Bold01, Italic01, Underline01, Strikethrough01,
  AlignLeft, AlignCenter, AlignRight, List, Palette,
  ArrowLeft, ArrowRight, User01,
} from '@untitled-ui/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { getClients } from '@/lib/api/clients'
import { listTemplates, sendEmail } from '@/lib/api/email-templates'
import { scheduleEmail } from '@/lib/api/mail-management'
import { getUserData } from '@/lib/api/index'
import type { EmailTemplate } from '@/lib/api/types'

type ScheduleMode = 'single_date' | 'date_range' | 'multiple_dates' | 'all_dates'

interface ClientItem {
  id: string | number
  name: string
  email: string
  companyName: string
  businessType?: string
  city?: string
  status?: string
  phone?: string | null
}

function transformClient(raw: any): ClientItem {
  const bt = raw.businessType ?? raw.business_type
  const businessType =
    typeof bt === 'object' && bt !== null && 'name' in bt
      ? (bt as { name: string }).name
      : typeof bt === 'string' ? bt : undefined
  return {
    id: raw.id,
    name: raw.name ?? raw.client_name ?? '',
    email: raw.email ?? '',
    companyName: raw.companyName ?? raw.company_name ?? '',
    businessType,
    city: raw.city ?? undefined,
    status: raw.status ?? undefined,
    phone: raw.phone ?? raw.phone_number ?? null,
  }
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const letter = name.trim().charAt(0).toUpperCase() || '?'
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
  ]
  const color = colors[letter.charCodeAt(0) % colors.length]
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}>
      {letter}
    </div>
  )
}

function substituteVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

/** Strip variable-chip spans and substitute values, then resolve remaining {{}} tokens */
function cleanAndSubstituteVars(html: string, vars: Record<string, string>): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('span[contenteditable="false"]').forEach((span) => {
    span.replaceWith(document.createTextNode(substituteVars(span.textContent ?? '', vars)))
  })
  return substituteVars(tmp.innerHTML, vars)
}

const COMPOSE_VAR_GROUPS = [
  {
    label: 'Client Details',
    vars: [
      { label: 'Name',    value: '{{clientName}}' },
      { label: 'Email',   value: '{{clientEmail}}' },
      { label: 'Phone',   value: '{{clientPhone}}' },
      { label: 'Company', value: '{{clientCompany}}' },
      { label: 'City',    value: '{{clientCity}}' },
      { label: 'Status',  value: '{{clientStatus}}' },
    ],
  },
  {
    label: 'Sender Details',
    vars: [
      { label: 'Name',    value: '{{senderName}}' },
      { label: 'Email',   value: '{{senderEmail}}' },
      { label: 'Phone',   value: '{{senderPhone}}' },
      { label: 'Company', value: '{{senderCompany}}' },
    ],
  },
]

const FONT_SIZES_SM = ['12', '14', '16', '18', '20', '24', '28', '32']
const FONT_FAMILIES_SM = ['Default', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana']

export function SendMails() {
  const { toast } = useToast()

  // Data
  const [clients, setClients] = useState<ClientItem[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [expandedClientId, setExpandedClientId] = useState<string | number | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')

  // Compose
  const [composeMode, setComposeMode] = useState<'template' | 'custom'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('Dear {{clientName}},<br><br>')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewClientIndex, setPreviewClientIndex] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)
  const [varDropdownOpen, setVarDropdownOpen] = useState(false)
  const varDropdownRef = useRef<HTMLDivElement>(null)
  const [isSending, setIsSending] = useState(false)
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false)

  // Schedule drawer
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false)

  // Schedule Emails
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('single_date')
  const [singleDate, setSingleDate] = useState('')
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [multipleDates, setMultipleDates] = useState<string[]>([''])
  const [times, setTimes] = useState<string[]>([''])
  const [isScheduling, setIsScheduling] = useState(false)

  // Close variable dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (varDropdownRef.current && !varDropdownRef.current.contains(e.target as Node)) {
        setVarDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addTime = () => setTimes((t) => [...t, ''])
  const removeTime = (i: number) => setTimes((t) => t.filter((_, idx) => idx !== i))
  const updateTime = (i: number, val: string) => setTimes((t) => t.map((v, idx) => idx === i ? val : v))

  const addMultipleDate = () => setMultipleDates((d) => [...d, ''])
  const removeMultipleDate = (i: number) => setMultipleDates((d) => d.filter((_, idx) => idx !== i))
  const updateMultipleDate = (i: number, val: string) => setMultipleDates((d) => d.map((v, idx) => idx === i ? val : v))

  const handleSchedule = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'No recipients', description: 'Please select at least one client.', variant: 'destructive' })
      return
    }
    if (!selectedTemplate) {
      toast({ title: 'No template', description: 'Please select a template in Compose Message.', variant: 'destructive' })
      return
    }
    const validTimes = times.filter((t) => t.trim())
    if (validTimes.length === 0) {
      toast({ title: 'No time set', description: 'Please add at least one send time.', variant: 'destructive' })
      return
    }

    // Compute browser timezone offset, e.g. "+05:30" for IST
    const tzOffsetMin = -new Date().getTimezoneOffset()
    const tzSign = tzOffsetMin >= 0 ? '+' : '-'
    const tzAbs = Math.abs(tzOffsetMin)
    const timeZoneOffset = `${tzSign}${String(Math.floor(tzAbs / 60)).padStart(2, '0')}:${String(tzAbs % 60).padStart(2, '0')}`

    let schedule: any
    if (scheduleMode === 'single_date') {
      if (!singleDate) { toast({ title: 'No date', description: 'Please select a date.', variant: 'destructive' }); return }
      schedule = { type: 'single_date', date: singleDate, times: validTimes, timeZoneOffset }
    } else if (scheduleMode === 'date_range') {
      if (!rangeFrom || !rangeTo) { toast({ title: 'Incomplete range', description: 'Please set both From and To dates.', variant: 'destructive' }); return }
      schedule = { type: 'date_range', fromDate: rangeFrom, toDate: rangeTo, times: validTimes, timeZoneOffset }
    } else if (scheduleMode === 'multiple_dates') {
      const validDates = multipleDates.filter((d) => d.trim())
      if (validDates.length === 0) { toast({ title: 'No dates', description: 'Please add at least one date.', variant: 'destructive' }); return }
      schedule = { type: 'multiple_dates', dates: validDates, times: validTimes, timeZoneOffset }
    } else {
      // all_dates → wide date_range from today to 1 year ahead
      const today = new Date()
      const nextYear = new Date(today)
      nextYear.setFullYear(today.getFullYear() + 1)
      schedule = {
        type: 'date_range',
        fromDate: today.toISOString().split('T')[0],
        toDate: nextYear.toISOString().split('T')[0],
        times: validTimes,
        timeZoneOffset,
      }
    }

    setIsScheduling(true)
    try {
      await scheduleEmail({
        templateId: Number(selectedTemplate.id),
        recipientEmails: selectedClients.map((c) => c.email),
        schedule,
      })
      toast({ title: 'Scheduled!', description: `Email scheduled for ${selectedIds.size} client${selectedIds.size > 1 ? 's' : ''}.`, variant: 'success' })
    } catch (err) {
      console.error('Failed to schedule email:', err)
      toast({ title: 'Error', description: 'Failed to schedule email.', variant: 'destructive' })
    } finally {
      setIsScheduling(false)
    }
  }

  // Load data
  useEffect(() => {
    setIsLoadingClients(true)
    getClients()
      .then((res: any) => {
        const list = Array.isArray(res?.clients) ? res.clients : Array.isArray(res) ? res : []
        setClients(list.map(transformClient))
      })
      .catch((err) => {
        console.error('Failed to load clients:', err)
        toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' })
      })
      .finally(() => setIsLoadingClients(false))
  }, [])

  useEffect(() => {
    setIsLoadingTemplates(true)
    const user = getUserData()
    listTemplates({ organizationId: user?.organizationId != null ? Number(user.organizationId) : undefined })
      .then((list) => setTemplates(Array.isArray(list) ? list : []))
      .catch((err) => {
        console.error('Failed to load templates:', err)
      })
      .finally(() => setIsLoadingTemplates(false))
  }, [])

  // All unique categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    clients.forEach((c) => { if (c.businessType) cats.add(c.businessType) })
    return ['All Categories', ...Array.from(cats).sort()]
  }, [clients])

  // Filtered clients
  const filteredClients = useMemo(() => {
    let list = clients
    if (categoryFilter !== 'All Categories') {
      list = list.filter((c) => c.businessType === categoryFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.companyName.toLowerCase().includes(q)
      )
    }
    return list
  }, [clients, search, categoryFilter])

  const allSelected = filteredClients.length > 0 && filteredClients.every((c) => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredClients.forEach((c) => next.delete(c.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredClients.forEach((c) => next.add(c.id))
        return next
      })
    }
  }

  const toggleClient = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectTemplate = (tmpl: EmailTemplate) => {
    setSelectedTemplate(tmpl)
    setSubject(tmpl.subject || '')
    setBody(tmpl.body || '')
    setComposeMode('template')
  }

  const handleCustomMode = () => {
    setComposeMode('custom')
    setSelectedTemplate(null)
    setSubject('')
    setBody('')
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = 'Dear {{clientName}},<br><br>'
    }, 0)
  }

  // Build variables for a client (includes sender info)
  const buildVars = (client: ClientItem): Record<string, string> => {
    const user = getUserData() as any
    const orgName = user?.organization?.name ?? user?.org_name ?? ''
    const orgEmail = user?.organization?.email ?? user?.org_email ?? user?.email ?? ''
    const orgPhone = user?.organization?.phone ?? user?.org_phone ?? user?.phone ?? ''
    return {
      // legacy short keys
      name: client.name,
      company: client.companyName,
      email: client.email,
      city: client.city ?? '',
      phone: client.phone ?? '',
      category: client.businessType ?? '',
      // client vars — camelCase (compose editor)
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone ?? '',
      clientCompany: client.companyName,
      clientCity: client.city ?? '',
      clientStatus: client.status ?? '',
      // client vars — snake_case (template variables)
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone ?? '',
      company_name: client.companyName,
      // org vars — snake_case (template variables)
      org_name: orgName,
      org_email: orgEmail,
      org_phone: orgPhone,
      // sender vars — camelCase
      senderName: user?.name ?? user?.full_name ?? '',
      senderEmail: user?.email ?? '',
      senderPhone: user?.phone ?? '',
      senderCompany: orgName,
    }
  }

  // Insert variable chip into the rich editor
  const insertVarChip = (varStr: string) => {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const span = document.createElement('span')
    span.className = 'inline-flex items-center px-1 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary mx-0.5'
    span.contentEditable = 'false'
    span.textContent = varStr
    range.insertNode(span)
    range.setStartAfter(span)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    setVarDropdownOpen(false)
  }

  // Exec formatting command on the editor
  const execCmd = (cmd: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
  }

  const selectedClients = useMemo(
    () => clients.filter((c) => selectedIds.has(c.id)),
    [clients, selectedIds]
  )

  const previewClient = selectedClients[previewClientIndex] ?? selectedClients[0] ?? null

  const openPreview = () => { setPreviewClientIndex(0); setPreviewOpen(true) }

  const handleSend = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'No recipients', description: 'Please select at least one client.', variant: 'destructive' })
      return
    }
    if (composeMode === 'template' && !selectedTemplate) {
      toast({ title: 'No template', description: 'Please select a template or switch to Custom Email.', variant: 'destructive' })
      return
    }
    if (composeMode === 'custom' && !subject.trim()) {
      toast({ title: 'Missing subject', description: 'Please enter an email subject.', variant: 'destructive' })
      return
    }

    setIsSending(true)
    let successCount = 0
    let errorCount = 0

    for (const client of selectedClients) {
      try {
        const payload = composeMode === 'custom'
          ? { to: client.email, subject: subject.trim(), body: cleanAndSubstituteVars(editorRef.current?.innerHTML ?? '', buildVars(client)) }
          : { to: client.email, templateId: selectedTemplate!.id, variables: buildVars(client) }
        const result = await sendEmail(payload) as { sent: boolean }
        if (result?.sent === false) {
          errorCount++
        } else {
          successCount++
        }
      } catch (err) {
        console.error(`Failed to send to ${client.email}:`, err)
        errorCount++
      }
    }

    setIsSending(false)

    if (errorCount === 0) {
      toast({
        title: 'Emails sent!',
        description: `Successfully sent to ${successCount} client${successCount > 1 ? 's' : ''}.`,
        variant: 'success',
      })
      setSelectedIds(new Set())
    } else {
      toast({
        title: 'Partial success',
        description: `Sent: ${successCount}, Failed: ${errorCount}.`,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-full bg-background p-4 sm:p-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Send Mails</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Select clients and compose an email to send</p>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">

        {/* ── LEFT PANEL ── */}
        <div className="bg-card rounded-xl shadow-sm border border-border flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Panel header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Select Clients</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
                    <span className="max-w-[100px] truncate">{categoryFilter}</span>
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {allCategories.map((cat) => (
                    <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)} className={`text-xs ${categoryFilter === cat ? 'font-medium' : ''}`}>
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Search */}
            <div className="relative">
              <SearchMd className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Select All */}
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {allSelected
                ? <UUICheckSquare className="h-3.5 w-3.5 text-primary" />
                : <div className="h-3.5 w-3.5 rounded border border-muted-foreground/40" />
              }
              Select All
              {selectedIds.size > 0 && (
                <span className="ml-auto text-primary font-medium">{selectedIds.size} selected</span>
              )}
            </button>
          </div>

          {/* Client list */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingClients ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                <span className="text-xs text-muted-foreground">Loading clients...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No clients found
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = selectedIds.has(client.id)
                const isExpanded = expandedClientId === client.id
                return (
                  <div key={client.id} className={`border-b border-border/40 ${isSelected ? 'bg-primary/5' : ''}`}>
                    <div
                      onClick={() => toggleClient(client.id)}
                      className={`flex items-start gap-2.5 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/40`}
                    >
                      {/* Checkbox */}
                      <div className="mt-0.5 shrink-0">
                        {isSelected
                          ? <UUICheckSquare className="h-4 w-4 text-primary" />
                          : <div className="h-4 w-4 rounded border border-muted-foreground/40" />
                        }
                      </div>

                      {/* Avatar */}
                      <Avatar name={client.name} size="sm" />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-medium truncate">{client.name}</span>
                          {client.businessType && (
                            <span className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5 shrink-0 max-w-[70px] truncate">
                              {client.businessType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail01 className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground truncate">{client.email}</span>
                        </div>
                      </div>

                      {/* Expand chevron */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setExpandedClientId(isExpanded ? null : client.id) }}
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5" />
                          : <ChevronDown className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>

                    {/* Inline expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 bg-muted/30 border-t border-border/40 grid grid-cols-2 gap-x-4 gap-y-1.5">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Company</p>
                          <p className="text-xs mt-0.5 truncate">{client.companyName || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Phone</p>
                          <p className="text-xs mt-0.5">{client.phone || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">City</p>
                          <p className="text-xs mt-0.5">{client.city || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</p>
                          {client.status ? (
                            <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${
                              client.status.toLowerCase() === 'active'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-muted text-muted-foreground'
                            }`}>{client.status}</span>
                          ) : <p className="text-xs mt-0.5 text-muted-foreground">—</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex flex-col gap-4">

          {/* Compose + Schedule side by side */}
          <div className={`flex gap-4 items-start`}>

          {/* Compose Message Card */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-5 flex-1">
            <h2 className="text-sm font-semibold mb-4">Compose Message</h2>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={composeMode === 'template' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={() => {
                  setComposeMode('template')
                  if (!selectedTemplate) { setSubject(''); setBody('Dear {{name}},\n\n') }
                }}
              >
                <Mail01 className="h-3.5 w-3.5" />
                Use Template
              </Button>
              <Button
                type="button"
                variant={composeMode === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={handleCustomMode}
              >
                <Send01 className="h-3.5 w-3.5" />
                Custom Email
              </Button>
            </div>

            {/* Template selector */}
            {composeMode === 'template' && (
              <div className="mb-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8">
                      <span className="truncate">
                        {isLoadingTemplates
                          ? 'Loading templates...'
                          : selectedTemplate
                          ? selectedTemplate.name
                          : 'Pick a template…'}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64">
                    {templates.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No templates found</div>
                    ) : (
                      templates.map((t) => (
                        <DropdownMenuItem key={t.id} onClick={() => handleSelectTemplate(t)} className="text-xs">
                          <div>
                            <p className="font-medium">{t.name}</p>
                            <p className="text-muted-foreground truncate max-w-[220px]">{t.subject}</p>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Subject */}
            <div className="mb-3">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="h-8 text-xs"
              />
            </div>

            {/* Body */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message</label>

              {composeMode === 'custom' ? (
                <div className="rounded-md border border-input overflow-hidden">
                  {/* Formatting toolbar */}
                  <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-input bg-muted/30">
                    {[
                      { cmd: 'bold',          icon: <Bold01 className="h-3.5 w-3.5" />,         title: 'Bold' },
                      { cmd: 'italic',        icon: <Italic01 className="h-3.5 w-3.5" />,       title: 'Italic' },
                      { cmd: 'underline',     icon: <Underline01 className="h-3.5 w-3.5" />,    title: 'Underline' },
                      { cmd: 'strikeThrough', icon: <Strikethrough01 className="h-3.5 w-3.5" />,title: 'Strikethrough' },
                    ].map(({ cmd, icon, title }) => (
                      <button key={cmd} type="button" title={title}
                        onMouseDown={(e) => { e.preventDefault(); execCmd(cmd) }}
                        className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >{icon}</button>
                    ))}

                    <span className="w-px h-4 bg-border mx-1" />

                    <select title="Font Size" defaultValue=""
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => { editorRef.current?.focus(); execCmd('fontSize', e.target.value) }}
                      className="h-7 rounded border border-input bg-background text-xs px-1 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="" disabled>Size</option>
                      {FONT_SIZES_SM.map((s) => <option key={s} value={s}>{s}px</option>)}
                    </select>

                    <select title="Font Family" defaultValue=""
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => { editorRef.current?.focus(); execCmd('fontName', e.target.value) }}
                      className="h-7 rounded border border-input bg-background text-xs px-1 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="" disabled>Font</option>
                      {FONT_FAMILIES_SM.map((f) => <option key={f} value={f === 'Default' ? 'inherit' : f}>{f}</option>)}
                    </select>

                    <span className="w-px h-4 bg-border mx-1" />

                    {[
                      { cmd: 'justifyLeft',   icon: <AlignLeft className="h-3.5 w-3.5" />,   title: 'Align Left' },
                      { cmd: 'justifyCenter', icon: <AlignCenter className="h-3.5 w-3.5" />, title: 'Align Center' },
                      { cmd: 'justifyRight',  icon: <AlignRight className="h-3.5 w-3.5" />,  title: 'Align Right' },
                    ].map(({ cmd, icon, title }) => (
                      <button key={cmd} type="button" title={title}
                        onMouseDown={(e) => { e.preventDefault(); execCmd(cmd) }}
                        className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >{icon}</button>
                    ))}

                    <span className="w-px h-4 bg-border mx-1" />

                    {/* Text colour */}
                    <label title="Text Color" className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground">
                      <span className="text-xs font-bold underline">A</span>
                      <input type="color" className="sr-only"
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => { editorRef.current?.focus(); execCmd('foreColor', e.target.value) }} />
                    </label>

                    <span className="w-px h-4 bg-border mx-1" />

                    {/* Variables dropdown */}
                    <div className="relative" ref={varDropdownRef}>
                      <button type="button"
                        onMouseDown={(e) => { e.preventDefault(); setVarDropdownOpen((v) => !v) }}
                        className="h-7 inline-flex items-center gap-1 px-2 rounded text-xs font-medium border border-input bg-background hover:bg-muted transition-colors"
                      >
                        <span className="text-primary font-mono text-[10px]">{'{{}}'}</span>
                        Variables
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                      {varDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-52 max-h-[240px] overflow-y-auto rounded-lg border border-border bg-popover shadow-lg z-50 py-1 text-sm">
                          {COMPOSE_VAR_GROUPS.map((group) => (
                            <div key={group.label}>
                              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                              {group.vars.map((v) => (
                                <button key={v.value} type="button"
                                  onMouseDown={(e) => { e.preventDefault(); insertVarChip(v.value) }}
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

                  {/* contentEditable editor */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-[320px] w-full bg-background px-3 py-3 text-sm focus:outline-none [&_b]:font-bold [&_i]:italic [&_u]:underline [&_s]:line-through"
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: 'Dear {{clientName}},<br><br>' }}
                  />
                </div>
              ) : (
                /* Template mode: show read-only preview of template body */
                <div className="min-h-[320px] rounded-md border border-input bg-muted/30 px-3 py-3 text-xs text-muted-foreground overflow-y-auto">
                  {selectedTemplate
                    ? <div dangerouslySetInnerHTML={{ __html: selectedTemplate.body }} />
                    : <span>Select a template above to preview its content.</span>}
                </div>
              )}

              {/* Variable reference chips (custom mode only) */}
              {composeMode === 'custom' && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {COMPOSE_VAR_GROUPS.flatMap((g) => g.vars).map((v) => (
                    <button key={v.value} type="button"
                      onMouseDown={(e) => { e.preventDefault(); insertVarChip(v.value) }}
                      className={cn('inline-flex items-center px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-[10px] font-mono text-primary/80 hover:bg-primary/15 transition-colors')}
                    >{v.value}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Recipient count badge */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mb-4 p-2.5 bg-primary/5 rounded-lg border border-primary/10">
                <Users01 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs text-primary font-medium">
                  {selectedIds.size} recipient{selectedIds.size > 1 ? 's' : ''} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XClose className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-lg"
                onClick={openPreview}
                disabled={selectedIds.size === 0 || (!subject && !body)}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-lg"
                onClick={() => setScheduleDrawerOpen((v) => !v)}
              >
                <Calendar className="h-3.5 w-3.5" />
                Schedule
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-lg bg-primary hover:bg-primary/90"
                onClick={() => setSendConfirmOpen(true)}
                disabled={isSending || selectedIds.size === 0 || (composeMode === 'template' && !selectedTemplate)}
              >
                {isSending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
                ) : (
                  <><Send01 className="h-3.5 w-3.5" /> Send Now</>
                )}
              </Button>
            </div>
          </div>

          {/* Schedule Emails Card — shown to the right of Compose when open */}
          {scheduleDrawerOpen && (
          <div className="bg-card rounded-xl shadow-sm border border-border p-5 w-72 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>
                <h2 className="text-sm font-semibold">Schedule Emails</h2>
              </div>
              <button type="button" onClick={() => setScheduleDrawerOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted">
                <XClose className="h-4 w-4" />
              </button>
            </div>

            {/* Schedule type selector */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Schedule Type</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'single_date', label: 'Single Date' },
                  { value: 'date_range', label: 'Date Range' },
                  { value: 'multiple_dates', label: 'Multiple Dates' },
                  { value: 'all_dates', label: 'All Dates' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScheduleMode(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      scheduleMode === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date inputs */}
            <div className="mb-4">
              {scheduleMode === 'single_date' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date</label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}

              {scheduleMode === 'date_range' && (
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
                    <input
                      type="date"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
                    <input
                      type="date"
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              )}

              {scheduleMode === 'multiple_dates' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Dates</label>
                  <div className="flex flex-wrap gap-2">
                    {multipleDates.map((d, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input
                          type="date"
                          value={d}
                          onChange={(e) => updateMultipleDate(i, e.target.value)}
                          className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {multipleDates.length > 1 && (
                          <button type="button" onClick={() => removeMultipleDate(i)}
                            className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors shrink-0">
                            <Trash01 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addMultipleDate}
                      className="h-8 flex items-center gap-1 px-2 text-xs text-primary hover:text-primary/80 border border-dashed border-primary/40 rounded-md transition-colors">
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>
              )}

              {scheduleMode === 'all_dates' && (
                <div className="flex items-center gap-2 p-2.5 bg-primary/5 rounded-md border border-primary/20 w-fit">
                  <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-xs text-primary/80">Every day · next 12 months</p>
                </div>
              )}
            </div>

            {/* Times section */}
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Send Times
                </label>
                <button type="button" onClick={addTime}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {times.map((t, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      type="time"
                      value={t}
                      onChange={(e) => updateTime(i, e.target.value)}
                      className="h-8 w-28 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {times.length > 1 && (
                      <button type="button" onClick={() => removeTime(i)}
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors shrink-0">
                        <Trash01 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule button */}
            <Button
              type="button"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={handleSchedule}
              disabled={isScheduling || selectedIds.size === 0 || !selectedTemplate}
            >
              {isScheduling ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scheduling...</>
              ) : (
                <><Calendar className="h-3.5 w-3.5" /> Schedule Emails</>
              )}
            </Button>
            {selectedIds.size === 0 && (
              <p className="text-[11px] text-muted-foreground text-center mt-2">Select clients and a template to schedule</p>
            )}
          </div>
          )}

          </div>
        </div>
      </div>

      {/* ── Preview Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail01 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Email Preview</h2>
                {selectedClients.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {previewClientIndex + 1} of {selectedClients.length} recipients
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedClients.length > 1 && (
                <>
                  <button
                    type="button"
                    disabled={previewClientIndex === 0}
                    onClick={() => setPreviewClientIndex((i) => i - 1)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={previewClientIndex === selectedClients.length - 1}
                    onClick={() => setPreviewClientIndex((i) => i + 1)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <XClose className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {previewClient && (
            <>
              {/* Email metadata */}
              <div className="px-5 py-3 border-b border-border bg-background space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User01 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{previewClient.name}</span>
                      {previewClient.businessType && (
                        <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 shrink-0">{previewClient.businessType}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{previewClient.email}</span>
                  </div>
                </div>
                <div className="pl-11">
                  <p className="text-xs text-muted-foreground mb-0.5">Subject</p>
                  <p className="text-sm font-medium">{substituteVars(subject, buildVars(previewClient)) || '(no subject)'}</p>
                </div>
              </div>

              {/* Email body */}
              <div
                className="px-6 py-5 text-sm min-h-[200px] max-h-[420px] overflow-y-auto bg-background leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: composeMode === 'custom'
                    ? (editorRef.current ? cleanAndSubstituteVars(editorRef.current.innerHTML, buildVars(previewClient)) : substituteVars(body, buildVars(previewClient)))
                    : substituteVars(selectedTemplate?.body ?? '', buildVars(previewClient)) || '<span class="text-muted-foreground">(no message)</span>'
                }}
              />

              {/* Footer actions */}
              <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {selectedClients.length} recipient{selectedClients.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs h-8 rounded-lg" onClick={() => setPreviewOpen(false)}>
                    Close
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs h-8 rounded-lg gap-1.5"
                    disabled={isSending || selectedIds.size === 0 || (composeMode === 'template' && !selectedTemplate)}
                    onClick={() => { setPreviewOpen(false); setSendConfirmOpen(true) }}
                  >
                    <Send01 className="h-3.5 w-3.5" />
                    Send Now
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Send Confirmation Dialog ───────────────────────────────────────── */}
      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Send01 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Send Emails?</DialogTitle>
                <DialogDescription className="mt-0.5">
                  To <strong>{selectedIds.size} recipient{selectedIds.size > 1 ? 's' : ''}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-400">
            Use <strong>Schedule</strong> to send at a specific time instead.
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <Button variant="outline" size="sm" className="text-xs rounded-lg" onClick={() => setSendConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs gap-1.5 rounded-lg"
              disabled={isSending}
              onClick={() => { setSendConfirmOpen(false); handleSend() }}
            >
              {isSending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
                : <><Send01 className="h-3.5 w-3.5" /> Confirm & Send</>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
