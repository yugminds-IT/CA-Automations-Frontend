'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, ChevronRight, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { createSession, listSessions, deleteSession, TdsSession } from '@/lib/api/tds-filing'
import { TdsWizard } from './tds-wizard'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:            { label: 'Draft',            color: 'bg-gray-100 text-gray-600' },
  CHALLAN_UPLOADED: { label: 'Challan Uploaded', color: 'bg-blue-100 text-blue-700' },
  EXCEL_UPLOADED:   { label: 'Excel Uploaded',   color: 'bg-indigo-100 text-indigo-700' },
  COMPARED:         { label: 'Compared',         color: 'bg-yellow-100 text-yellow-700' },
  FORM_SELECTED:    { label: 'Form Selected',    color: 'bg-purple-100 text-purple-700' },
  GENERATING:       { label: 'Generating…',      color: 'bg-orange-100 text-orange-700' },
  COMPLETED:        { label: 'Completed',        color: 'bg-green-100 text-green-700' },
  FAILED:           { label: 'Failed',           color: 'bg-red-100 text-red-700' },
}

interface TdsTabProps {
  clientId: string | number
  clientName?: string
}

export function TdsTab({ clientId, clientName = '' }: TdsTabProps) {
  const { toast } = useToast()
  const [sessions, setSessions]               = useState<TdsSession[]>([])
  const [loading, setLoading]                 = useState(true)
  const [creating, setCreating]               = useState(false)
  const [deletingId, setDeletingId]           = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const all = await listSessions()
      setSessions(all.filter((s) => String(s.clientId) === String(clientId)))
    } catch (e: any) {
      toast({ title: 'Failed to load TDS sessions', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [clientId, toast])

  useEffect(() => { load() }, [load])

  const handleNew = async () => {
    setCreating(true)
    try {
      const session = await createSession(Number(clientId))
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
    } catch (e: any) {
      toast({ title: 'Failed to create session', description: e.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this TDS filing session? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      toast({ title: 'Session deleted' })
    } catch (e: any) {
      toast({ title: 'Failed to delete session', description: e.message, variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  const handleBack = () => {
    setActiveSessionId(null)
    load()
  }

  // ── Wizard view ────────────────────────────────────────────────────────────
  if (activeSessionId) {
    return <TdsWizard sessionId={activeSessionId} onBack={handleBack} />
  }

  // ── Session list ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">TDS Filing Sessions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clientName ? `Filing sessions for ${clientName}` : 'All TDS filing sessions for this client'}
          </p>
        </div>
        <Button onClick={handleNew} disabled={creating} size="sm" className="gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New Filing
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading sessions…
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No TDS filing sessions yet</p>
            <Button onClick={handleNew} disabled={creating} size="sm" variant="outline" className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Start First Filing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AY / FY</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Quarter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const st = STATUS_LABELS[s.status] ?? { label: s.status, color: 'bg-gray-100 text-gray-600' }
                  const isDeleting = deletingId === s.id
                  return (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setActiveSessionId(s.id)}>
                      <TableCell className="text-sm">
                        {s.assessmentYear ?? '—'}{s.financialYear ? ` / ${s.financialYear}` : ''}
                      </TableCell>
                      <TableCell>
                        {s.formType ? <span className="font-mono text-xs">{s.formType}{s.formVersion ? ` (${s.formVersion})` : ''}</span> : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{s.quarter ?? '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            onClick={(e) => { e.stopPropagation(); setActiveSessionId(s.id) }}>
                            Open <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            disabled={isDeleting}
                            onClick={(e) => handleDelete(e, s.id)}
                          >
                            {isDeleting
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
