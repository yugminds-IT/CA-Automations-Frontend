'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Edit, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ClientOnboardForm } from '../client_onboardform'
import { transformApiClientToFormValues } from '../client_tab'
import type { Client } from '../client_tab'
import { getClientById, updateClient } from '@/lib/api/clients'
import { listBusinessTypes } from '@/lib/api/business-types'
import { listServices } from '@/lib/api/services'
import { getClientStatusEnum } from '@/lib/api/clients'
import { getUserData, createBusinessType } from '@/lib/api/index'
import { ApiError } from '@/lib/api/client'
import type { Client as ApiClient, Service } from '@/lib/api/types'

interface ClientDetailsTabProps {
  clientId: string
  onClientUpdated?: () => void
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-sm">{value || '—'}</p>
    </div>
  )
}

function transformRawToClient(raw: any): Client {
  const serviceNames = Array.isArray(raw.services)
    ? (raw.services as { name?: string }[]).map((s) => s.name).filter((n): n is string => !!n)
    : []
  const bt = raw.businessType ?? raw.business_type
  const businessType =
    typeof bt === 'object' && bt !== null && 'name' in bt
      ? (bt as { name: string }).name
      : typeof bt === 'string' ? bt : undefined

  return {
    id: raw.id,
    name: raw.name ?? raw.client_name ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? raw.phone_number ?? null,
    companyName: raw.companyName ?? raw.company_name ?? '',
    directories: serviceNames.length > 0 ? serviceNames : '—',
    followUpDate: raw.followupDate ?? raw.follow_date ?? null,
    onboardDate: raw.onboardDate ?? raw.onboard_date ?? null,
    lastContactedDate: null,
    status: raw.status ?? undefined,
    businessType,
    panNumber: raw.panNumber ?? raw.pan_number ?? undefined,
    gstNumber: raw.gstNumber ?? raw.gst_number ?? undefined,
    address: raw.address ?? undefined,
    city: raw.city ?? undefined,
    state: raw.state ?? undefined,
    country: raw.country ?? undefined,
    pincode: raw.pincode ?? raw.pin_code ?? undefined,
    notes: raw.additionalNotes ?? raw.additional_notes ?? undefined,
  }
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
  } catch {
    return '—'
  }
}

export function ClientDetailsTab({ clientId, onClientUpdated }: ClientDetailsTabProps) {
  const { toast } = useToast()

  const [client, setClient] = useState<Client | null>(null)
  const [rawApiClient, setRawApiClient] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const [services, setServices] = useState<string[]>([])
  const [servicesWithIds, setServicesWithIds] = useState<{ id: number; name: string }[]>([])
  const [businessTypes, setBusinessTypes] = useState<string[]>([])
  const [businessTypesWithIds, setBusinessTypesWithIds] = useState<{ id: number; name: string }[]>([])
  const [clientStatuses, setClientStatuses] = useState<string[]>([])

  // Fetch client data
  useEffect(() => {
    if (!clientId) return
    setIsLoading(true)
    getClientById(clientId)
      .then((raw) => {
        setRawApiClient(raw)
        setClient(transformRawToClient(raw))
      })
      .catch((err) => {
        console.error('ClientDetailsTab: failed to load client', err)
        toast({ title: 'Error', description: 'Failed to load client details.', variant: 'destructive' })
      })
      .finally(() => setIsLoading(false))
  }, [clientId, toast])

  // Fetch form options
  useEffect(() => {
    Promise.all([getClientStatusEnum(), listBusinessTypes(), listServices()])
      .then(([statusRes, btList, svcList]) => {
        const bt = Array.isArray(btList) ? btList : []
        const svc = Array.isArray(svcList) ? svcList : []
        setClientStatuses(statusRes.values || [])
        setBusinessTypes(bt.map((t: { id: number; name: string }) => t.name))
        setBusinessTypesWithIds(bt)
        setServices(svc.map((s: { id: number; name: string }) => s.name))
        setServicesWithIds(svc)
      })
      .catch((err) => console.error('ClientDetailsTab: failed to load form options', err))
  }, [])

  const handleSave = async (clientData: Omit<Client, 'id' | 'lastContactedDate'> & {
    panNumber?: string
    gstNumber?: string
    businessType?: string
    address?: string
    city?: string
    state?: string
    country?: string
    pincode?: string
    notes?: string
    directors?: Array<{
      name: string
      email?: string
      phone?: string
      designation?: string
      din?: string
      pan?: string
      aadhar?: string
    }>
  }) => {
    if (!client) return
    try {
      let resolvedBusinessTypeId: number | undefined = undefined
      if (clientData.businessType?.trim()) {
        const name = clientData.businessType.trim()
        const existing = businessTypesWithIds.find(
          (t) => t.name.trim().toLowerCase() === name.toLowerCase()
        )
        if (existing) {
          resolvedBusinessTypeId = existing.id
        } else {
          const user = getUserData()
          const orgId = user?.organizationId != null ? Number(user.organizationId) : undefined
          if (orgId != null) {
            try {
              const created = await createBusinessType({ name, organizationId: orgId })
              resolvedBusinessTypeId = created.id
            } catch { /* ignore */ }
          }
        }
      }

      const apiServices: Service[] = servicesWithIds.map((s) => ({ id: s.id, name: s.name } as Service))
      const serviceIds = Array.isArray(clientData.directories)
        ? clientData.directories
            .map((dir) => apiServices.find((s) => s.name === dir)?.id)
            .filter((id): id is number => id !== undefined)
        : []

      const followupDate = clientData.followUpDate
        ? typeof clientData.followUpDate === 'string'
          ? clientData.followUpDate
          : new Date(clientData.followUpDate).toISOString().split('T')[0]
        : undefined
      const onboardDate =
        typeof clientData.onboardDate === 'string'
          ? clientData.onboardDate
          : clientData.onboardDate
            ? new Date(clientData.onboardDate).toISOString().split('T')[0]
            : undefined

      const updatedRaw = await updateClient(client.id, {
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone || undefined,
        companyName: clientData.companyName,
        businessTypeId: resolvedBusinessTypeId,
        panNumber: clientData.panNumber,
        gstNumber: clientData.gstNumber,
        status: clientData.status as any,
        address: clientData.address,
        city: clientData.city,
        state: clientData.state,
        country: clientData.country,
        pincode: clientData.pincode,
        serviceIds,
        onboardDate,
        followupDate,
        additionalNotes: clientData.notes,
        directors: (clientData.directors ?? [])
          .filter((d) => d?.name?.trim())
          .map((d) => ({
            directorName: d.name.trim(),
            ...(d.email?.trim() ? { email: d.email.trim() } : {}),
            ...(d.phone?.trim() ? { phone: d.phone.trim() } : {}),
            ...(d.designation?.trim() ? { designation: d.designation.trim() } : {}),
            ...(d.din?.trim() ? { din: d.din.trim() } : {}),
            ...(d.pan?.trim() ? { pan: d.pan.trim() } : {}),
            ...(d.aadhar?.trim() ? { aadharNumber: d.aadhar.trim() } : {}),
          })),
      })

      setRawApiClient(updatedRaw)
      setClient(transformRawToClient(updatedRaw))
      toast({ title: 'Success', description: 'Client updated successfully', variant: 'success' })
      setEditOpen(false)
      onClientUpdated?.()
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Failed to update client.'
      toast({ title: 'Error', description: String(msg), variant: 'destructive' })
      throw err
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground text-sm">Loading client details...</span>
        </CardContent>
      </Card>
    )
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Failed to load client details.
        </CardContent>
      </Card>
    )
  }

  const servicesList = Array.isArray(client.directories)
    ? client.directories.join(', ') || '—'
    : client.directories || '—'

  if (editOpen && rawApiClient) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">Update Client</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Update the client details in your system</p>
            </div>
          </div>
          <ClientOnboardForm
            key={`edit-details-${client.id}`}
            onSubmit={handleSave}
            onCancel={() => setEditOpen(false)}
            isEditing
            defaultValues={transformApiClientToFormValues(rawApiClient as ApiClient & Record<string, unknown>)}
            services={services}
            businessTypes={businessTypes}
            clientStatuses={clientStatuses}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Client Details</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            <DetailRow label="Client Name" value={client.name} />
            <DetailRow label="Company" value={client.companyName} />
            <DetailRow label="Email" value={client.email} />
            <DetailRow label="Phone" value={client.phone} />
            <DetailRow label="Category" value={client.businessType} />
            <DetailRow label="Status" value={client.status} />
            <DetailRow label="Follow Up Date" value={formatDate(client.followUpDate)} />
            <DetailRow label="Onboard Date" value={formatDate(client.onboardDate)} />
            <DetailRow label="PAN Number" value={client.panNumber} />
            <DetailRow label="GST Number" value={client.gstNumber} />
            <DetailRow label="Services" value={servicesList} />
            {(client.address || client.city || client.state) && (
              <DetailRow
                label="Address"
                value={[client.address, client.city, client.state, client.country, client.pincode]
                  .filter(Boolean)
                  .join(', ')}
              />
            )}
            {client.notes && (
              <div className="col-span-2 sm:col-span-3 lg:col-span-4 space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">Notes</p>
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </>
  )
}
