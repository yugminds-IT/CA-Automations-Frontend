'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search, Mail, CheckSquare, Square, Send, FileText,
  ChevronDown, ChevronUp, Loader2, Eye, X, Users, Building2,
  MapPin, Tag, CircleUser, Calendar, Clock, Plus, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export function SendMails() {
  const { toast } = useToast()

  // Data
  const [clients, setClients] = useState<ClientItem[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [focusedClient, setFocusedClient] = useState<ClientItem | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')

  // Compose
  const [composeMode, setComposeMode] = useState<'template' | 'custom'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('Dear {{name}},\n\n')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false)

  // Client Details panel
  const [clientDetailsOpen, setClientDetailsOpen] = useState(true)

  // Auto-open client details panel whenever a client is selected/focused
  useEffect(() => {
    if (focusedClient) setClientDetailsOpen(true)
  }, [focusedClient?.id])

  // Schedule Emails
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('single_date')
  const [singleDate, setSingleDate] = useState('')
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [multipleDates, setMultipleDates] = useState<string[]>([''])
  const [times, setTimes] = useState<string[]>([''])
  const [isScheduling, setIsScheduling] = useState(false)

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
    setBody('Dear {{name}},\n\n')
  }

  // Build variables for a client
  const buildVars = (client: ClientItem): Record<string, string> => ({
    name: client.name,
    company: client.companyName,
    email: client.email,
    city: client.city ?? '',
    phone: client.phone ?? '',
    category: client.businessType ?? '',
  })

  const selectedClients = useMemo(
    () => clients.filter((c) => selectedIds.has(c.id)),
    [clients, selectedIds]
  )

  const previewClient = focusedClient ?? selectedClients[0] ?? clients.find((c) => selectedIds.has(c.id)) ?? null

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
          ? { to: client.email, subject: subject.trim(), body: substituteVars(body, buildVars(client)) }
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
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
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
                ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                : <Square className="h-3.5 w-3.5" />
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
                const isFocused = focusedClient?.id === client.id
                return (
                  <div
                    key={client.id}
                    onClick={() => { toggleClient(client.id); setFocusedClient(client) }}
                    className={`flex items-start gap-2.5 px-4 py-3 cursor-pointer border-b border-border/40 transition-colors
                      ${isFocused ? 'bg-accent/10' : isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'}
                    `}
                  >
                    {/* Checkbox */}
                    <div className="mt-0.5 shrink-0">
                      {isSelected
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-muted-foreground/50" />
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
                        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate">{client.email}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex flex-col gap-4">

          {/* Client Details Card — collapsible, default closed */}
          <div className="rounded-xl shadow-sm border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setClientDetailsOpen((v) => !v)}
              className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors ${
                previewClient
                  ? 'bg-primary/5 hover:bg-primary/8'
                  : 'bg-card hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <CircleUser className={`h-4 w-4 ${previewClient ? 'text-primary' : 'text-muted-foreground'}`} />
                <h2 className="text-sm font-semibold">Client Details</h2>
                {previewClient ? (
                  <span className="text-xs text-primary/70 font-medium">— {previewClient.name}</span>
                ) : (
                  <span className="text-xs text-muted-foreground font-normal">No client selected</span>
                )}
              </div>
              {clientDetailsOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </button>

            {clientDetailsOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-border bg-card">
                {previewClient ? (
                  <div className="flex flex-col sm:flex-row gap-4 mt-3">
                    <Avatar name={previewClient.name} size="lg" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 flex-1">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Name</p>
                        <p className="text-sm font-medium mt-0.5">{previewClient.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Company</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                          <p className="text-sm truncate">{previewClient.companyName || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Email</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          <p className="text-sm truncate">{previewClient.email || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">City</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <p className="text-sm">{previewClient.city || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Category</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                          <p className="text-sm">{previewClient.businessType || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</p>
                        <div className="mt-0.5">
                          {previewClient.status ? (
                            <span
                              className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                                previewClient.status.toLowerCase() === 'active'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {previewClient.status}
                            </span>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground">
                    <CircleUser className="h-5 w-5" />
                    <span className="text-sm">Select a client from the left to see their details</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule Emails Card */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Schedule Emails</h2>
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
                <div className="flex items-center gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
                    <input
                      type="date"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                      className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="mt-5">
                    <span className="text-xs text-muted-foreground">to</span>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
                    <input
                      type="date"
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                      className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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
                            <Trash2 className="h-3 w-3" />
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
                        <Trash2 className="h-3 w-3" />
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

          {/* Compose Message Card */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-5 flex-1">
            <h2 className="text-sm font-semibold mb-4">Compose Message</h2>

            {/* Channel tab */}
           

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
                <FileText className="h-3.5 w-3.5" />
                Use Template
              </Button>
              <Button
                type="button"
                variant={composeMode === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={handleCustomMode}
              >
                <Send className="h-3.5 w-3.5" />
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Message</label>
                {composeMode === 'custom' && (
                  <span className="text-[10px] text-muted-foreground/60">Click a variable below to insert</span>
                )}
              </div>
              {composeMode === 'custom' && (
                <div className="mb-2 p-2 bg-muted/40 rounded-md border border-border/50">
                  <div className="flex flex-wrap gap-1">
                    {[
                      '{{client_name}}', '{{client_email}}', '{{client_phone}}',
                      '{{company_name}}', '{{org_name}}', '{{org_email}}', '{{org_phone}}',
                      '{{service_name}}', '{{service_description}}',
                      '{{current_date}}', '{{date}}', '{{today}}',
                      '{{deadline_date}}', '{{follow_up_date}}',
                      '{{login_email}}', '{{login_password}}', '{{login_url}}',
                      '{{additional_notes}}', '{{amount}}', '{{document_name}}',
                    ].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('compose-body') as HTMLTextAreaElement
                          if (textarea) {
                            const start = textarea.selectionStart
                            const end = textarea.selectionEnd
                            const newText = body.substring(0, start) + variable + body.substring(end)
                            setBody(newText)
                            setTimeout(() => {
                              textarea.focus()
                              textarea.setSelectionRange(start + variable.length, start + variable.length)
                            }, 0)
                          } else {
                            setBody((prev) => prev + variable)
                          }
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-card hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors font-mono"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Textarea
                id="compose-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Dear {{client_name}}, ..."
                className="text-xs min-h-[160px] resize-y"
              />
            </div>

            {/* Recipient count badge */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-primary/5 rounded-md">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-primary font-medium">
                  {selectedIds.size} recipient{selectedIds.size > 1 ? 's' : ''} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setPreviewOpen(true)}
                disabled={!previewClient || (!subject && !body)}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setSendConfirmOpen(true)}
                disabled={isSending || selectedIds.size === 0 || (composeMode === 'template' && !selectedTemplate)}
              >
                {isSending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="h-3.5 w-3.5" /> Run Now</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview how the email will appear for <strong>{previewClient?.name ?? 'selected client'}</strong>
            </DialogDescription>
          </DialogHeader>
          {previewClient && (
            <div className="space-y-3">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-medium w-12">To:</span>
                    <span>{previewClient.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <span className="text-muted-foreground font-medium w-12">Subject:</span>
                    <span className="font-medium">{substituteVars(subject, buildVars(previewClient)) || '(no subject)'}</span>
                  </div>
                </div>
                <div className="p-4 text-sm whitespace-pre-wrap min-h-[100px] text-muted-foreground">
                  {substituteVars(body, buildVars(previewClient)) || '(no message)'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Run Now Confirmation Dialog */}
      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Mail Now?</DialogTitle>
            <DialogDescription className="pt-1">
              You are about to send this email immediately to{' '}
              <strong>{selectedIds.size} recipient{selectedIds.size > 1 ? 's' : ''}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-400">
            If you want to schedule this email for a later time, please use the <strong>Schedule Emails</strong> section above before sending.
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setSendConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs gap-1.5"
              disabled={isSending}
              onClick={() => {
                setSendConfirmOpen(false)
                handleSend()
              }}
            >
              {isSending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-3.5 w-3.5" /> Confirm & Send</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
