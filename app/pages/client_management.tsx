"use client"

import { useState, useRef, useCallback } from "react"
import { Search, Download, PlusIcon, Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClientTab, type Client } from "@/components/client/client_tab"
import { useToast } from "@/components/ui/use-toast"
import { onboardClient } from "@/lib/api/clients"
import { getUserData } from "@/lib/api/index"

// ── Static template columns (services appended dynamically) ──────────────────
const STATIC_HEADERS = [
  'Name*', 'Email*', 'Phone', 'Company Name', 'Business Type',
  'Status', 'Address', 'City', 'State', 'Country', 'Pincode',
  'PAN Number', 'GST Number', 'Onboard Date (YYYY-MM-DD)',
  'Follow-up Date (YYYY-MM-DD)', 'Additional Notes',
  'Director Name', 'Director Email', 'Director Phone',
  'Director Designation', 'Director DIN', 'Director PAN', 'Director Aadhar',
]

const STATIC_SAMPLE = [
  'John Doe', 'john@example.com', '9876543210', 'Doe Enterprises',
  'Private Limited', 'active', '123 Main Street',
  'Mumbai', 'Maharashtra', 'India', '400001', 'ABCDE1234F', '27ABCDE1234F1Z5',
  '2024-01-15', '2024-06-01', 'Key account',
  'Jane Doe', 'jane@example.com', '9876543211', 'CFO', 'DIN001', 'PQRST5678G', '1234-5678-9012',
]

// Convert 0-based column index to Excel letter (A, B, … Z, AA, AB…)
function colLetter(idx: number): string {
  let result = ''; let n = idx + 1
  while (n > 0) { result = String.fromCharCode(65 + ((n - 1) % 26)) + result; n = Math.floor((n - 1) / 26) }
  return result
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ImportRow {
  rowNumber: number
  name: string
  data: Record<string, string>
  status: 'pending' | 'success' | 'error'
  error?: string
}

interface ClientManagementProps {
  statusOptions?: string[]
  services?: string[]
  businessTypes?: string[]
  businessTypesWithIds?: { id: number; name: string }[]
  servicesWithIds?: { id: number; name: string }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function csvEscape(val: string) {
  return `"${String(val ?? '').replace(/"/g, '""')}"`
}

function parseDate(val: string): string | undefined {
  if (!val?.trim()) return undefined
  const d = new Date(val.trim())
  return isNaN(d.getTime()) ? undefined : d.toISOString().split('T')[0]
}

// ── Main component ────────────────────────────────────────────────────────────
export function ClientManagement({
  statusOptions = [],
  services = [],
  businessTypes = [],
  businessTypesWithIds = [],
  servicesWithIds = []
}: ClientManagementProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filteredClientsForExport, setFilteredClientsForExport] = useState<Client[]>([])

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importLandingOpen, setImportLandingOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importPhase, setImportPhase] = useState<'preview' | 'importing' | 'done'>('preview')
  const [importProgress, setImportProgress] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const toExport = filteredClientsForExport

    if (toExport.length === 0) {
      toast({ title: 'No Data to Export', description: 'No clients to export.', variant: 'warning' })
      return
    }

    try {
      const headers = [
        'Name', 'Email', 'Phone', 'Company Name', 'Services', 'Follow-up Date', 'Onboard Date', 'Last Contacted',
        'Director Name', 'Director Email', 'Director Phone', 'Director Designation', 'Director DIN', 'Director PAN', 'Director Aadhar',
      ]
      const rows: string[][] = []
      for (const client of toExport) {
        const base = [
          client.name, client.email, client.phone || '', client.companyName,
          Array.isArray(client.directories) ? client.directories.join('; ') : client.directories || '',
          client.followUpDate ? new Date(client.followUpDate).toLocaleDateString() : '',
          client.onboardDate ? new Date(client.onboardDate).toLocaleDateString() : '',
          client.lastContactedDate ? new Date(client.lastContactedDate).toLocaleDateString() : '',
        ]
        const directors = Array.isArray(client.directors) ? client.directors : []
        if (directors.length === 0) {
          rows.push([...base, '', '', '', '', '', '', ''])
        } else {
          for (const dir of directors) {
            rows.push([...base, dir.name || '', dir.email || '', dir.phone || '', dir.designation || '', dir.din || '', dir.pan || '', dir.aadhar || ''])
          }
        }
      }

      const csv = [headers.join(','), ...rows.map(r => r.map(csvEscape).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `clients_${new Date().toISOString().split('T')[0]}.csv`
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast({ title: 'Export Successful', description: `Exported ${toExport.length} client(s).`, variant: 'success' })
    } catch {
      toast({ title: 'Export Failed', description: 'Failed to export clients.', variant: 'destructive' })
    }
  }

  // ── Download template (XLSX with dropdowns) ────────────────────────────────
  const handleDownloadTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()

    // Business Types reference sheet (hidden)
    const btSheet = wb.addWorksheet('_BusinessTypes')
    btSheet.state = 'veryHidden'
    const btNames = businessTypesWithIds.length > 0
      ? businessTypesWithIds.map(bt => bt.name)
      : ['Private Limited', 'Partnership', 'Proprietorship', 'LLP', 'Other']
    btNames.forEach((n, i) => { btSheet.getCell(`A${i + 1}`).value = n })

    // Status reference sheet (hidden)
    const statusSheet = wb.addWorksheet('_Status')
    statusSheet.state = 'veryHidden'
    ;['active', 'inactive', 'terminated'].forEach((v, i) => { statusSheet.getCell(`A${i + 1}`).value = v })

    // Build full headers: static[0..4] + service columns + static[5..]
    // Service columns sit right after Business Type (index 4)
    const svcNames = servicesWithIds.length > 0
      ? servicesWithIds.map(s => s.name)
      : ['GST Filing', 'TDS', 'Income Tax Filling', 'ROC filings', 'Audit Service']
    const allHeaders = [...STATIC_HEADERS.slice(0, 5), ...svcNames, ...STATIC_HEADERS.slice(5)]
    const svcStartIdx = 5  // 0-based index of first service column (right after Business Type)

    // Sample row: static[0..4] + 'No' per service + static[5..]
    const allSample = [...STATIC_SAMPLE.slice(0, 5), ...svcNames.map(() => 'No'), ...STATIC_SAMPLE.slice(5)]

    // ── Main template sheet ──
    const ws = wb.addWorksheet('Import Template')

    // Header row — service columns (indices 5..5+svcNames.length-1) get a green header
    const headerRow = ws.addRow(allHeaders)
    headerRow.eachCell((cell, colNumber) => {
      const isServiceCol = colNumber > 5 && colNumber <= 5 + svcNames.length
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isServiceCol ? 'FF1A5C38' : 'FF1E3A5F' } }
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
        right: { style: 'thin', color: { argb: 'FFAAAAAA' } },
      }
    })
    ws.getRow(1).height = 30

    // Sample row
    const sampleRow = ws.addRow(allSample)
    sampleRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } }
      cell.font = { italic: true, color: { argb: 'FF555555' } }
    })

    // Column widths: first 5 static + service cols + remaining static
    const firstWidths = [18, 24, 14, 22, 20]                            // Name..Business Type
    const restWidths  = [12, 24, 14, 14, 14, 10, 14, 18, 20, 20, 22, 18, 22, 14, 18, 12, 12, 18]  // Status..Director Aadhar
    ws.columns = allHeaders.map((h, i) => {
      if (i < 5) return { header: h, width: firstWidths[i]! }
      if (i < 5 + svcNames.length) return { header: h, width: 14 }
      return { header: h, width: restWidths[i - 5 - svcNames.length] ?? 18 }
    })
    // columns setter re-writes row 1 — restore header style
    headerRow.eachCell((cell, colNumber) => {
      const isServiceCol = colNumber > 5 && colNumber <= 5 + svcNames.length
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isServiceCol ? 'FF1A5C38' : 'FF1E3A5F' } }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })

    ws.views = [{ state: 'frozen', ySplit: 1 }]

    // ── Data validations for rows 2–1001 ──

    // Business Type dropdown (col E, STATIC_HEADERS index 4)
    const btCol = colLetter(4)
    for (let r = 2; r <= 1001; r++) {
      ws.getCell(`${btCol}${r}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: [`_BusinessTypes!$A$1:$A$${btNames.length}`],
        showErrorMessage: true, errorStyle: 'warning',
        errorTitle: 'Invalid Business Type', error: 'Please select a value from the list',
        showInputMessage: true, promptTitle: 'Business Type', prompt: 'Select a business type',
      }
    }

    // Status dropdown — shifted right by the number of service columns
    const statusCol = colLetter(5 + svcNames.length)
    for (let r = 2; r <= 1001; r++) {
      ws.getCell(`${statusCol}${r}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"active,inactive,terminated"'],
        showErrorMessage: true, errorStyle: 'stop',
        errorTitle: 'Invalid Status', error: 'Status must be: active, inactive, or terminated',
        showInputMessage: true, promptTitle: 'Status', prompt: 'Select: active, inactive, or terminated',
      }
    }

    // Yes/No dropdown for each service column
    svcNames.forEach((_, i) => {
      const col = colLetter(svcStartIdx + i)
      for (let r = 2; r <= 1001; r++) {
        ws.getCell(`${col}${r}`).dataValidation = {
          type: 'list', allowBlank: true,
          formulae: ['"Yes,No"'],
          showErrorMessage: true, errorStyle: 'stop',
          errorTitle: 'Invalid Value', error: 'Please select Yes or No',
          showInputMessage: false,
        }
      }
    })

    // Download
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'client_import_template.xlsx'
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
    toast({ title: 'Template Downloaded', description: 'Each service has its own Yes/No column (green headers).', variant: 'success' })
  }

  // ── Parse uploaded file ─────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]!]
      if (!ws) { toast({ title: 'Empty file', description: 'The file has no sheets.', variant: 'destructive' }); return }

      const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]
      if (raw.length < 2) { toast({ title: 'No data', description: 'The file has no data rows.', variant: 'destructive' }); return }

      // Normalise header row — strip asterisks and extra whitespace
      const headerRow = (raw[0] ?? []).map((h) => String(h).replace(/\*/g, '').trim())
      const dataRows = raw.slice(1).filter((r) => r.some((cell) => String(cell).trim() !== ''))

      const rows: ImportRow[] = dataRows.map((row, idx) => {
        const data: Record<string, string> = {}
        headerRow.forEach((h, i) => { data[h] = String(row[i] ?? '').trim() })
        return {
          rowNumber: idx + 2,
          name: data['Name'] || data['name'] || `Row ${idx + 2}`,
          data,
          status: 'pending',
        }
      })

      if (rows.length === 0) { toast({ title: 'No data', description: 'No valid rows found.', variant: 'destructive' }); return }

      setImportRows(rows)
      setImportPhase('preview')
      setImportProgress(0)
      setImportDialogOpen(true)
    } catch (err) {
      console.error('File parse error:', err)
      toast({ title: 'Parse Error', description: 'Could not read the file. Use a valid CSV or XLSX.', variant: 'destructive' })
    }
  }, [toast])

  // ── Run import ──────────────────────────────────────────────────────────────
  const handleRunImport = async () => {
    setImportPhase('importing')
    const user = getUserData() as any
    const orgId: number | undefined = user?.organizationId != null ? Number(user.organizationId) : undefined

    let done = 0
    const updated = [...importRows]

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i]!
      const d = row.data

      const name = d['Name'] || d['name'] || ''
      const email = d['Email'] || d['email'] || ''

      if (!name.trim() || !email.trim()) {
        updated[i] = { ...row, status: 'error', error: 'Name and Email are required' }
        done++
        setImportProgress(done)
        setImportRows([...updated])
        continue
      }

      // Resolve business type
      const btName = (d['Business Type'] || '').trim().toLowerCase()
      const btMatch = businessTypesWithIds.find((bt) => bt.name.toLowerCase() === btName)

      // Resolve services — read per-service Yes/No columns
      const svcIds = servicesWithIds
        .filter((s) => {
          const val = (d[s.name] || '').trim().toLowerCase()
          return val === 'yes' || val === 'y' || val === 'true' || val === '1'
        })
        .map((s) => s.id)

      // Director
      const dirName = (d['Director Name'] || '').trim()
      const directors = dirName
        ? [{
            directorName: dirName,
            email: d['Director Email'] || undefined,
            phone: d['Director Phone'] || undefined,
            designation: d['Director Designation'] || undefined,
            din: d['Director DIN'] || undefined,
            pan: d['Director PAN'] || undefined,
            aadharNumber: d['Director Aadhar'] || undefined,
          }]
        : undefined

      const payload: Parameters<typeof onboardClient>[0] = {
        name: name.trim(),
        email: email.trim(),
        phone: d['Phone'] || undefined,
        companyName: d['Company Name'] || undefined,
        businessTypeId: btMatch?.id,
        serviceIds: svcIds.length ? svcIds : undefined,
        status: (['active', 'inactive', 'terminated'].includes((d['Status'] || '').toLowerCase())
          ? (d['Status'] || '').toLowerCase()
          : 'active') as any,
        address: d['Address'] || undefined,
        city: d['City'] || undefined,
        state: d['State'] || undefined,
        country: d['Country'] || undefined,
        pincode: d['Pincode'] || undefined,
        panNumber: d['PAN Number'] || undefined,
        gstNumber: d['GST Number'] || undefined,
        onboardDate: parseDate(d['Onboard Date (YYYY-MM-DD)'] || d['Onboard Date'] || ''),
        followupDate: parseDate(d['Follow-up Date (YYYY-MM-DD)'] || d['Follow-up Date'] || ''),
        additionalNotes: d['Additional Notes'] || undefined,
        organizationId: orgId,
        directors,
      }

      try {
        await onboardClient(payload)
        updated[i] = { ...row, status: 'success' }
      } catch (err: any) {
        const msg = err?.message || err?.error || 'Failed to create client'
        updated[i] = { ...row, status: 'error', error: msg }
      }

      done++
      setImportProgress(done)
      setImportRows([...updated])
    }

    setImportPhase('done')
    const ok = updated.filter((r) => r.status === 'success').length
    const fail = updated.filter((r) => r.status === 'error').length
    if (fail === 0) {
      toast({ title: 'Import Complete', description: `${ok} client${ok !== 1 ? 's' : ''} imported successfully.`, variant: 'success' })
    } else {
      toast({ title: 'Import Finished', description: `${ok} succeeded, ${fail} failed.`, variant: fail === updated.length ? 'destructive' : 'warning' })
    }
    setRefreshKey((k) => k + 1)
  }

  const handleCloseImport = () => {
    setImportDialogOpen(false)
    setImportRows([])
    setImportPhase('preview')
    setImportProgress(0)
  }

  const handleChooseFile = () => {
    setImportLandingOpen(false)
    // Small delay so the landing dialog finishes closing before the file picker opens
    setTimeout(() => fileInputRef.current?.click(), 150)
  }

  // ── Counts ──────────────────────────────────────────────────────────────────
  const successCount = importRows.filter((r) => r.status === 'success').length
  const errorCount = importRows.filter((r) => r.status === 'error').length
  const totalRows = importRows.length

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Client Management</h1>
          <p className="text-muted-foreground mt-1">Manage your clients and their information</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 border border-input" />
          </div>
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter} disabled={statusOptions.length === 0}>
            <SelectTrigger className="w-[140px] h-9 border border-input">
              <SelectValue placeholder={statusOptions.length === 0 ? 'No status options' : 'Filter by status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport}
            disabled={filteredClientsForExport.length === 0}
            className="border border-input">
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          {/* Import button → landing dialog */}
          <Button variant="outline" size="sm" className="border border-input gap-1" onClick={() => setImportLandingOpen(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
          {/* Onboard Client */}
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />Onboard Client
          </Button>
        </div>
      </div>

      <ClientTab
        key={refreshKey}
        useApi={true}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onFilteredClientsChange={setFilteredClientsForExport}
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        services={services}
        businessTypes={businessTypes}
        businessTypesWithIds={businessTypesWithIds}
        servicesWithIds={servicesWithIds}
        clientStatuses={statusOptions}
      />

      {/* ── Import landing dialog ───────────────────────────────────────────── */}
      <Dialog open={importLandingOpen} onOpenChange={setImportLandingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              Import Leads
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            {/* Download Template section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Download Template</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Download our XLSX template with all required fields to ensure proper formatting.
              </p>
              <Button variant="outline" className="w-full gap-2" onClick={async () => { await handleDownloadTemplate(); }}>
                <Download className="h-4 w-4" />
                Download Template (XLSX)
              </Button>
            </div>

            <div className="border-t" />

            {/* Upload File section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Upload File</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload your CSV or XLSX file with client data. Make sure to follow the template format.
              </p>
              <Button className="w-full gap-2" onClick={handleChooseFile}>
                <Upload className="h-4 w-4" />
                Choose File &amp; Upload
              </Button>
            </div>

            <div className="border-t" />

            {/* Important note */}
            <div className="flex items-start gap-2 rounded-md border px-3 py-2.5 bg-muted/40">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Important:</span> Fields marked with * are required.
                Make sure your file follows the template format for successful import.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportLandingOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import preview/progress dialog ──────────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => !open && importPhase !== 'importing' && handleCloseImport()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Clients
            </DialogTitle>
            <DialogDescription>
              {importPhase === 'preview' && `${totalRows} row${totalRows !== 1 ? 's' : ''} ready to import. Review before proceeding.`}
              {importPhase === 'importing' && `Importing… ${importProgress} of ${totalRows}`}
              {importPhase === 'done' && `Done — ${successCount} succeeded, ${errorCount} failed.`}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          {importPhase !== 'preview' && (
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${importPhase === 'done' && errorCount === totalRows ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${totalRows > 0 ? (importProgress / totalRows) * 100 : 0}%` }}
              />
            </div>
          )}

          {/* Row list */}
          <div className="flex-1 overflow-y-auto border border-border rounded-lg divide-y divide-border min-h-0">
            {importRows.map((row) => (
              <div key={row.rowNumber} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs text-muted-foreground w-8 shrink-0">#{row.rowNumber}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{row.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{row.data['Email'] || row.data['email'] || '—'}</p>
                  {row.status === 'error' && row.error && (
                    <p className="text-xs text-destructive mt-0.5 truncate">{row.error}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {row.status === 'pending' && importPhase === 'importing' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {row.status === 'pending' && importPhase === 'preview' && <span className="text-xs text-muted-foreground">Pending</span>}
                  {row.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {row.status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
              </div>
            ))}
          </div>

          {/* Summary badges when done */}
          {importPhase === 'done' && (
            <div className="flex gap-3 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 px-3 py-1.5 rounded-md">
                <CheckCircle2 className="h-3.5 w-3.5" />{successCount} imported
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-destructive bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-md">
                  <AlertCircle className="h-3.5 w-3.5" />{errorCount} failed
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            {importPhase === 'preview' && (
              <>
                <Button variant="outline" size="sm" onClick={handleCloseImport}>Cancel</Button>
                <Button size="sm" onClick={handleRunImport} disabled={totalRows === 0}>
                  <Upload className="h-4 w-4 mr-1.5" />Import {totalRows} client{totalRows !== 1 ? 's' : ''}
                </Button>
              </>
            )}
            {importPhase === 'importing' && (
              <Button size="sm" disabled>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Importing…
              </Button>
            )}
            {importPhase === 'done' && (
              <Button size="sm" onClick={handleCloseImport}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
