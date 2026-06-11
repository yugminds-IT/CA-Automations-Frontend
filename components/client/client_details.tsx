'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { Client } from './client_tab'
import type { ClientDetailSection } from './client-detail-sidebar'
import { DirectorsTab, type Director } from './director_info/directors_tab'
import { EmailSetup } from './director_info/email-setup'
import { ClientLoginTab } from './director_info/client-login-tab'
import { FilesTab } from './director_info/files_tab'
import { ClientDetailsTab } from './director_info/client-details-tab'
import { SettingsTab } from './director_info/settings-tab'
import { getClientById, updateClientLogin, removeClientLogin, addDirector, updateDirector, deleteDirector } from '@/lib/api/clients'
import { ApiError } from '@/lib/api/client'
import type { Client as ApiClient } from '@/lib/api/types'

interface ClientDetailsProps {
  clientId: string
  activeSection?: ClientDetailSection
  onClientNameChange?: (name: string) => void
}

function transformApiClientToComponent(apiClient: ApiClient & Record<string, unknown>): Client {
  const c = apiClient as any
  const serviceNames = (Array.isArray(apiClient.services)
    ? (apiClient.services as { name?: string }[]).map((s) => s.name).filter((n): n is string => n != null && n !== '')
    : [])
  const bt = c.businessType ?? (apiClient as any).business_type
  const businessType =
    typeof bt === 'object' && bt !== null && 'name' in bt
      ? (bt as { name: string }).name
      : typeof bt === 'string' ? bt : undefined
  return {
    id: apiClient.id,
    name: c.name ?? apiClient.client_name ?? '',
    email: apiClient.email ?? '',
    phone: c.phone ?? apiClient.phone_number ?? undefined,
    companyName: c.companyName ?? apiClient.company_name ?? '',
    directories: serviceNames.length > 0 ? serviceNames : '—',
    followUpDate: c.followupDate ?? apiClient.follow_date ?? null,
    onboardDate: c.onboardDate ?? apiClient.onboard_date ?? null,
    lastContactedDate: null,
    status: apiClient.status ?? undefined,
    businessType,
    panNumber: c.panNumber ?? apiClient.pan_number ?? undefined,
    gstNumber: c.gstNumber ?? apiClient.gst_number ?? undefined,
    address: c.address ?? apiClient.address ?? undefined,
    city: c.city ?? apiClient.city ?? undefined,
    state: c.state ?? apiClient.state ?? undefined,
    country: c.country ?? apiClient.country ?? undefined,
    pincode: c.pincode ?? apiClient.pin_code ?? undefined,
    notes: c.additionalNotes ?? apiClient.additional_notes ?? undefined,
  }
}

function transformApiDirectors(apiDirectors?: Array<Record<string, unknown>>): Director[] {
  if (!apiDirectors || apiDirectors.length === 0) return []
  return apiDirectors.map((dir: any) => ({
    id: dir.id ?? undefined,
    name: dir.directorName ?? dir.director_name ?? '',
    email: dir.email ?? '',
    phone: dir.phone ?? dir.phone_number ?? '',
    designation: dir.designation ?? '',
    din: dir.din ?? '',
    pan: dir.pan ?? '',
    aadhar: dir.aadharNumber ?? dir.aadhaar ?? dir.aadhar ?? '',
  }))
}

export function ClientDetails({ clientId, activeSection = 'details', onClientNameChange }: ClientDetailsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [client, setClient] = useState<Client | null>(null)
  const [clientOrganizationId, setClientOrganizationId] = useState<number | undefined>(undefined)
  const [directors, setDirectors] = useState<Director[]>([])
  const [initialLogins, setInitialLogins] = useState<Array<{ email: string; password: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const suggestedEmails = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const seen = new Set<string>()
    const out: string[] = []
    const candidates = [
      client?.email,
      ...(directors?.map((d) => d.email) ?? []),
    ].filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
    for (const e of candidates) {
      const trimmed = e.trim()
      if (!emailRegex.test(trimmed)) continue
      const key = trimmed.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(trimmed)
    }
    return out
  }, [client?.email, directors])

  useEffect(() => {
    const loadClientData = async () => {
      if (!clientId) { setIsLoading(false); return }

      setIsLoading(true)
      setError(null)
      try {
        const apiClient = await getClientById(clientId)
        const transformedClient = transformApiClientToComponent(apiClient)
        setClient(transformedClient)
        onClientNameChange?.(transformedClient.companyName || transformedClient.name || '')
        const raw = apiClient as any
        setClientOrganizationId(raw.organizationId)

        const directorsList = Array.isArray((apiClient as Record<string, unknown>).directors)
          ? ((apiClient as Record<string, unknown>).directors as Array<Record<string, unknown>>)
          : []
        if (directorsList.length > 0) {
          setDirectors(transformApiDirectors(directorsList))
        }

        const loginEmail = raw.login_email ?? raw.user?.email ?? null
        if (loginEmail) {
          const passwordValue = (raw.login_password && String(raw.login_password).trim())
            ? String(raw.login_password).trim()
            : ''
          setInitialLogins([{ email: loginEmail, password: passwordValue }])
        } else {
          setInitialLogins([])
        }
      } catch (err: unknown) {
        console.error('Error loading client data:', err)
        let errorMessage = 'Failed to load client data. Please try again.'

        if (err instanceof ApiError) {
          const detail = err.detail
          if (typeof detail === 'string') {
            errorMessage = detail
          } else if (detail && typeof detail === 'object') {
            const detailObj = detail as Record<string, any>
            if (detailObj.errors && typeof detailObj.errors === 'object') {
              const msgs = Object.entries(detailObj.errors)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
                .join('; ')
              errorMessage = msgs || (detailObj.detail as string) || String(detail)
            } else {
              errorMessage = (detailObj.detail as string) || (detailObj.message as string) || JSON.stringify(detail)
            }
          } else {
            errorMessage = err.message || `Server error (${err.status})`
          }
        } else if (err instanceof Error) {
          errorMessage = err.message
        }

        setError(errorMessage)
        toast({ title: 'Error', description: errorMessage, variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }

    loadClientData()
  }, [clientId, toast, refreshKey])

  const handleRemoveDirector = async (index: number) => {
    const director = directors[index]
    if (director?.id) {
      try {
        await deleteDirector(clientId, director.id)
      } catch (err) {
        console.error('Failed to delete director:', err)
        toast({ title: 'Error', description: 'Failed to remove director', variant: 'destructive' })
        return
      }
    }
    setDirectors(directors.filter((_, i) => i !== index))
    toast({ title: 'Success', description: 'Director removed', variant: 'success' })
  }

  const handleAddDirector = async (director: Director) => {
    try {
      const created = await addDirector(clientId, {
        directorName: director.name,
        email: director.email ?? '',
        phone: director.phone ?? '',
        designation: director.designation || undefined,
        din: director.din || undefined,
        pan: director.pan || undefined,
        aadharNumber: director.aadhar || undefined,
      })
      const newDirector: Director = {
        id: (created as any).id,
        name: (created as any).directorName ?? director.name,
        email: (created as any).email ?? director.email,
        phone: (created as any).phone ?? director.phone,
        designation: (created as any).designation ?? director.designation,
        din: (created as any).din ?? director.din,
        pan: (created as any).pan ?? director.pan,
        aadhar: (created as any).aadharNumber ?? director.aadhar,
      }
      setDirectors([...directors, newDirector])
      toast({ title: 'Success', description: 'Director added', variant: 'success' })
    } catch (err) {
      console.error('Failed to add director:', err)
      toast({ title: 'Error', description: 'Failed to add director', variant: 'destructive' })
    }
  }

  const handleEditDirector = async (index: number, director: Director) => {
    const existing = directors[index]
    if (existing?.id) {
      try {
        const updated = await updateDirector(clientId, existing.id, {
          directorName: director.name,
          email: director.email || undefined,
          phone: director.phone || undefined,
          designation: director.designation || undefined,
          din: director.din || undefined,
          pan: director.pan || undefined,
          aadharNumber: director.aadhar || undefined,
        })
        const updatedDirector: Director = {
          id: existing.id,
          name: (updated as any).directorName ?? director.name,
          email: (updated as any).email ?? director.email,
          phone: (updated as any).phone ?? director.phone,
          designation: (updated as any).designation ?? director.designation,
          din: (updated as any).din ?? director.din,
          pan: (updated as any).pan ?? director.pan,
          aadhar: (updated as any).aadharNumber ?? director.aadhar,
        }
        setDirectors(directors.map((d, i) => (i === index ? updatedDirector : d)))
        toast({ title: 'Success', description: 'Director updated', variant: 'success' })
      } catch (err) {
        console.error('Failed to update director:', err)
        toast({ title: 'Error', description: 'Failed to update director', variant: 'destructive' })
      }
    } else {
      setDirectors(directors.map((d, i) => (i === index ? director : d)))
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading client details...</div>
        </div>
      </div>
    )
  }

  if (error || (!isLoading && !client)) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-destructive mb-2">{error || 'Client not found'}</div>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/client-management')}>
            Back to Client Management
          </Button>
        </div>
      </div>
    )
  }

  // ── TDS / GST / Bank Statement sections ─────────────────────────────────────
  if (activeSection === 'tds') return <TdsSection clientName={client?.companyName || client?.name || ''} />
  if (activeSection === 'gst') return <GstSection clientName={client?.companyName || client?.name || ''} />
  if (activeSection === 'bank-statement') return <BankStatementSection clientName={client?.companyName || client?.name || ''} />

  // ── Files section — direct render (also exists as a tab) ────────────────────
  if (activeSection === 'files') {
    return (
      <div className="p-4 sm:p-6">
        <FilesTab clientId={clientId} clientName={client?.companyName || ''} />
      </div>
    )
  }

  // ── Client Details section — full tabbed view ────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
      <Tabs defaultValue="details" className="w-full">
        <div className="w-full overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
          <TabsList className="flex w-max min-w-full h-auto p-0 gap-0 bg-transparent border-b border-border rounded-none">
            {[
              { value: 'details',   label: 'Client Details' },
              { value: 'directors', label: 'Directors List' },
              { value: 'login',     label: 'Client Login' },
              { value: 'files',     label: 'Files' },
              { value: 'settings',  label: 'Settings' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative flex-1 min-w-fit whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="details" className="mt-2 -mx-4 sm:mx-0 px-4 sm:px-0">
          <ClientDetailsTab clientId={clientId} onClientUpdated={() => setRefreshKey((k) => k + 1)} />
        </TabsContent>

        <TabsContent value="directors" className="mt-2 -mx-4 sm:mx-0 px-4 sm:px-0">
          <DirectorsTab
            directors={directors}
            onRemoveDirector={handleRemoveDirector}
            onAddDirector={handleAddDirector}
            onEditDirector={handleEditDirector}
            clientName={client?.companyName}
          />
        </TabsContent>

        <TabsContent value="login" className="mt-2 -mx-4 sm:mx-0 px-4 sm:px-0 space-y-4">
          <ClientLoginTab
            clientName={client?.name || ''}
            clientDetails={{
              name: client?.name ?? '',
              email: client?.email ?? '',
              phone: client?.phone ?? '',
              company: client?.companyName ?? '',
            }}
            initialLogins={initialLogins}
            suggestedEmails={suggestedEmails}
            organizationId={clientOrganizationId}
            onRemoveLogin={client ? async () => {
              await removeClientLogin(client.id)
              setRefreshKey((k) => k + 1)
            } : undefined}
            onSave={async (logins) => {
              if (!client) throw new Error('Client not loaded')
              try {
                const latest = logins[logins.length - 1]
                const response = await updateClientLogin(client.id, latest.email, '')
                const passwordValue = response?.generatedPassword?.trim() ?? ''
                setInitialLogins([{ email: latest.email, password: passwordValue }])
              } catch (error) {
                console.error('Error in onSave callback:', error)
                throw error
              }
            }}
          />
          <EmailSetup clientId={clientId} clientName={client?.companyName || ''} />
        </TabsContent>

        <TabsContent value="files" className="mt-2 -mx-4 sm:mx-0 px-4 sm:px-0">
          <FilesTab clientId={clientId} clientName={client?.companyName || ''} />
        </TabsContent>

        <TabsContent value="settings" className="mt-2 -mx-4 sm:mx-0 px-4 sm:px-0">
          <SettingsTab
            clientId={clientId}
            clientName={client?.name || client?.companyName || ''}
            onDeleted={() => router.push('/client-management')}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Placeholder sections ─────────────────────────────────────────────────────

function PlaceholderSection({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 text-muted-foreground/40">{icon}</div>
      <h2 className="text-lg font-semibold text-foreground mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
    </div>
  )
}

function TdsSection({ clientName }: { clientName: string }) {
  return (
    <PlaceholderSection
      title="TDS"
      description={`TDS filings and deductions for ${clientName || 'this client'} will appear here.`}
      icon={
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      }
    />
  )
}

function GstSection({ clientName }: { clientName: string }) {
  return (
    <PlaceholderSection
      title="GST"
      description={`GST returns and compliance records for ${clientName || 'this client'} will appear here.`}
      icon={
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      }
    />
  )
}

function BankStatementSection({ clientName }: { clientName: string }) {
  return (
    <PlaceholderSection
      title="Bank Statement"
      description={`Bank statements and transaction history for ${clientName || 'this client'} will appear here.`}
      icon={
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      }
    />
  )
}
