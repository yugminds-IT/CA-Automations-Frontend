'use client'

import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, FileText, Image, CheckCircle2, Loader2,
  ArrowLeft, RefreshCw, Download, X, GitCompare, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { uploadGstDocument, pollGstSession } from '@/lib/api/gst-filing'
import type { GstSession } from './gst_tab'

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({ label, accept, done, filename, uploading, onFile }: {
  label: string; accept: string
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
      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors select-none min-h-[160px]
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
            <p className="text-sm font-medium text-green-700 truncate max-w-[220px]">{filename ?? label}</p>
            <p className="text-xs text-green-600 mt-0.5">Uploaded successfully</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-7"
            onClick={(e) => { e.stopPropagation(); ref.current?.click() }}>
            Replace
          </Button>
        </>
      ) : (
        <>
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <div className="flex gap-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Image className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF or image — drag & drop or click to browse</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-7 pointer-events-none">
            <Upload className="h-3.5 w-3.5 mr-1.5" />Browse
          </Button>
        </>
      )}
    </div>
  )
}

// ── Document viewer ───────────────────────────────────────────────────────────
function DocumentViewer({ previewUrl, filename, fileType }: {
  previewUrl?: string; filename?: string; fileType?: string
}) {
  const isPdf = fileType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf')

  if (previewUrl) {
    return (
      <div className="flex flex-col h-full min-h-[380px] rounded-lg border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-border shrink-0">
          <FileText className="h-4 w-4 text-blue-500" />
          <p className="text-xs font-semibold text-blue-800 truncate flex-1">{filename ?? 'GST Document'}</p>
          <a href={previewUrl} target="_blank" rel="noreferrer"
            className="text-[10px] text-blue-600 hover:underline shrink-0">Open ↗</a>
        </div>
        {isPdf ? (
          <iframe src={previewUrl} className="flex-1 w-full border-0 min-h-[340px]" title="GST Document Preview" />
        ) : (
          <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={filename ?? 'GST Document'} className="max-w-full object-contain rounded shadow-sm" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-[260px] bg-gray-50 rounded-lg border border-dashed border-border items-center justify-center gap-3 p-6">
      <FileText className="h-10 w-10 text-muted-foreground/30" />
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{filename ?? 'GST Document'}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">Preview available after upload</p>
      </div>
    </div>
  )
}

// ── Wizard ────────────────────────────────────────────────────────────────────
interface GstWizardProps {
  session: GstSession
  clientName: string
  onBack: (updated?: Partial<GstSession>) => void
}

export function GstWizard({ session: initialSession, clientName, onBack }: GstWizardProps) {
  const [phase, setPhase] = useState<'upload' | 'preview' | 'review' | 'complete'>('upload')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [docFile, setDocFile]                 = useState<File | null>(null)
  const [docFilename, setDocFilename]         = useState<string | null>(null)
  const [docPreviewUrl, setDocPreviewUrl]     = useState<string | null>(null)
  const [docFileType, setDocFileType]         = useState<string | null>(null)
  const [uploaded, setUploaded]               = useState(false)

  const [extractedData, setExtractedData]     = useState<Record<string, any> | null>(null)
  const [comparisonData, setComparisonData]   = useState<Record<string, any> | null>(null)
  const [editedFields, setEditedFields]       = useState<Record<string, string>>({})

  useEffect(() => {
    return () => { if (docPreviewUrl) URL.revokeObjectURL(docPreviewUrl) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flattenForEdit(data: any, prefix = ''): Record<string, string> {
    if (!data || typeof data !== 'object') return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(data)) {
      const key = prefix ? `${prefix}.${k}` : k
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(out, flattenForEdit(v, key))
      } else if (!Array.isArray(v)) {
        out[key] = String(v ?? '')
      }
    }
    return out
  }

  const handleUpload = (file: File) => {
    if (docPreviewUrl) URL.revokeObjectURL(docPreviewUrl)
    setDocPreviewUrl(URL.createObjectURL(file))
    setDocFilename(file.name)
    setDocFileType(file.type)
    setDocFile(file)
    setUploaded(true)
    setError(null)
  }

  const runExtraction = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      let session = await uploadGstDocument(initialSession.id, file)
      if (session.status === 'PROCESSING') {
        session = await pollGstSession(initialSession.id)
      }
      if (session.status === 'FAILED') {
        throw new Error('Extraction failed on the server — please try again.')
      }
      const extracted = session.extractedData ?? {}
      const comparison = session.comparisonData ?? {}
      setExtractedData(extracted)
      setComparisonData(comparison)
      setEditedFields(flattenForEdit(extracted))
      return { extracted, comparison }
    } catch (e: any) {
      setError(e?.message ?? 'Extraction failed')
      return null
    } finally {
      setBusy(false)
    }
  }

  const handleExtractAndCompare = async () => {
    if (!docFile) return
    const result = await runExtraction(docFile)
    if (result) setPhase('preview')
  }

  const handleReExtract = async () => {
    if (!docFile) return
    await runExtraction(docFile)
  }

  const handleDownloadExcel = () => {
    if (!extractedData) return
    const sheets: Record<string, any[]> = {}

    const summaryRows = Object.entries(editedFields).map(([k, v]) => ({
      Field: k.replace(/[._]/g, ' '),
      Value: v,
    }))
    sheets['Summary'] = summaryRows

    for (const [k, v] of Object.entries(extractedData)) {
      if (Array.isArray(v) && v.length > 0) {
        sheets[k.charAt(0).toUpperCase() + k.slice(1)] = v
      }
    }

    const wb = XLSX.utils.book_new()
    for (const [name, rows] of Object.entries(sheets)) {
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31))
    }

    XLSX.writeFile(wb, `GST_${clientName || 'client'}_${extractedData.period ?? 'data'}.xlsx`)
  }

  const match      = (comparisonData as any)?.match ?? {}
  const validation = (comparisonData as any)?.validation ?? {}

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => onBack()} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />Back
        </Button>
        <div className="flex-1">
          <h2 className="text-base font-semibold">GST Filing — {clientName || `Client ${initialSession.clientId}`}</h2>
          <p className="text-xs text-muted-foreground">
            {extractedData?.financial_year ? `FY ${extractedData.financial_year}` : 'Financial year not yet set'}
            {extractedData?.period ? ` · ${extractedData.period}` : ''}
          </p>
        </div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
          {(['upload','preview','review','complete'] as const).map((p, i, arr) => (
            <span key={p} className="flex items-center gap-1">
              <span className={phase === p ? 'text-primary font-semibold' : ''}>
                {p === 'upload' ? 'Upload' : p === 'preview' ? 'Review' : p === 'review' ? 'Comparison' : 'Download'}
              </span>
              {i < arr.length - 1 && <span className="mx-0.5">›</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ══ PHASE: upload ══ */}
      {phase === 'upload' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Upload GST Document</CardTitle>
                <CardDescription className="text-xs">Upload a GST PDF or image, then extract &amp; compare</CardDescription>
              </div>
              {uploaded && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <DropZone
              label="Drop GST PDF or image"
              accept=".pdf,image/*"
              done={uploaded}
              filename={docFilename ?? undefined}
              uploading={false}
              onFile={handleUpload}
            />
            <div className="flex justify-end pt-1">
              <Button
                onClick={handleExtractAndCompare}
                disabled={!uploaded || busy}
                className="gap-2" size="sm"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
                {busy ? 'Extracting & Comparing…' : 'Extract & Compare'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ PHASE: preview ══ */}
      {phase === 'preview' && (
        <>
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="pr-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />Uploaded Document
                  </CardTitle>
                  <CardDescription className="text-xs">Document preview</CardDescription>
                </div>
                <div className="pl-4">
                  <CardTitle className="text-sm font-semibold">Extracted GST Data</CardTitle>
                  <CardDescription className="text-xs">Review and edit if needed</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-4">
                  <DocumentViewer
                    previewUrl={docPreviewUrl ?? undefined}
                    filename={docFilename ?? undefined}
                    fileType={docFileType ?? undefined}
                  />
                </div>
                <div className="p-4 space-y-2 overflow-y-auto max-h-[460px]">
                  {Object.keys(editedFields).length > 0 ? (
                    Object.entries(editedFields).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[150px_1fr] items-center gap-2">
                        <span className="text-xs text-muted-foreground capitalize truncate" title={k.replace(/[._]/g, ' ')}>
                          {k.replace(/[._]/g, ' ')}
                        </span>
                        <Input
                          value={v}
                          onChange={(e) => setEditedFields(prev => ({ ...prev, [k]: e.target.value }))}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No data extracted yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Review complete?</p>
                <p className="text-xs text-muted-foreground">Accept the extracted data to continue to comparison results.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                  onClick={() => setPhase('upload')}>
                  <ArrowLeft className="h-3.5 w-3.5" />Re-upload
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={handleReExtract} className="gap-1.5">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Re-extract
                </Button>
                <Button size="sm" onClick={() => setPhase('review')} className="gap-1.5">
                  <Check className="h-4 w-4" />Accept & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ══ PHASE: review ══ */}
      {phase === 'review' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Review Extracted Data &amp; Comparison Results</CardTitle>
                <CardDescription className="text-xs">Summary of extracted GST data and validation results</CardDescription>
              </div>
              {Object.keys(match).length > 0
                ? match.is_valid
                  ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  : <X className="h-5 w-5 text-red-500 shrink-0" />
                : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Flat fields summary */}
            {Object.keys(editedFields).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Extracted Fields</p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableBody>
                      {Object.entries(editedFields).map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell className="text-xs text-muted-foreground capitalize py-1.5 w-48">
                            {k.replace(/[._]/g, ' ')}
                          </TableCell>
                          <TableCell className="text-xs font-mono py-1.5">{v || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Array tables (e.g. invoices) */}
            {extractedData && Object.entries(extractedData).map(([k, v]) => {
              if (!Array.isArray(v) || v.length === 0) return null
              const keys = Object.keys(v[0] ?? {})
              return (
                <div key={k}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {k.replace(/_/g, ' ')} <span className="normal-case font-normal">({v.length} records)</span>
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {keys.map(h => <TableHead key={h} className="text-xs capitalize">{h.replace(/_/g, ' ')}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {v.map((row: any, i: number) => (
                          <TableRow key={i}>
                            {keys.map(h => <TableCell key={h} className="text-xs font-mono py-2">{String(row[h] ?? '—')}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
            })}

            {/* Comparison card */}
            {Object.keys(match).length > 0 && (
              <div className={`rounded-lg p-4 border ${match.is_valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm font-semibold mb-3 ${match.is_valid ? 'text-green-700' : 'text-red-700'}`}>
                  {match.is_valid ? '✅ GST Data Valid' : '❌ Validation Issues Detected'}
                </p>
                <Table>
                  <TableBody>
                    {Object.entries(match).filter(([k]) => k !== 'is_valid').map(([l, v]) => (
                      <TableRow key={l} className="border-0">
                        <TableCell className="text-xs text-muted-foreground py-1 pl-0 w-48 capitalize">{l.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-xs font-mono font-semibold py-1">{String(v)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Errors / warnings */}
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
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Re-run Comparison
                </Button>
                <Button size="sm" onClick={handleDownloadExcel} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                  <Download className="h-4 w-4" />Download .xlsx
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ PHASE: complete ══ */}
      {phase === 'complete' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-7 text-xs" onClick={() => setPhase('review')}>
                  <ArrowLeft className="h-3.5 w-3.5" />Back
                </Button>
                <div>
                  <CardTitle className="text-sm font-semibold">Download Extracted Data</CardTitle>
                  <CardDescription className="text-xs">Export all extracted GST data as an Excel workbook</CardDescription>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Download className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold">GST Extracted Data</p>
                  <p className="text-xs text-muted-foreground">
                    Excel workbook with Summary and Invoices sheets
                    {extractedData?.period ? ` · ${extractedData.period}` : ''}
                    {extractedData?.financial_year ? ` · FY ${extractedData.financial_year}` : ''}
                  </p>
                </div>
              </div>
              <Button
                size="sm" variant="outline"
                onClick={handleDownloadExcel}
                className="gap-1.5 shrink-0"
              >
                <Download className="h-3.5 w-3.5" />.xlsx
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
