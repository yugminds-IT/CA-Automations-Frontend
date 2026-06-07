'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Loader2, Trash2, RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, Repeat, Pencil, Play, StopCircle, ChevronDown, Plus } from 'lucide-react'
import { LekvyaLoader } from '@/components/ui/lekvya-loader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import {
  listSchedules, cancelSchedule, updateSchedule,
  listRecurringSchedules, stopRecurringSchedule, startRecurringSchedule,
  updateRecurringSchedule, deleteRecurringSchedule,
} from '@/lib/api/mail-management'
import type { RecurringSchedule } from '@/lib/api/types'

interface Schedule {
  id: number | string
  templateId?: number
  templateName?: string
  templateOrganizationId?: number | null
  template?: { id?: number; name?: string; organizationId?: number | null; category?: string; type?: string }
  recipientEmails?: string[]
  status?: string
  scheduledAt?: string
  createdAt?: string
  subject?: string
  body?: string
  recurring?: boolean
  isRecurring?: boolean
  [key: string]: unknown
}

type TabKey = 'all' | 'upcoming' | 'sent' | 'recurring' | 'failed'
type RecurringAction = 'stop' | 'start' | 'delete'

const POLL_INTERVAL_MS = 30_000
const TICK_MS = 1_000
const PAGE_SIZE_OPTIONS = [50, 100, 200, 300, 400, 500, 1000]
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

function parseUTC(val: string | null | undefined): Date | null {
  if (!val) return null
  try {
    let s = String(val).trim()
    s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
    s = s.replace(/(\.\d{3})\d+/, '$1')
    if (!/Z$|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z'
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  } catch { return null }
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '—'
  const d = parseUTC(val)
  if (!d) return val
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
  } catch { return val }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Sending…'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`
  if (hours > 0) return `${String(hours).padStart(2, '00')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
  return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
}

function CountdownCell({ scheduledAt }: { scheduledAt?: string }) {
  const target = useMemo(() => parseUTC(scheduledAt), [scheduledAt])
  const [remaining, setRemaining] = useState<number>(() => target ? target.getTime() - Date.now() : -1)
  useEffect(() => {
    if (!target) return
    const tick = () => setRemaining(target.getTime() - Date.now())
    tick()
    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [target])
  if (!target) return <span className="text-muted-foreground text-xs">—</span>
  if (remaining <= 0) return <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium"><Clock className="h-3 w-3" /> Sending…</span>
  return <span className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 font-medium"><Clock className="h-3 w-3 shrink-0" />{formatCountdown(remaining)}</span>
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>
  const lower = status.toLowerCase()
  const config =
    lower === 'sent' || lower === 'completed' ? { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', label: status }
    : lower === 'cancelled' || lower === 'canceled' ? { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: status }
    : lower === 'failed' ? { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', label: status }
    : lower === 'recurring' ? { icon: Repeat, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', label: status }
    : { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', label: status }
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${config.bg} ${config.color}`}>
      <Icon className="h-3 w-3" />{config.label}
    </span>
  )
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'sent', label: 'Sent' },
  { key: 'recurring', label: 'Recurring' },
  { key: 'failed', label: 'Failed' },
]

function isScheduleCancellable(s: Schedule): boolean {
  const status = (s.status ?? '').toLowerCase()
  return status === 'pending' || status === 'scheduled'
}

function filterByTab(schedules: Schedule[], tab: TabKey): Schedule[] {
  if (tab === 'all') return schedules
  return schedules.filter((s) => {
    const lower = (s.status ?? '').toLowerCase()
    switch (tab) {
      case 'upcoming': return lower === 'pending' || lower === 'scheduled'
      case 'sent': return lower === 'sent' || lower === 'completed'
      case 'recurring': return lower === 'recurring' || s.recurring === true || s.isRecurring === true
      case 'failed': return lower === 'failed'
      default: return true
    }
  })
}

function PaginationFooter({
  total, pageSize, currentPage, onPageChange, onPageSizeChange,
}: {
  total: number
  pageSize: number
  currentPage: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 mt-3 text-sm">
      <span className="text-muted-foreground text-xs">
        {total === 0 ? 'No records' : `Showing ${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs px-2.5">
              {pageSize} <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-24">
            {PAGE_SIZE_OPTIONS.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onPageSizeChange(s)}
                className={`text-xs ${s === pageSize ? 'font-semibold text-primary' : ''}`}>
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>‹</Button>
        <span className="text-xs text-muted-foreground min-w-[60px] text-center">{currentPage} / {totalPages}</span>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>›</Button>
      </div>
    </div>
  )
}

export function ScheduledMails() {
  const { toast } = useToast()

  // Regular schedules state
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState<Schedule | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editRecipients, setEditRecipients] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false)
  const [isBulkCancelling, setIsBulkCancelling] = useState(false)
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)

  // Recurring schedules state
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([])
  const [recurringSelectedIds, setRecurringSelectedIds] = useState<Set<string>>(new Set())

  // Single-row recurring actions
  const [recurringActionTarget, setRecurringActionTarget] = useState<RecurringSchedule | null>(null)
  const [recurringAction, setRecurringAction] = useState<RecurringAction | null>(null)
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  // Bulk recurring actions
  const [bulkRecurringAction, setBulkRecurringAction] = useState<RecurringAction | null>(null)
  const [isBulkRecurring, setIsBulkRecurring] = useState(false)

  // Edit recurring dialog
  const [editRecurringTarget, setEditRecurringTarget] = useState<RecurringSchedule | null>(null)
  const [editRecurringMonths, setEditRecurringMonths] = useState<number[]>([])
  const [editRecurringDays, setEditRecurringDays] = useState<number[]>([])
  const [editRecurringTimes, setEditRecurringTimes] = useState<string[]>([''])
  const [editRecurringRecipients, setEditRecurringRecipients] = useState('')
  const [isSavingRecurring, setIsSavingRecurring] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── load ──────────────────────────────────────────────────────────────────
  const loadRecurring = useCallback(async (silent = false) => {
    try {
      const res = await listRecurringSchedules()
      setRecurringSchedules(Array.isArray(res) ? (res as RecurringSchedule[]) : [])
    } catch (err) {
      console.error('Failed to load recurring schedules:', err)
      if (!silent) toast({ title: 'Error', description: 'Failed to load recurring schedules.', variant: 'destructive' })
    }
  }, [toast])

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const res = await listSchedules()
      const list = Array.isArray(res) ? res : Array.isArray((res as any)?.schedules) ? (res as any).schedules : []
      setSchedules(list)
    } catch (err) {
      console.error('Failed to load schedules:', err)
      if (!silent) toast({ title: 'Error', description: 'Failed to load scheduled mails.', variant: 'destructive' })
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [toast])

  useEffect(() => { load(); loadRecurring() }, [load, loadRecurring])
  useEffect(() => { setSelectedIds(new Set()); setRecurringSelectedIds(new Set()); setCurrentPage(1) }, [activeTab])
  useEffect(() => { setCurrentPage(1) }, [pageSize])
  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(schedules.map((s) => String(s.id)))
      let changed = false; const next = new Set<string>()
      for (const id of prev) { if (valid.has(id)) next.add(id); else changed = true }
      return changed ? next : prev
    })
  }, [schedules])
  useEffect(() => {
    pollRef.current = setInterval(() => { load(true); loadRecurring(true) }, POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [load, loadRecurring])

  // ── regular schedule handlers ─────────────────────────────────────────────
  const handleCancel = async () => {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      await cancelSchedule(cancelTarget.id)
      toast({ title: 'Success', description: 'Scheduled mail cancelled.', variant: 'success' })
      setCancelTarget(null)
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(String(cancelTarget.id)); return next })
      await load()
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel scheduled mail.', variant: 'destructive' })
    } finally { setIsCancelling(false) }
  }

  const openEdit = (s: Schedule) => {
    const d = parseUTC(s.scheduledAt as string)
    if (d) {
      const pad = (n: number) => String(n).padStart(2, '0')
      setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
      setEditTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
    } else { setEditDate(''); setEditTime('') }
    setEditRecipients(Array.isArray(s.recipientEmails) ? s.recipientEmails.join(', ') : '')
    setEditSubject(s.subject ?? '')
    setEditBody((s.body as string) ?? '')
    setEditTarget(s)
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    if (!editDate || !editTime) { toast({ title: 'Missing date/time', description: 'Please set a date and time.', variant: 'destructive' }); return }
    const scheduledAt = new Date(`${editDate}T${editTime}:00`).toISOString()
    const recipientEmails = editRecipients.split(/[,\n]+/).map((e) => e.trim()).filter(Boolean)
    if (recipientEmails.length === 0) { toast({ title: 'No recipients', description: 'Add at least one email.', variant: 'destructive' }); return }
    setIsSavingEdit(true)
    const isCustom = !editTarget.templateId
    try {
      await updateSchedule(editTarget.id, {
        scheduledAt, recipientEmails,
        ...(isCustom && editSubject.trim() && { subject: editSubject.trim() }),
        ...(isCustom && editBody.trim() && { body: editBody.trim() }),
      })
      toast({ title: 'Updated', description: 'Schedule updated successfully.', variant: 'success' })
      setEditTarget(null); await load()
    } catch { toast({ title: 'Error', description: 'Failed to update schedule.', variant: 'destructive' }) }
    finally { setIsSavingEdit(false) }
  }

  const handleBulkCancel = async () => {
    const ids = selectedCancellableIds
    if (!ids.length) { setBulkCancelOpen(false); return }
    setIsBulkCancelling(true)
    try {
      const results = await Promise.allSettled(ids.map((id) => cancelSchedule(id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      const ok = results.length - failed
      if (failed === 0) toast({ title: 'Success', description: `Cancelled ${ok} scheduled mail${ok !== 1 ? 's' : ''}.`, variant: 'success' })
      else if (ok > 0) toast({ title: 'Partially completed', description: `Cancelled ${ok}, ${failed} failed.`, variant: 'destructive' })
      else toast({ title: 'Error', description: 'Failed to cancel scheduled mails.', variant: 'destructive' })
      setSelectedIds(new Set()); setBulkCancelOpen(false); await load()
    } finally { setIsBulkCancelling(false) }
  }

  // ── recurring schedule handlers ───────────────────────────────────────────
  const openEditRecurring = (r: RecurringSchedule) => {
    setEditRecurringMonths([...r.months])
    setEditRecurringDays([...r.days])
    setEditRecurringTimes(r.times.length ? [...r.times] : [''])
    setEditRecurringRecipients(r.recipientEmails.join(', '))
    setEditRecurringTarget(r)
  }

  const handleSaveRecurring = async () => {
    if (!editRecurringTarget) return
    if (!editRecurringMonths.length) { toast({ title: 'No months', description: 'Select at least one month.', variant: 'destructive' }); return }
    if (!editRecurringDays.length) { toast({ title: 'No days', description: 'Select at least one day.', variant: 'destructive' }); return }
    const validTimes = editRecurringTimes.filter((t) => t.trim())
    if (!validTimes.length) { toast({ title: 'No times', description: 'Add at least one send time.', variant: 'destructive' }); return }
    const recipientEmails = editRecurringRecipients.split(/[,\n]+/).map((e) => e.trim()).filter(Boolean)
    if (!recipientEmails.length) { toast({ title: 'No recipients', description: 'Add at least one email.', variant: 'destructive' }); return }
    setIsSavingRecurring(true)
    try {
      await updateRecurringSchedule(editRecurringTarget.id, { months: editRecurringMonths, days: editRecurringDays, times: validTimes, recipientEmails })
      toast({ title: 'Updated', description: 'Recurring schedule updated.', variant: 'success' })
      setEditRecurringTarget(null); await loadRecurring()
    } catch { toast({ title: 'Error', description: 'Failed to update recurring schedule.', variant: 'destructive' }) }
    finally { setIsSavingRecurring(false) }
  }

  const confirmRecurringAction = (r: RecurringSchedule, action: RecurringAction) => {
    setRecurringActionTarget(r); setRecurringAction(action)
  }

  const handleRecurringAction = async () => {
    if (!recurringActionTarget || !recurringAction) return
    setIsProcessingAction(true)
    try {
      if (recurringAction === 'stop') await stopRecurringSchedule(recurringActionTarget.id)
      else if (recurringAction === 'start') await startRecurringSchedule(recurringActionTarget.id)
      else await deleteRecurringSchedule(recurringActionTarget.id)
      const labels: Record<RecurringAction, string> = { stop: 'stopped', start: 'started', delete: 'deleted' }
      toast({ title: 'Success', description: `Recurring schedule ${labels[recurringAction]}.`, variant: 'success' })
      if (recurringAction === 'delete') setRecurringSelectedIds((prev) => { const next = new Set(prev); next.delete(String(recurringActionTarget.id)); return next })
      setRecurringActionTarget(null); setRecurringAction(null); await loadRecurring()
    } catch { toast({ title: 'Error', description: `Failed to ${recurringAction} recurring schedule.`, variant: 'destructive' }) }
    finally { setIsProcessingAction(false) }
  }

  const handleBulkRecurring = async () => {
    if (!bulkRecurringAction || !recurringSelectedIds.size) { setBulkRecurringAction(null); return }
    const ids = Array.from(recurringSelectedIds)
    setIsBulkRecurring(true)
    try {
      const tasks = ids.map((id) => {
        if (bulkRecurringAction === 'stop') return stopRecurringSchedule(id)
        if (bulkRecurringAction === 'start') return startRecurringSchedule(id)
        return deleteRecurringSchedule(id)
      })
      const results = await Promise.allSettled(tasks)
      const failed = results.filter((r) => r.status === 'rejected').length
      const ok = results.length - failed
      const labels: Record<RecurringAction, string> = { stop: 'stopped', start: 'started', delete: 'deleted' }
      if (failed === 0) toast({ title: 'Success', description: `${ok} schedule${ok !== 1 ? 's' : ''} ${labels[bulkRecurringAction]}.`, variant: 'success' })
      else toast({ title: 'Partially completed', description: `${ok} succeeded, ${failed} failed.`, variant: 'destructive' })
      if (bulkRecurringAction === 'delete') setRecurringSelectedIds(new Set())
      setBulkRecurringAction(null); await loadRecurring()
    } finally { setIsBulkRecurring(false) }
  }

  // ── selection helpers ─────────────────────────────────────────────────────
  const displayed = useMemo(() => activeTab === 'recurring' ? [] : filterByTab(schedules, activeTab), [schedules, activeTab])
  const totalPages = useMemo(() => Math.max(1, Math.ceil(displayed.length / pageSize)), [displayed.length, pageSize])
  const totalRecurringPages = useMemo(() => Math.max(1, Math.ceil(recurringSchedules.length / pageSize)), [recurringSchedules.length, pageSize])
  const safePage = Math.min(currentPage, activeTab === 'recurring' ? totalRecurringPages : totalPages)
  const pageOffset = (safePage - 1) * pageSize
  const paginatedDisplayed = useMemo(() => displayed.slice(pageOffset, pageOffset + pageSize), [displayed, pageOffset, pageSize])
  const paginatedRecurring = useMemo(() => recurringSchedules.slice(pageOffset, pageOffset + pageSize), [recurringSchedules, pageOffset, pageSize])

  const cancellableInView = useMemo(() => paginatedDisplayed.filter(isScheduleCancellable).map((s) => String(s.id)), [paginatedDisplayed])
  const selectedCancellableIds = useMemo(() => { const allow = new Set(cancellableInView); return Array.from(selectedIds).filter((id) => allow.has(id)) }, [cancellableInView, selectedIds])
  const toggleSelect = (id: string) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const toggleSelectAllInView = () => {
    if (!cancellableInView.length) return
    setSelectedIds((prev) => cancellableInView.every((id) => prev.has(id)) ? new Set() : new Set(cancellableInView))
  }
  const selectAllState = useMemo((): boolean | 'indeterminate' => {
    if (!cancellableInView.length) return false
    const n = cancellableInView.filter((id) => selectedIds.has(id)).length
    return n === 0 ? false : n === cancellableInView.length ? true : 'indeterminate'
  }, [cancellableInView, selectedIds])

  const toggleRecurringSelect = (id: string) => setRecurringSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const toggleSelectAllRecurring = () => {
    const pageIds = paginatedRecurring.map((r) => String(r.id))
    setRecurringSelectedIds((prev) => pageIds.every((id) => prev.has(id)) ? new Set() : new Set(pageIds))
  }
  const recurringSelectAllState = useMemo((): boolean | 'indeterminate' => {
    if (!paginatedRecurring.length) return false
    const n = paginatedRecurring.filter((r) => recurringSelectedIds.has(String(r.id))).length
    return n === 0 ? false : n === paginatedRecurring.length ? true : 'indeterminate'
  }, [paginatedRecurring, recurringSelectedIds])

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: 0, upcoming: 0, sent: 0, recurring: 0, failed: 0 }
    for (const tab of TABS) counts[tab.key] = tab.key === 'recurring' ? recurringSchedules.length : filterByTab(schedules, tab.key).length
    return counts
  }, [schedules, recurringSchedules])

  // ── recurring edit helpers ────────────────────────────────────────────────
  const toggleEditMonth = (m: number) => setEditRecurringMonths((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b))
  const toggleEditDay = (d: number) => setEditRecurringDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b))

  // ── action dialog labels ──────────────────────────────────────────────────
  const actionLabel = recurringAction === 'stop' ? 'Stop' : recurringAction === 'start' ? 'Start' : 'Delete'
  const actionDescription = recurringAction === 'stop'
    ? 'Stop this recurring schedule? No more emails will be sent until you start it again.'
    : recurringAction === 'start'
    ? 'Reactivate this recurring schedule? Emails will resume on the next matching date.'
    : 'Permanently delete this recurring schedule? This cannot be undone.'
  const bulkActionLabel = bulkRecurringAction === 'stop' ? 'Stop' : bulkRecurringAction === 'start' ? 'Start' : 'Delete'

  return (
    <>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Scheduled Mails</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? 'Loading...' : `${schedules.length} total job${schedules.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { load(); loadRecurring() }} disabled={isLoading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeTab === tab.key ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              }`}>
              {tab.label}
              <span className={`min-w-[18px] text-center text-[10px] px-1 py-0 rounded-full font-semibold leading-5 ${
                activeTab === tab.key ? 'bg-white/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>{tabCounts[tab.key]}</span>
            </button>
          ))}
        </div>

        {/* Bulk action bar — regular schedules */}
        {activeTab !== 'recurring' && selectedCancellableIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground"><span className="font-medium text-foreground">{selectedCancellableIds.length}</span> selected</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>Clear selection</Button>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setBulkCancelOpen(true)}>
                <Trash2 className="h-4 w-4" />Delete selected
              </Button>
            </div>
          </div>
        )}

        {/* Bulk action bar — recurring */}
        {activeTab === 'recurring' && recurringSelectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground"><span className="font-medium text-foreground">{recurringSelectedIds.size}</span> selected</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setRecurringSelectedIds(new Set())}>Clear</Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={() => setBulkRecurringAction('stop')}>
                <StopCircle className="h-3.5 w-3.5" />Stop
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50"
                onClick={() => setBulkRecurringAction('start')}>
                <Play className="h-3.5 w-3.5" />Start
              </Button>
              <Button variant="destructive" size="sm" className="gap-1.5"
                onClick={() => setBulkRecurringAction('delete')}>
                <Trash2 className="h-3.5 w-3.5" />Delete
              </Button>
            </div>
          </div>
        )}

        {/* Table Card */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
            {isLoading ? (
              <div className="flex justify-center py-6"><LekvyaLoader /></div>
            ) : activeTab === 'recurring' ? (
              recurringSchedules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg">
                  No recurring monthly schedules found.
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[44px] max-w-[44px] p-2">
                          <Checkbox checked={recurringSelectAllState} onCheckedChange={() => toggleSelectAllRecurring()} aria-label="Select all recurring" />
                        </TableHead>
                        <TableHead className="min-w-[40px]">#</TableHead>
                        <TableHead className="min-w-[160px]">Template</TableHead>
                        <TableHead className="min-w-[160px]">Recipients</TableHead>
                        <TableHead className="min-w-[180px]">Months</TableHead>
                        <TableHead className="min-w-[160px]">Days</TableHead>
                        <TableHead className="min-w-[110px]">Times</TableHead>
                        <TableHead className="min-w-[90px]">Status</TableHead>
                        <TableHead className="min-w-[130px]">Created</TableHead>
                        <TableHead className="min-w-[120px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRecurring.map((r, idx) => {
                        const monthsLabel = r.months.map((m) => MONTH_SHORT[m - 1]).join(', ') || '—'
                        const daysLabel = r.days.join(', ') || '—'
                        const timesLabel = r.times.join(', ') || '—'
                        const isActive = r.status === 'active'
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="p-2 w-[44px] max-w-[44px] align-middle">
                              <Checkbox checked={recurringSelectedIds.has(String(r.id))} onCheckedChange={() => toggleRecurringSelect(String(r.id))} />
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{pageOffset + idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm">{r.template?.name ?? r.subject ?? (r.templateId ? `Template #${r.templateId}` : 'Custom Email')}</span>
                                {r.template?.category && <span className="text-[11px] text-muted-foreground">{r.template.category}</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                {Array.isArray(r.recipientEmails) && r.recipientEmails.length > 0 ? (
                                  <>
                                    <span className="text-xs truncate max-w-[140px]">{r.recipientEmails[0]}</span>
                                    {r.recipientEmails.length > 1 && <span className="text-xs text-muted-foreground">+{r.recipientEmails.length - 1} more</span>}
                                  </>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                              </div>
                            </TableCell>
                            <TableCell><span className="text-xs">{monthsLabel}</span></TableCell>
                            <TableCell><span className="text-xs font-mono">{daysLabel}</span></TableCell>
                            <TableCell><span className="text-xs font-mono">{timesLabel}</span></TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${
                                isActive ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400' : 'bg-muted text-muted-foreground'
                              }`}>
                                <Repeat className="h-3 w-3" />{isActive ? 'Active' : 'Stopped'}
                              </span>
                            </TableCell>
                            <TableCell><span className="text-xs">{formatDate(r.createdAt)}</span></TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Edit */}
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit" onClick={() => openEditRecurring(r)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {/* Stop */}
                                {isActive && (
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="Stop" onClick={() => confirmRecurringAction(r, 'stop')}>
                                    <StopCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {/* Start */}
                                {!isActive && (
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Start" onClick={() => confirmRecurringAction(r, 'start')}>
                                    <Play className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {/* Delete */}
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete" onClick={() => confirmRecurringAction(r, 'delete')}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <PaginationFooter
                  total={recurringSchedules.length}
                  pageSize={pageSize}
                  currentPage={safePage}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
                </>
              )
            ) : displayed.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg">
                No {activeTab === 'all' ? '' : activeTab + ' '}scheduled mails found.
              </div>
            ) : (
              <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px] max-w-[44px] p-2">
                        {cancellableInView.length > 0 ? (
                          <Checkbox checked={selectAllState} onCheckedChange={() => toggleSelectAllInView()} aria-label="Select all" />
                        ) : <span className="sr-only">Select</span>}
                      </TableHead>
                      <TableHead className="min-w-[60px]">#</TableHead>
                      <TableHead className="min-w-[160px]">Template</TableHead>
                      <TableHead className="min-w-[200px]">Recipients</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[160px]">Scheduled At</TableHead>
                      <TableHead className="min-w-[140px]">Sends In</TableHead>
                      <TableHead className="min-w-[160px]">Created</TableHead>
                      <TableHead className="min-w-[80px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDisplayed.map((s, idx) => (
                      <TableRow key={s.id}>
                        <TableCell className="p-2 w-[44px] max-w-[44px] align-middle">
                          {isScheduleCancellable(s) ? (
                            <Checkbox checked={selectedIds.has(String(s.id))} onCheckedChange={() => toggleSelect(String(s.id))} />
                          ) : <span className="inline-block w-4" aria-hidden />}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{pageOffset + idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm">{s.template?.name ?? s.templateName ?? s.subject ?? (s.templateId ? `Template #${s.templateId}` : 'Custom Email')}</span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                                !s.templateId || (s.template?.organizationId ?? s.templateOrganizationId) ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground'
                              }`}>{!s.templateId ? 'Custom' : (s.template?.organizationId ?? s.templateOrganizationId) ? 'Custom' : 'Pre-built'}</span>
                            </div>
                            {s.template?.category && <span className="text-[11px] text-muted-foreground">{s.template.category}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {Array.isArray(s.recipientEmails) && s.recipientEmails.length > 0 ? (
                              <><span className="text-xs truncate max-w-[180px]">{s.recipientEmails[0]}</span>
                              {s.recipientEmails.length > 1 && <span className="text-xs text-muted-foreground">+{s.recipientEmails.length - 1} more</span>}</>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={s.status} /></TableCell>
                        <TableCell><span className="text-xs">{formatDate(s.scheduledAt as string)}</span></TableCell>
                        <TableCell>{(s.status ?? '').toLowerCase() === 'pending' ? <CountdownCell scheduledAt={s.scheduledAt as string} /> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                        <TableCell><span className="text-xs">{formatDate(s.createdAt as string)}</span></TableCell>
                        <TableCell className="text-center">
                          {isScheduleCancellable(s) ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit schedule" onClick={() => openEdit(s)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" title="Cancel schedule" onClick={() => setCancelTarget(s)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationFooter
                total={displayed.length}
                pageSize={pageSize}
                currentPage={safePage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Edit recurring dialog ──────────────────────────────────────────── */}
      <Dialog open={!!editRecurringTarget} onOpenChange={(open) => !open && setEditRecurringTarget(null)}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recurring Schedule</DialogTitle>
            <DialogDescription>Update months, days, send times, and recipients.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Months */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Months</Label>
              <div className="flex flex-wrap gap-1.5">
                {MONTH_SHORT.map((name, i) => {
                  const m = i + 1
                  const active = editRecurringMonths.includes(m)
                  return (
                    <button key={m} type="button" onClick={() => toggleEditMonth(m)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                      }`}>{name}</button>
                  )
                })}
              </div>
            </div>
            {/* Days */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Days of month</Label>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const active = editRecurringDays.includes(day)
                  return (
                    <button key={day} type="button" onClick={() => toggleEditDay(day)}
                      className={`w-7 h-7 rounded text-xs font-medium border transition-colors ${
                        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                      }`}>{day}</button>
                  )
                })}
              </div>
            </div>
            {/* Times */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Label className="text-xs font-medium">Send Times</Label>
                <button type="button" onClick={() => setEditRecurringTimes((t) => [...t, ''])}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editRecurringTimes.map((t, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input type="time" value={t} onChange={(e) => setEditRecurringTimes((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      className="h-8 w-32 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                    {editRecurringTimes.length > 1 && (
                      <button type="button" onClick={() => setEditRecurringTimes((prev) => prev.filter((_, idx) => idx !== i))}
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Recipients */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Recipients <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
              <textarea value={editRecurringRecipients} onChange={(e) => setEditRecurringRecipients(e.target.value)} rows={2}
                placeholder="email1@example.com, email2@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditRecurringTarget(null)} disabled={isSavingRecurring}>Cancel</Button>
            <Button onClick={handleSaveRecurring} disabled={isSavingRecurring}>
              {isSavingRecurring ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Single recurring action confirm ───────────────────────────────── */}
      <Dialog open={!!recurringActionTarget} onOpenChange={(open) => !open && !isProcessingAction && (setRecurringActionTarget(null), setRecurringAction(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionLabel} Recurring Schedule</DialogTitle>
            <DialogDescription>{actionDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRecurringActionTarget(null); setRecurringAction(null) }} disabled={isProcessingAction}>
              Cancel
            </Button>
            <Button variant={recurringAction === 'delete' ? 'destructive' : 'default'} onClick={handleRecurringAction} disabled={isProcessingAction}>
              {isProcessingAction ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{actionLabel}ping…</> : actionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk recurring action confirm ─────────────────────────────────── */}
      <Dialog open={!!bulkRecurringAction} onOpenChange={(open) => !open && !isBulkRecurring && setBulkRecurringAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkActionLabel} {recurringSelectedIds.size} Recurring Schedule{recurringSelectedIds.size !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              {bulkRecurringAction === 'delete'
                ? 'Permanently delete the selected recurring schedules? This cannot be undone.'
                : bulkRecurringAction === 'stop'
                ? 'Stop the selected recurring schedules? No emails will be sent until restarted.'
                : 'Restart the selected recurring schedules?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkRecurringAction(null)} disabled={isBulkRecurring}>Cancel</Button>
            <Button variant={bulkRecurringAction === 'delete' ? 'destructive' : 'default'} onClick={handleBulkRecurring} disabled={isBulkRecurring}>
              {isBulkRecurring ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{bulkActionLabel}ping…</> : `${bulkActionLabel} selected`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit regular schedule dialog ──────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update the scheduled date, time, recipients{!editTarget?.templateId ? ', subject, or message' : ''}. Only pending schedules can be edited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Date</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Time</Label>
                <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Recipients <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
              <textarea value={editRecipients} onChange={(e) => setEditRecipients(e.target.value)} rows={2}
                placeholder="email1@example.com, email2@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            {!editTarget?.templateId && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Subject</Label>
                  <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder="Email subject" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Message</Label>
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6} placeholder="Email message body…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={isSavingEdit}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel single regular schedule ────────────────────────────────── */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Scheduled Mail</DialogTitle>
            <DialogDescription>Are you sure you want to cancel this scheduled mail? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={isCancelling}>Keep It</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? 'Cancelling...' : 'Cancel Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk cancel regular schedules ─────────────────────────────────── */}
      <Dialog open={bulkCancelOpen} onOpenChange={(open) => !open && !isBulkCancelling && setBulkCancelOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected scheduled mails</DialogTitle>
            <DialogDescription>Cancel {selectedCancellableIds.length} scheduled mail{selectedCancellableIds.length !== 1 ? 's' : ''}? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkCancelOpen(false)} disabled={isBulkCancelling}>Keep them</Button>
            <Button variant="destructive" onClick={handleBulkCancel} disabled={isBulkCancelling}>
              {isBulkCancelling ? 'Deleting…' : 'Delete selected'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
