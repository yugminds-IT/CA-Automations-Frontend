'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, ChevronRight, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { GstWizard } from './gst-wizard'
import {
  createGstSession,
  listGstSessions,
  deleteGstSession,
  type GstSession,
  type GstStatus,
} from '@/lib/api/gst-filing'

export type { GstSession, GstStatus }

const STATUS_LABELS: Record<GstStatus, { label: string; color: string }> = {
  DRAFT:      { label: 'Draft',       color: 'bg-gray-100 text-gray-600' },
  PROCESSING: { label: 'Processing',  color: 'bg-purple-100 text-purple-700' },
  UPLOADED:   { label: 'Uploaded',    color: 'bg-blue-100 text-blue-700' },
  COMPARED:   { label: 'Compared',    color: 'bg-yellow-100 text-yellow-700' },
  COMPLETED:  { label: 'Completed',   color: 'bg-green-100 text-green-700' },
  FAILED:     { label: 'Failed',      color: 'bg-red-100 text-red-700' },
}

const FALLBACK_STATUS = { label: 'Unknown', color: 'bg-gray-100 text-gray-500' }

interface GstTabProps {
  clientId: string | number
  clientName?: string
}

export function GstTab({ clientId, clientName = '' }: GstTabProps) {
  const [sessions, setSessions]               = useState<GstSession[]>([])
  const [loading, setLoading]                 = useState(true)
  const [creating, setCreating]               = useState(false)
  const [deletingId, setDeletingId]           = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  useEffect(() => {
    listGstSessions()
      .then((all) =>
        setSessions(all.filter((s) => s.clientId === Number(clientId)))
      )
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [clientId])

  const handleNew = async () => {
    setCreating(true)
    try {
      const session = await createGstSession(Number(clientId))
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this GST filing session? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteGstSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
    }
  }

  const handleBack = (updated?: Partial<GstSession>) => {
    if (updated && activeSessionId) {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, ...updated } : s))
      )
    }
    setActiveSessionId(null)
  }

  if (activeSessionId) {
    const session = sessions.find((s) => s.id === activeSessionId)!
    return <GstWizard session={session} clientName={clientName} onBack={handleBack} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">GST Filing Sessions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clientName ? `Filing sessions for ${clientName}` : 'All GST filing sessions for this client'}
          </p>
        </div>
        <Button onClick={handleNew} disabled={creating} size="sm" className="gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New Filing
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No GST filing sessions yet</p>
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
                  <TableHead>Document</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Financial Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const st = STATUS_LABELS[s.status] ?? FALLBACK_STATUS
                  const isDeleting = deletingId === s.id
                  return (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setActiveSessionId(s.id)}>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">
                        {s.documentName ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">{s.period ?? '—'}</TableCell>
                      <TableCell className="text-sm">{s.financialYear ?? '—'}</TableCell>
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
