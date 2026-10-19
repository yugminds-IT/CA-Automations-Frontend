'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, FileText, FileSpreadsheet, CheckCircle2, Loader2,
  ArrowLeft, RefreshCw, Download, X, GitCompare, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  getSession, uploadChallan, uploadExcel, compareData,
  setFormType, generateFiles, getDownloadUrl, getForms,
  TdsSession, FormMeta,
} from '@/lib/api/tds-filing'

// ── File drop zone ────────────────────────────────────────────────────────────
function DropZone({ label, accept, icon: Icon, done, filename, uploading, onFile }: {
  label: string; accept: string; icon: React.ElementType
  done?: boolean; filename?: string; uploading?: boolean
  onFile: (f: File) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const handle = (f: File | null) => { if (f) onFile(f) }

  return (
    <div
      onClick={() => !uploading && !done && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0] ?? null) }}
      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors select-none min-h-[140px]
        ${done ? 'border-green-400 bg-green-50/60 cursor-default' :
          dragging ? 'border-primary bg-primary/5 cursor-copy' :
          'border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer'}
        ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? null)} />

      {uploading ? (
        <>
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Uploading…</p>
        </>
      ) : done ? (
        <>
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-green-700 truncate max-w-[180px]">{filename ?? label}</p>
            <p className="text-xs text-green-600 mt-0.5">Uploaded successfully</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); ref.current?.click() }}>
            Replace
          </Button>
        </>
      ) : (
        <>
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Drag & drop or click to browse</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-7 pointer-events-none">
            <Upload className="h-3.5 w-3.5 mr-1.5" />Browse
          </Button>
        </>
      )}
    </div>
  )
}

// ── PDF viewer — uses object URL if file is available, else placeholder ────────
function PdfViewer({ previewUrl, filename }: { previewUrl?: string; filename?: string }) {
  if (previewUrl) {
    return (
      <div className="flex flex-col h-full min-h-[380px] rounded-lg border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-border shrink-0">
          <FileText className="h-4 w-4 text-red-500" />
          <p className="text-xs font-semibold text-red-800 truncate flex-1">{filename ?? 'Challan PDF'}</p>
          <a href={previewUrl} target="_blank" rel="noreferrer"
            className="text-[10px] text-red-600 hover:underline shrink-0">Open ↗</a>
        </div>
        <iframe src={previewUrl} className="flex-1 w-full border-0 min-h-[340px]" title="Challan PDF Preview" />
      </div>
    )
  }
  return (
    <div className="flex flex-col h-full min-h-[260px] bg-gray-50 rounded-lg border border-dashed border-border items-center justify-center gap-3 p-6">
      <FileText className="h-10 w-10 text-muted-foreground/30" />
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{filename ?? 'Challan PDF'}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">Preview available after upload</p>
      </div>
    </div>
  )
}

// ── Excel viewer — shows actual uploaded sheet content via SheetJS ─────────────
function ExcelViewer({ filename, fileUrl, rawRows }: {
  filename?: string
  fileUrl?: string
  rawRows: (string | number | null)[][]
}) {
  if (rawRows.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-[380px] rounded-lg border border-border items-center justify-center gap-3">
        <FileSpreadsheet className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">Upload an Excel file to preview it here</p>
      </div>
    )
  }

  const headers = rawRows[0]
  const dataRows = rawRows.slice(1)

  return (
    <div className="flex flex-col h-full min-h-[380px] rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border-b border-border shrink-0">
        <div className="h-5 w-5 rounded bg-green-600 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="h-3 w-3 text-white" />
        </div>
        <p className="text-xs font-semibold text-green-800 truncate flex-1">{filename ?? 'Deductee Excel'}</p>
        <span className="text-[10px] text-green-700 shrink-0">{dataRows.length} rows</span>
        {fileUrl && (
          <a href={fileUrl} download={filename ?? 'deductees.xlsx'}
            className="text-[10px] text-green-600 hover:underline shrink-0 ml-2">
            <Download className="h-3 w-3 inline mr-0.5" />Download
          </a>
        )}
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-[10px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/80">
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-b border-r border-border w-7 select-none">#</th>
              {headers.map((h, i) => (
                <th key={i} className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap border-b border-r border-border">
                  {String(h ?? '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, i) => (
              <tr key={i} className={`border-b border-border/40 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                <td className="px-2 py-1 text-muted-foreground/50 border-r border-border/50 select-none">{i + 1}</td>
                {headers.map((_, ci) => (
                  <td key={ci} className="px-2 py-1 font-mono whitespace-nowrap border-r border-border/20">
                    {row[ci] != null ? String(row[ci]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────
interface TdsWizardProps {
  sessionId: string
  onBack: () => void
}

export function TdsWizard({ sessionId, onBack }: TdsWizardProps) {
  const { toast } = useToast()
  const [session, setSession]   = useState<TdsSession | null>(null)
  const [forms, setForms]       = useState<Record<string, FormMeta>>({})
  const [quarters, setQuarters] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(false)
  // upload → preview → review → generate
  const [phase, setPhase] = useState<'upload' | 'preview' | 'review' | 'generate'>('upload')

  const [challanFilename, setChallanFilename]     = useState<string | null>(null)
  const [challanPreviewUrl, setChallanPreviewUrl] = useState<string | null>(null)
  const [excelFilename, setExcelFilename]         = useState<string | null>(null)
  const [excelFileUrl, setExcelFileUrl]           = useState<string | null>(null)
  const [excelRawRows, setExcelRawRows]           = useState<(string | number | null)[][]>([])
  const [uploadingChallan, setUploadingChallan]   = useState(false)
  const [uploadingExcel, setUploadingExcel]       = useState(false)

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (challanPreviewUrl) URL.revokeObjectURL(challanPreviewUrl)
      if (excelFileUrl) URL.revokeObjectURL(excelFileUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Editable extracted data (local state only — for user review)
  const [editedChallanFields, setEditedChallanFields] = useState<Record<string, string>>({})
  const [editedTaxBreakup, setEditedTaxBreakup]       = useState<Record<string, string>>({})
  const [editedDeductees, setEditedDeductees]         = useState<any[]>([])

  // Form selection
  const [selFormType, setSelFormType]       = useState('')
  const [selFormVersion, setSelFormVersion] = useState('old')
  const [selQuarter, setSelQuarter]         = useState('')
  const [selSections, setSelSections]       = useState<string[]>([])
  const loadSession = useCallback(async () => {
    try {
      const [s, f] = await Promise.all([getSession(sessionId), getForms()])
      setSession(s)
      setForms(f.forms)
      setQuarters(f.quarters)
      if (s.formType)         setSelFormType(s.formType)
      if (s.formVersion)      setSelFormVersion(s.formVersion)
      if (s.quarter)          setSelQuarter(s.quarter)
      if (s.selectedSections) setSelSections(s.selectedSections)
      // Restore phase from session status on reload
      if (['FORM_SELECTED', 'GENERATING', 'COMPLETED', 'FAILED'].includes(s.status)) {
        setPhase('generate')
      } else if (s.status === 'COMPARED') {
        setPhase('preview')
      }
      // Seed editable state from extracted data
      const fields = (s.challanData as any)?.fields ?? {}
      const breakup = (s.challanData as any)?.tax_breakup ?? {}
      setEditedChallanFields(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v ?? '')])))
      setEditedTaxBreakup(Object.fromEntries(Object.entries(breakup).map(([k, v]) => [k, String(v ?? '')])))
      setEditedDeductees((s.deducteesData as any[]) ?? [])
    } catch (e: any) {
      toast({ title: 'Failed to load session', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [sessionId, toast])

  useEffect(() => { loadSession() }, [loadSession])

  // Generation is now synchronous — no polling needed

  const handleChallanUpload = async (file: File) => {
    // Create preview URL before upload so it's immediately available
    if (challanPreviewUrl) URL.revokeObjectURL(challanPreviewUrl)
    setChallanPreviewUrl(URL.createObjectURL(file))
    setChallanFilename(file.name)
    setUploadingChallan(true)
    try {
      const s = await uploadChallan(sessionId, file)
      setSession(s)
      const fields = (s.challanData as any)?.fields ?? {}
      const breakup = (s.challanData as any)?.tax_breakup ?? {}
      setEditedChallanFields(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v ?? '')])))
      setEditedTaxBreakup(Object.fromEntries(Object.entries(breakup).map(([k, v]) => [k, String(v ?? '')])))
    } catch (e: any) {
      toast({ title: 'Challan upload failed', description: e.message, variant: 'destructive' })
    } finally {
      setUploadingChallan(false)
    }
  }

  const handleExcelUpload = async (file: File) => {
    // Parse the raw sheet immediately for preview
    const buf = await file.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array' })
    const ws  = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: null })
    setExcelRawRows(rows)

    // Create download URL
    if (excelFileUrl) URL.revokeObjectURL(excelFileUrl)
    setExcelFileUrl(URL.createObjectURL(file))
    setExcelFilename(file.name)
    setUploadingExcel(true)
    try {
      const s = await uploadExcel(sessionId, file)
      setSession(s)
      setEditedDeductees((s.deducteesData as any[]) ?? [])
    } catch (e: any) {
      toast({ title: 'Excel upload failed', description: e.message, variant: 'destructive' })
    } finally {
      setUploadingExcel(false)
    }
  }

  const handleExtractAndCompare = async () => {
    setBusy(true)
    try {
      const s = await compareData(sessionId)
      setSession(s)
      setPhase('preview')
      const comparison = s.comparisonData as any
      toast({ title: comparison?.match?.tds_match ? 'TDS Matched ✓' : 'TDS Mismatch — review details', variant: comparison?.match?.tds_match ? 'default' : 'destructive' })
    } catch (e: any) {
      toast({ title: 'Extraction failed', description: e.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const handleGenerate = async () => {
    if (!selFormType || !selQuarter || selSections.length === 0) return
    setBusy(true)
    try {
      await setFormType(sessionId, { formType: selFormType, formVersion: selFormVersion, quarter: selQuarter, selectedSections: selSections })
      const updated = await generateFiles(sessionId)
      if (updated?.id) setSession(updated)
      else await loadSession()
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const handleDownload = async (type: 'csi' | 'fvu') => {
    try { const { url } = await getDownloadUrl(sessionId, type); window.open(url, '_blank') }
    catch (e: any) { toast({ title: 'Download failed', description: e.message, variant: 'destructive' }) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />Loading session…
      </div>
    )
  }
  if (!session) return null

  const challanData    = session.challanData as any
  const deductees: any[] = editedDeductees
  const comparison     = session.comparisonData as any
  const autoFill       = comparison?.auto_fill ?? {}
  const match          = comparison?.match ?? {}
  const validation     = comparison?.validation ?? {}
  const currentForm    = forms[selFormType]

  const challanDone  = ['CHALLAN_UPLOADED','EXCEL_UPLOADED','COMPARED','FORM_SELECTED','GENERATING','COMPLETED'].includes(session.status)
  const excelDone    = ['EXCEL_UPLOADED','COMPARED','FORM_SELECTED','GENERATING','COMPLETED'].includes(session.status)
  const comparedDone = ['COMPARED','FORM_SELECTED','GENERATING','COMPLETED'].includes(session.status)
  const isCompleted = session.status === 'COMPLETED'
  const isFailed    = session.status === 'FAILED'

  const deducteeKeys = deductees.length > 0
    ? ['name', 'pan', 'section', 'amount_paid', 'tds_deducted'].filter(k => k in deductees[0])
    : []

  // Shared re-extract handler
  const handleReExtract = async () => {
    setBusy(true)
    try {
      const s = await compareData(sessionId)
      setSession(s)
    } catch (e: any) {
      toast({ title: 'Re-extract failed', description: e.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />Back
        </Button>
        <div className="flex-1">
          <h2 className="text-base font-semibold">
            TDS Filing — {(session as any).client?.name ?? `Client ${session.clientId}`}
          </h2>
          <p className="text-xs text-muted-foreground">
            {session.assessmentYear ? `AY ${session.assessmentYear}` : 'Assessment year not yet set'}
            {session.quarter ? ` · ${session.quarter}` : ''}
            {session.formType ? ` · Form ${session.formType}` : ''}
          </p>
        </div>
        {/* Phase breadcrumb */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
          <span className={phase === 'upload' ? 'text-primary font-semibold' : ''}>Upload</span>
          <span className="mx-1">›</span>
          <span className={phase === 'preview' ? 'text-primary font-semibold' : ''}>Review</span>
          <span className="mx-1">›</span>
          <span className={phase === 'review' ? 'text-primary font-semibold' : ''}>Comparison</span>
          <span className="mx-1">›</span>
          <span className={phase === 'generate' ? 'text-primary font-semibold' : ''}>Generate</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          PHASE: upload
      ══════════════════════════════════════════════════════════ */}
      {phase === 'upload' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Upload Documents</CardTitle>
                <CardDescription className="text-xs">Upload challan PDF and deductee Excel, then extract</CardDescription>
              </div>
              {challanDone && excelDone && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Challan Receipt PDF (ITNS 281)</p>
                <DropZone label="Drop challan PDF" accept=".pdf" icon={FileText}
                  done={challanDone} filename={challanFilename ?? challanData?.document?.source_file}
                  uploading={uploadingChallan} onFile={handleChallanUpload} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Deductee / Salary Breakup Excel</p>
                <DropZone label="Drop Excel file" accept=".xlsx,.xls,.xlsm" icon={FileSpreadsheet}
                  done={excelDone} filename={excelFilename ?? undefined}
                  uploading={uploadingExcel} onFile={handleExcelUpload} />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleExtractAndCompare}
                disabled={!excelDone || busy}
                className="gap-2" size="sm"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
                {busy ? 'Extracting & Comparing…' : 'Extract & Compare'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          PHASE: preview — split-view challan + excel
      ══════════════════════════════════════════════════════════ */}
      {phase === 'preview' && (
        <>
          {/* Challan split view */}
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="pr-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-500" />Challan PDF
                  </CardTitle>
                  <CardDescription className="text-xs">Uploaded document preview</CardDescription>
                </div>
                <div className="pl-4">
                  <CardTitle className="text-sm font-semibold">Extracted Challan Data</CardTitle>
                  <CardDescription className="text-xs">Review and edit if needed</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-4">
                  <PdfViewer
                    previewUrl={challanPreviewUrl ?? undefined}
                    filename={challanFilename ?? challanData?.document?.source_file ?? undefined}
                  />
                </div>
                <div className="p-4 space-y-4 overflow-y-auto max-h-[420px]">
                  {Object.keys(editedChallanFields).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Challan Fields</p>
                      <div className="space-y-2">
                        {Object.entries(editedChallanFields).map(([k, v]) => (
                          <div key={k} className="grid grid-cols-[140px_1fr] items-center gap-2">
                            <span className="text-xs text-muted-foreground capitalize truncate">{k.replace(/_/g, ' ')}</span>
                            <Input value={v} onChange={(e) => setEditedChallanFields(prev => ({ ...prev, [k]: e.target.value }))} className="h-7 text-xs font-mono" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(editedTaxBreakup).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tax Breakup</p>
                      <div className="space-y-2">
                        {Object.entries(editedTaxBreakup).map(([k, v]) => (
                          <div key={k} className="grid grid-cols-[140px_1fr] items-center gap-2">
                            <span className="text-xs text-muted-foreground capitalize truncate">{k.replace(/_/g, ' ')}</span>
                            <Input value={v} onChange={(e) => setEditedTaxBreakup(prev => ({ ...prev, [k]: e.target.value }))} className="h-7 text-xs font-mono" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(editedChallanFields).length === 0 && Object.keys(editedTaxBreakup).length === 0 && (
                    <p className="text-xs text-muted-foreground">No challan data extracted.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Excel split view */}
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="pr-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />Deductee Excel
                  </CardTitle>
                  <CardDescription className="text-xs">Uploaded spreadsheet preview</CardDescription>
                </div>
                <div className="pl-4">
                  <CardTitle className="text-sm font-semibold">Extracted Deductee Data</CardTitle>
                  <CardDescription className="text-xs">{deductees.length} records — edit if needed</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-4">
                  <ExcelViewer filename={excelFilename ?? undefined} fileUrl={excelFileUrl ?? undefined} rawRows={excelRawRows} />
                </div>
                <div className="overflow-auto max-h-[420px]">
                  {deductees.length > 0 ? (
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs w-8 py-2">#</TableHead>
                          {deducteeKeys.map(k => <TableHead key={k} className="text-xs capitalize whitespace-nowrap py-2">{k.replace(/_/g, ' ')}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deductees.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-muted-foreground py-1.5 w-8">{i + 1}</TableCell>
                            {deducteeKeys.map(k => (
                              <TableCell key={k} className="py-1 px-2">
                                <Input
                                  value={String(row[k] ?? '')}
                                  onChange={(e) => setEditedDeductees(prev => { const next = [...prev]; next[i] = { ...next[i], [k]: e.target.value }; return next })}
                                  className="h-7 text-xs font-mono min-w-[80px]"
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">No deductee data extracted</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accept / Re-extract footer */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Review complete?</p>
                <p className="text-xs text-muted-foreground">Accept the extracted data to continue to form selection and file generation.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                  onClick={() => setPhase('upload')}>
                  <ArrowLeft className="h-3.5 w-3.5" />Re-upload
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={handleReExtract} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />Re-extract
                </Button>
                <Button size="sm" onClick={() => setPhase('review')} className="gap-1.5">
                  <Check className="h-4 w-4" />Accept & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          PHASE: review — comparison results only
      ══════════════════════════════════════════════════════════ */}
      {phase === 'review' && (
        <>
          {/* Review + Comparison */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Review Extracted Data &amp; Comparison Results</CardTitle>
                  <CardDescription className="text-xs">Summary of extracted data and TDS match analysis</CardDescription>
                </div>
                {Object.keys(match).length > 0
                  ? match.tds_match
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    : <X className="h-5 w-5 text-red-500 shrink-0" />
                  : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {Object.keys(editedChallanFields).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Challan Fields</p>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableBody>
                          {Object.entries(editedChallanFields).map(([k, v]) => (
                            <TableRow key={k}>
                              <TableCell className="text-xs text-muted-foreground capitalize py-1.5 w-40">{k.replace(/_/g, ' ')}</TableCell>
                              <TableCell className="text-xs font-mono py-1.5">{v || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                {Object.keys(editedTaxBreakup).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tax Breakup</p>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableBody>
                          {Object.entries(editedTaxBreakup).map(([k, v]) => (
                            <TableRow key={k}>
                              <TableCell className="text-xs text-muted-foreground capitalize py-1.5 w-40">{k.replace(/_/g, ' ')}</TableCell>
                              <TableCell className="text-xs font-mono py-1.5">{v || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              {deductees.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Deductees <span className="normal-case font-normal">({deductees.length} records)</span>
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {deducteeKeys.map(k => <TableHead key={k} className="text-xs capitalize">{k.replace(/_/g, ' ')}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deductees.map((r, i) => (
                          <TableRow key={i}>
                            {deducteeKeys.map(k => <TableCell key={k} className="text-xs font-mono py-2">{String(r[k] ?? '—')}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {Object.keys(match).length > 0 && (
                <div className={`rounded-lg p-4 border ${match.tds_match ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-sm font-semibold mb-3 ${match.tds_match ? 'text-green-700' : 'text-red-700'}`}>
                    {match.tds_match ? '✅ TDS Matched' : '❌ TDS Mismatch Detected'}
                  </p>
                  <Table>
                    <TableBody>
                      {[['Challan Tax', `₹ ${match.challan_tax}`], ['Deductees Total TDS', `₹ ${match.deductee_total_tds}`], ['Difference', `₹ ${match.difference}`]].map(([l, v]) => (
                        <TableRow key={l} className="border-0">
                          <TableCell className="text-xs text-muted-foreground py-1 pl-0 w-48">{l}</TableCell>
                          <TableCell className="text-xs font-mono font-semibold py-1">{v}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {validation.errors?.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                  {validation.errors.map((e: string, i: number) => <p key={i} className="text-xs text-red-700">⚠ {e}</p>)}
                </div>
              )}
              {validation.warnings?.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 space-y-1">
                  {validation.warnings.map((w: string, i: number) => <p key={i} className="text-xs text-yellow-700">• {w}</p>)}
                </div>
              )}

              <div className="flex justify-between items-center">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground text-xs" onClick={() => setPhase('preview')}>
                  <ArrowLeft className="h-3.5 w-3.5" />Edit Data
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={busy} onClick={handleReExtract} className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />Re-run Comparison
                  </Button>
                  <Button size="sm" onClick={() => setPhase('generate')} className="gap-1.5">
                    <Check className="h-4 w-4" />Continue to Form Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          PHASE: generate — form selection + download
      ══════════════════════════════════════════════════════════ */}
      {phase === 'generate' && (
        <>
          {/* Form Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-7 text-xs" onClick={() => setPhase('review')}>
                    <ArrowLeft className="h-3.5 w-3.5" />Back
                  </Button>
                  <div>
                    <CardTitle className="text-sm font-semibold">Select Form &amp; Generate</CardTitle>
                    <CardDescription className="text-xs">Choose the TDS/TCS return form and generate output files</CardDescription>
                  </div>
                </div>
                {(isCompleted || session.status === 'FORM_SELECTED') && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Form Format</p>
                <div className="flex gap-2">
                  {[{ ver: 'old', label: 'Old Format', desc: 'Pre-2024' }, { ver: 'new', label: 'New Format', desc: '2024+' }].map(({ ver, label, desc }) => (
                    <button key={ver} onClick={() => { setSelFormVersion(ver); setSelFormType(''); setSelSections([]) }}
                      className={`flex-1 rounded-lg border-2 p-3 text-left transition ${selFormVersion === ver ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                      <p className="font-semibold text-xs">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Form Type</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(forms).map(([key, f]) => {
                    const name = selFormVersion === 'new' ? f.new_name : f.old_name
                    const isSelected = selFormType === key
                    return (
                      <button key={key} onClick={() => { setSelFormType(key); setSelSections([]) }}
                        className={`rounded-lg border-2 p-3 text-left transition ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'}`}>
                        <p className={`text-base font-black ${isSelected ? 'text-primary' : 'text-foreground'}`}>{name}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{f.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Quarter</p>
                <div className="flex gap-2 flex-wrap">
                  {quarters.map((q) => (
                    <button key={q.value} onClick={() => setSelQuarter(q.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition ${selQuarter === q.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}>
                      {q.value}
                      <span className="block text-[9px] font-normal opacity-70">{q.label.split('(')[1]?.replace(')', '') ?? ''}</span>
                    </button>
                  ))}
                </div>
              </div>

              {currentForm && selFormType && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">{currentForm.type} Sections</p>
                    {selSections.length > 0 && <button onClick={() => setSelSections([])} className="text-xs text-muted-foreground hover:text-destructive transition">Clear</button>}
                  </div>
                  <div className="rounded-lg border border-border divide-y divide-border max-h-48 overflow-y-auto">
                    {currentForm.sections.map((s) => {
                      const checked = selSections.includes(s.code)
                      return (
                        <label key={s.code} className={`flex items-center gap-3 cursor-pointer px-3 py-2 transition ${checked ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                          <input type="checkbox" checked={checked}
                            onChange={(e) => setSelSections(e.target.checked ? [...selSections, s.code] : selSections.filter((x) => x !== s.code))}
                            className="w-4 h-4 accent-primary shrink-0" />
                          <span className={`font-mono text-[11px] font-bold w-20 shrink-0 ${checked ? 'text-primary' : 'text-muted-foreground'}`}>{s.code}</span>
                          <span className="text-xs">{s.label}</span>
                        </label>
                      )
                    })}
                  </div>
                  {selSections.length > 0 && <p className="text-[11px] text-primary mt-1.5 font-medium">{selSections.length} section(s): {selSections.join(', ')}</p>}
                </div>
              )}

              {selFormType && autoFill.deductor_tan && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { title: 'Deductor Details', rows: [['TAN', autoFill.deductor_tan], ['Name', autoFill.deductor_name], ['Assessment Year', autoFill.assessment_year], ['Financial Year', autoFill.financial_year]] },
                    { title: 'Challan Details', rows: [['BSR Code', autoFill.bsr_code], ['Challan No', autoFill.challan_no], ['Date of Deposit', autoFill.challan_date], ['Total Tax', `₹ ${autoFill.total_tax_deposited}`]] },
                  ].map(({ title, rows }) => (
                    <div key={title} className="rounded-lg border border-border p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
                      <Table>
                        <TableBody>
                          {(rows as [string, unknown][]).map(([l, v]) => (
                            <TableRow key={l} className="border-0">
                              <TableCell className="text-xs text-muted-foreground py-1 pl-0 w-32">{l}</TableCell>
                              <TableCell className="text-xs font-mono py-1">{String(v ?? '—')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}

              {!isCompleted && (
                <div className="flex justify-end pt-1">
                  <Button disabled={!selFormType || !selQuarter || selSections.length === 0 || busy} onClick={handleGenerate} className="gap-2 bg-green-600 hover:bg-green-700 text-white" size="sm">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {busy ? 'Generating…' : isFailed ? '⚙ Retry Generation' : '⚙ Generate CSI & FVU'}
                  </Button>
                </div>
              )}


              {isFailed && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  File generation failed. Please check your data and try again.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Download */}
          {isCompleted && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Download Generated Files</CardTitle>
                    <CardDescription className="text-xs">Your TDS return files are ready</CardDescription>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { type: 'csi' as const, label: 'CSI File', sub: 'OLTAS Challan Status Inquiry (.csi)', icon: FileText, color: 'text-green-700' },
                    { type: 'fvu' as const, label: 'FVU Return File', sub: 'NSDL FVU pipe-delimited (.txt)', icon: FileSpreadsheet, color: 'text-blue-700' },
                  ].map(({ type, label, sub, icon: Icon, color }) => (
                    <div key={type} className="rounded-lg border border-border p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="text-xs text-muted-foreground">{sub}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleDownload(type)} className="gap-1.5 shrink-0">
                        <Download className="h-3.5 w-3.5" />.{type}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
