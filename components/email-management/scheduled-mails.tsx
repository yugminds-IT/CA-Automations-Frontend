'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Loader2, Trash2, RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, Repeat, Pencil } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { listSchedules, cancelSchedule, updateSchedule } from '@/lib/api/mail-management'

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

// Auto-refresh interval: poll every 30s to pick up status changes
const POLL_INTERVAL_MS = 30_000
// Countdown tick interval
const TICK_MS = 1_000

function parseUTC(val: string | null | undefined): Date | null {
  if (!val) return null
  try {
    let s = String(val).trim()
    s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
    s = s.replace(/(\.\d{3})\d+/, '$1')
    if (!/Z$|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z'
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '—'
  const d = parseUTC(val)
  if (!d) return val
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return val
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Sending…'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`
  if (hours > 0) return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
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

  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
        <Clock className="h-3 w-3" /> Sending…
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 font-medium">
      <Clock className="h-3 w-3 shrink-0" />
      {formatCountdown(remaining)}
    </span>
  )
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>

  const lower = status.toLowerCase()
  const config =
    lower === 'sent' || lower === 'completed'
      ? { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', label: status }
      : lower === 'cancelled' || lower === 'canceled'
      ? { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: status }
      : lower === 'failed'
      ? { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', label: status }
      : lower === 'recurring'
      ? { icon: Repeat, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', label: status }
      : { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', label: status }

  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${config.bg} ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
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

function filterByTab(schedules: Schedule[], tab: TabKey): Schedule[] {
  if (tab === 'all') return schedules
  return schedules.filter((s) => {
    const lower = (s.status ?? '').toLowerCase()
    switch (tab) {
      case 'upcoming':
        return lower === 'pending' || lower === 'scheduled'
      case 'sent':
        return lower === 'sent' || lower === 'completed'
      case 'recurring':
        return lower === 'recurring' || s.recurring === true || s.isRecurring === true
      case 'failed':
        return lower === 'failed'
      default:
        return true
    }
  })
}

export function ScheduledMails() {
  const { toast } = useToast()
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const res = await listSchedules()
      const list = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.schedules)
        ? (res as any).schedules
        : []
      setSchedules(list)
    } catch (err) {
      console.error('Failed to load schedules:', err)
      if (!silent) toast({ title: 'Error', description: 'Failed to load scheduled mails.', variant: 'destructive' })
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [toast])

  // Initial load
  useEffect(() => { load() }, [load])

  // Auto-refresh every 30s silently (no loading spinner)
  useEffect(() => {
    pollRef.current = setInterval(() => load(true), POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [load])

  const handleCancel = async () => {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      await cancelSchedule(cancelTarget.id)
      toast({ title: 'Success', description: 'Scheduled mail cancelled.', variant: 'success' })
      setCancelTarget(null)
      await load()
    } catch (err) {
      console.error('Failed to cancel schedule:', err)
      toast({ title: 'Error', description: 'Failed to cancel scheduled mail.', variant: 'destructive' })
    } finally {
      setIsCancelling(false)
    }
  }

  const openEdit = (s: Schedule) => {
    const d = parseUTC(s.scheduledAt as string)
    if (d) {
      const pad = (n: number) => String(n).padStart(2, '0')
      setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
      setEditTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
    } else {
      setEditDate('')
      setEditTime('')
    }
    setEditRecipients(Array.isArray(s.recipientEmails) ? s.recipientEmails.join(', ') : '')
    setEditSubject(s.subject ?? '')
    setEditBody((s.body as string) ?? '')
    setEditTarget(s)
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    if (!editDate || !editTime) {
      toast({ title: 'Missing date/time', description: 'Please set a date and time.', variant: 'destructive' })
      return
    }
    const scheduledAt = new Date(`${editDate}T${editTime}:00`).toISOString()
    const recipientEmails = editRecipients
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter(Boolean)
    if (recipientEmails.length === 0) {
      toast({ title: 'No recipients', description: 'Add at least one email.', variant: 'destructive' })
      return
    }
    setIsSavingEdit(true)
    const isCustom = !editTarget.templateId
    try {
      await updateSchedule(editTarget.id, {
        scheduledAt,
        recipientEmails,
        ...(isCustom && editSubject.trim() && { subject: editSubject.trim() }),
        ...(isCustom && editBody.trim() && { body: editBody.trim() }),
      })
      toast({ title: 'Updated', description: 'Schedule updated successfully.', variant: 'success' })
      setEditTarget(null)
      await load()
    } catch {
      toast({ title: 'Error', description: 'Failed to update schedule.', variant: 'destructive' })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const canCancel = (s: Schedule) => {
    const status = (s.status ?? '').toLowerCase()
    return status === 'pending' || status === 'scheduled'
  }

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: 0, upcoming: 0, sent: 0, recurring: 0, failed: 0 }
    for (const tab of TABS) {
      counts[tab.key] = filterByTab(schedules, tab.key).length
    }
    return counts
  }, [schedules])

  const displayed = useMemo(() => filterByTab(schedules, activeTab), [schedules, activeTab])

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
          <Button variant="outline" size="sm" onClick={() => load()} disabled={isLoading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`min-w-[18px] text-center text-[10px] px-1 py-0 rounded-full font-semibold leading-5 ${
                activeTab === tab.key
                  ? 'bg-white/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Table Card */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg">
                No {activeTab === 'all' ? '' : activeTab + ' '}scheduled mails found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {displayed.map((s, idx) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm">
                                {s.template?.name ?? s.templateName ?? s.subject ?? (s.templateId ? `Template #${s.templateId}` : 'Custom Email')}
                              </span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                                !s.templateId || (s.template?.organizationId ?? s.templateOrganizationId)
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {!s.templateId ? 'Custom' : (s.template?.organizationId ?? s.templateOrganizationId) ? 'Custom' : 'Pre-built'}
                              </span>
                            </div>
                            {s.template?.category && (
                              <span className="text-[11px] text-muted-foreground">{s.template.category}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {Array.isArray(s.recipientEmails) && s.recipientEmails.length > 0 ? (
                              <>
                                <span className="text-xs truncate max-w-[180px]">{s.recipientEmails[0]}</span>
                                {s.recipientEmails.length > 1 && (
                                  <span className="text-xs text-muted-foreground">+{s.recipientEmails.length - 1} more</span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={s.status} /></TableCell>
                        <TableCell><span className="text-xs">{formatDate(s.scheduledAt as string)}</span></TableCell>
                        <TableCell>
                          {(s.status ?? '').toLowerCase() === 'pending'
                            ? <CountdownCell scheduledAt={s.scheduledAt as string} />
                            : <span className="text-muted-foreground text-xs">—</span>
                          }
                        </TableCell>
                        <TableCell><span className="text-xs">{formatDate(s.createdAt as string)}</span></TableCell>
                        <TableCell className="text-center">
                          {canCancel(s) ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Edit schedule"
                                onClick={() => openEdit(s)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Cancel schedule"
                                onClick={() => setCancelTarget(s)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
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
              <textarea
                value={editRecipients}
                onChange={(e) => setEditRecipients(e.target.value)}
                rows={2}
                placeholder="email1@example.com, email2@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {!editTarget?.templateId && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Subject</Label>
                  <Input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="Email subject"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Message</Label>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={6}
                    placeholder="Email message body…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
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

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Scheduled Mail</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this scheduled mail? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={isCancelling}>
              Keep It
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? 'Cancelling...' : 'Cancel Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
