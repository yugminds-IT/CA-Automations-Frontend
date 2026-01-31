'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, Edit, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  SortableTableHead,
  TableHeader,
  TableRow,
  TablePagination,
  type SortDirection,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { ClientOnboardForm } from './client_onboardform'
import {
  onboardClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getServices,
  addDirector,
} from '@/lib/api/clients'
import { getUserData, createBusinessType } from '@/lib/api/index'
import { ApiError } from '@/lib/api/client'
import type {
  Client as ApiClient,
  OnboardClientRequest,
  UpdateClientRequest,
  Service,
  Director,
} from '@/lib/api/types'

// Client interface based on requirements
export interface Client {
  id: string | number
  name: string
  email: string
  phone: string | null
  companyName: string
  directories: string[] | string
  followUpDate: string | Date | null
  onboardDate: string | Date | null
  lastContactedDate: string | Date | null
  status?: string
  // Additional fields for full client data
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
}

interface ClientTabProps {
  clients?: Client[]
  isLoading?: boolean
  onClientAdded?: (client: Omit<Client, 'id' | 'lastContactedDate'>) => void | Promise<void>
  onClientUpdated?: (client: Client) => void | Promise<void>
  onClientDeleted?: (clientId: string | number) => void | Promise<void>
  isDialogOpen?: boolean
  setIsDialogOpen?: (open: boolean) => void
  services?: string[]
  businessTypes?: string[]
  /** Full business types with ids for resolving/creating (e.g. for "Other") so businessTypeId is sent to API */
  businessTypesWithIds?: { id: number; name: string }[]
  /** Full services with ids so serviceIds are sent in onboard/update payload; if not provided, ClientTab fetches when useApi */
  servicesWithIds?: { id: number; name: string }[]
  clientStatuses?: string[]
  // If true, component will fetch clients from API instead of using props
  useApi?: boolean
  // Optional search and filter params (applied client-side when useApi is true)
  searchQuery?: string
  statusFilter?: string
  // Called when the filtered client list changes (for parent Export button)
  onFilteredClientsChange?: (clients: Client[]) => void
}

// Filter clients by search query and status (client-side; backend only supports organizationId)
function filterClients(
  clientsList: Client[],
  query: string,
  status: string
): Client[] {
  let filtered = clientsList
  if (status !== 'all') {
    filtered = filtered.filter(
      (c) => (c.status ?? '').toLowerCase() === status.toLowerCase()
    )
  }
  if (query.trim()) {
    const lowerQuery = query.toLowerCase()
    filtered = filtered.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(lowerQuery) ||
        (c.email ?? '').toLowerCase().includes(lowerQuery) ||
        (c.phone ?? '').toLowerCase().includes(lowerQuery) ||
        (c.companyName ?? '').toLowerCase().includes(lowerQuery) ||
        (Array.isArray(c.directories)
          ? c.directories.some((d) => String(d).toLowerCase().includes(lowerQuery))
          : String(c.directories ?? '').toLowerCase().includes(lowerQuery))
    )
  }
  return filtered
}

// Format date helper function
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return '—'
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(dateObj)
  } catch {
    return '—'
  }
}

// Format directories helper
function formatDirectories(directories: string[] | string | null | undefined): string {
  if (!directories) return '—'
  
  if (Array.isArray(directories)) {
    return directories.length > 0 ? directories.join(', ') : '—'
  }
  
  return directories
}

// Transform API Client to component Client format
// Backend returns camelCase (name, companyName, followupDate, onboardDate, phone) and businessType relation { id, name }
function transformApiClientToComponent(apiClient: ApiClient & Record<string, unknown>): Client {
  // Extract service names from services array
  const serviceNames = apiClient.services?.map((s: { name?: string }) => s.name) || []
  // Extract business type name (API may return relation object { id, name } or null)
  const bt = (apiClient as any).businessType ?? (apiClient as any).business_type
  const businessType =
    typeof bt === 'object' && bt !== null && 'name' in bt
      ? (bt as { name: string }).name
      : typeof bt === 'string'
        ? bt
        : undefined

  return {
    id: apiClient.id,
    name: (apiClient as any).name ?? apiClient.client_name ?? '',
    email: apiClient.email ?? '',
    phone: (apiClient as any).phone ?? apiClient.phone_number ?? null,
    companyName: (apiClient as any).companyName ?? apiClient.company_name ?? '',
    directories: serviceNames.length > 0 ? serviceNames : '—',
    followUpDate: (apiClient as any).followupDate ?? apiClient.follow_date ?? null,
    onboardDate: (apiClient as any).onboardDate ?? apiClient.onboard_date ?? null,
    lastContactedDate: null, // API doesn't provide this field
    status: apiClient.status ?? undefined,
    businessType,
  }
}

// Transform component Client data to API OnboardClientRequest format (camelCase for backend)
function transformComponentToOnboardRequest(
  clientData: Omit<Client, 'id' | 'lastContactedDate'>,
  services: Service[],
  organizationId?: number,
  businessTypeId?: number | null
): OnboardClientRequest {
  const serviceIds = Array.isArray(clientData.directories)
    ? clientData.directories
        .map(dir => {
          const service = services.find(s => s.name === dir)
          return service?.id
        })
        .filter((id): id is number => id !== undefined)
    : []

  const onboardDate =
    typeof clientData.onboardDate === 'string'
      ? clientData.onboardDate
      : clientData.onboardDate
        ? new Date(clientData.onboardDate).toISOString().split('T')[0]
        : undefined
  const followupDate = clientData.followUpDate
    ? typeof clientData.followUpDate === 'string'
      ? clientData.followUpDate
      : new Date(clientData.followUpDate).toISOString().split('T')[0]
    : undefined

  const directors: OnboardClientRequest['directors'] =
    (clientData.directors ?? [])
      .filter((d) => d?.name?.trim())
      .map((d) => ({
        directorName: d!.name!.trim(),
        ...(d!.email?.trim() ? { email: d!.email.trim() } : {}),
        ...(d!.phone?.trim() ? { phone: d!.phone.trim() } : {}),
        ...(d!.designation?.trim() ? { designation: d!.designation.trim() } : {}),
        ...(d!.din?.trim() ? { din: d!.din.trim() } : {}),
        ...(d!.pan?.trim() ? { pan: d!.pan.trim() } : {}),
        ...(d!.aadhar?.trim() ? { aadharNumber: d!.aadhar.trim() } : {}),
      }))

  return {
    name: clientData.name,
    email: clientData.email,
    phone: clientData.phone || undefined,
    companyName: clientData.companyName,
    businessTypeId: businessTypeId ?? undefined,
    panNumber: clientData.panNumber,
    gstNumber: clientData.gstNumber,
    status: (clientData.status as OnboardClientRequest['status']) || 'active',
    address: clientData.address,
    city: clientData.city,
    state: clientData.state,
    country: clientData.country,
    pincode: clientData.pincode,
    serviceIds: serviceIds.length > 0 ? serviceIds : undefined,
    onboardDate,
    followupDate,
    additionalNotes: clientData.notes,
    organizationId,
    ...(directors.length > 0 ? { directors } : {}),
  }
}

// Transform API Client to form defaultValues format
// Backend returns camelCase (companyName, followupDate, onboardDate, additionalNotes, etc.)
function transformApiClientToFormValues(apiClient: ApiClient & Record<string, unknown>): {
  name: string
  email: string
  phone: string
  companyName: string
  panNumber?: string
  gstNumber?: string
  businessType: string
  customBusinessType?: string
  status: string
  addressLine1: string
  city: string
  state: string
  country: string
  pincode: string
  directories: string[]
  onboardDate: Date
  followUpDate: Date | null
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
} {
  const c = apiClient as any
  // Extract service names
  const serviceNames = apiClient.services?.map((s: { name?: string }) => s.name) || []
  
  // Parse address - API returns address as a single string, form expects addressLine1
  const addressLine1 = c.address ?? apiClient.address ?? ''
  
  // Handle business type - API may return relation object { id, name } or string
  const bt = c.businessType ?? apiClient.business_type
  const businessType = typeof bt === 'object' && bt !== null && 'name' in bt
    ? (bt as { name: string }).name
    : typeof bt === 'string'
      ? bt
      : ''
  
  // Transform directors - support camelCase (name, phone) or snake_case (director_name, phone_number)
  const directors = (apiClient.directors ?? []).map((dir: any) => ({
    name: dir.name ?? dir.director_name ?? '',
    email: dir.email ?? '',
    phone: dir.phone ?? dir.phone_number ?? '',
    designation: dir.designation ?? '',
    din: dir.din ?? '',
    pan: dir.pan ?? '',
    aadhar: dir.aadhaar ?? dir.aadhar ?? '',
  }))

  return {
    name: c.name ?? apiClient.client_name ?? '',
    email: apiClient.email ?? '',
    phone: c.phone ?? apiClient.phone_number ?? '',
    companyName: c.companyName ?? apiClient.company_name ?? '',
    panNumber: c.panNumber ?? apiClient.pan_number ?? undefined,
    gstNumber: c.gstNumber ?? apiClient.gst_number ?? undefined,
    businessType: businessType,
    customBusinessType: undefined, // Will be set if businessType is "Other"
    status: c.status ?? apiClient.status ?? 'active',
    addressLine1: addressLine1,
    city: c.city ?? apiClient.city ?? '',
    state: c.state ?? apiClient.state ?? '',
    country: c.country ?? apiClient.country ?? '',
    pincode: c.pincode ?? apiClient.pin_code ?? '',
    directories: serviceNames,
    onboardDate: (c.onboardDate ?? apiClient.onboard_date) ? new Date(c.onboardDate ?? apiClient.onboard_date) : new Date(),
    followUpDate: (c.followupDate ?? apiClient.follow_date) ? new Date(c.followupDate ?? apiClient.follow_date) : null,
    notes: c.additionalNotes ?? apiClient.additional_notes ?? undefined,
    directors: directors,
  }
}

// Transform component Client data to API UpdateClientRequest format (camelCase for backend)
function transformComponentToUpdateRequest(
  clientData: Omit<Client, 'id' | 'lastContactedDate'>,
  services: Service[],
  businessTypeId?: number | null
): UpdateClientRequest {
  const serviceIds = Array.isArray(clientData.directories)
    ? clientData.directories
        .map(dir => {
          const service = services.find(s => s.name === dir)
          return service?.id
        })
        .filter((id): id is number => id !== undefined)
    : []

  const onboardDate =
    typeof clientData.onboardDate === 'string'
      ? clientData.onboardDate
      : clientData.onboardDate
        ? new Date(clientData.onboardDate).toISOString().split('T')[0]
        : undefined
  const followupDate = clientData.followUpDate
    ? typeof clientData.followUpDate === 'string'
      ? clientData.followUpDate
      : new Date(clientData.followUpDate).toISOString().split('T')[0]
    : undefined

  const directors: UpdateClientRequest['directors'] =
    (clientData.directors ?? [])
      .filter((d) => d?.name?.trim())
      .map((d) => ({
        directorName: d!.name!.trim(),
        ...(d!.email?.trim() ? { email: d!.email.trim() } : {}),
        ...(d!.phone?.trim() ? { phone: d!.phone.trim() } : {}),
        ...(d!.designation?.trim() ? { designation: d!.designation.trim() } : {}),
        ...(d!.din?.trim() ? { din: d!.din.trim() } : {}),
        ...(d!.pan?.trim() ? { pan: d!.pan.trim() } : {}),
        ...(d!.aadhar?.trim() ? { aadharNumber: d!.aadhar.trim() } : {}),
      }))

  const result: UpdateClientRequest = {
    name: clientData.name,
    email: clientData.email,
    phone: clientData.phone || undefined,
    companyName: clientData.companyName,
    businessTypeId: businessTypeId ?? undefined,
    panNumber: clientData.panNumber,
    gstNumber: clientData.gstNumber,
    status: clientData.status as UpdateClientRequest['status'],
    address: clientData.address,
    city: clientData.city,
    state: clientData.state,
    country: clientData.country,
    pincode: clientData.pincode,
    // Include serviceIds even when empty so update can clear services
    serviceIds,
    onboardDate,
    followupDate,
    additionalNotes: clientData.notes,
    directors,
  }
  return result
}

type SortField = 'name' | 'email' | 'phone' | 'companyName' | 'followUpDate' | 'onboardDate' | 'lastContactedDate' | 'status' | null

export function ClientTab({ 
  clients: externalClients = [], 
  isLoading: externalIsLoading = false, 
  onClientAdded, 
  onClientUpdated, 
  onClientDeleted, 
  isDialogOpen: externalDialogOpen, 
  setIsDialogOpen: setExternalDialogOpen,
  services: externalServices = [],
  businessTypes = [],
  businessTypesWithIds = [],
  servicesWithIds = [],
  clientStatuses = [],
  useApi = false,
  searchQuery = '',
  statusFilter,
  onFilteredClientsChange,
}: ClientTabProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [internalDialogOpen, setInternalDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // API state
  const [apiClients, setApiClients] = useState<Client[]>([])
  const [apiServices, setApiServices] = useState<Service[]>([])
  const [isLoadingApi, setIsLoadingApi] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingApiClient, setEditingApiClient] = useState<ApiClient | null>(null)
  const [isLoadingEditData, setIsLoadingEditData] = useState(false)
  
  // Use external dialog state if provided, otherwise use internal state
  const isDialogOpen = externalDialogOpen !== undefined ? externalDialogOpen : internalDialogOpen
  const setIsDialogOpen = setExternalDialogOpen || setInternalDialogOpen

  const fetchClients = React.useCallback(async () => {
    setIsLoadingApi(true)
    setError(null)
    try {
      // Backend only supports organizationId; search/status are applied client-side
      const response = await getClients()
      console.log('API response:', response)
      const transformedClients = response.clients.map(transformApiClientToComponent)
      console.log('Transformed clients:', transformedClients)
      setApiClients(transformedClients)
    } catch (err: unknown) {
      console.error('Error fetching clients:', err)
      const errorMessage = err instanceof ApiError 
        ? err.detail 
        : 'Failed to fetch clients. Please try again.'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoadingApi(false)
    }
  }, [searchQuery, statusFilter, toast])

  const fetchServices = React.useCallback(async () => {
    try {
      const response = await getServices()
      setApiServices(response.services)
    } catch (err: unknown) {
      console.error('Error fetching services:', err)
      // Don't show error toast for services, just log it
    }
  }, [])

  // Fetch clients from API if useApi is true
  useEffect(() => {
    if (useApi) {
      console.log('useApi is true, fetching clients')
      fetchClients()
      // Use servicesWithIds (real IDs) when provided; otherwise fetch so payload has real serviceIds
      if (servicesWithIds.length > 0) {
        setApiServices(servicesWithIds.map((s) => ({ id: s.id, name: s.name } as Service)))
      } else {
        fetchServices()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useApi, fetchClients, servicesWithIds.length])
  
  // Update apiServices when servicesWithIds changes (so payload gets real IDs)
  useEffect(() => {
    if (useApi && servicesWithIds.length > 0) {
      setApiServices(servicesWithIds.map((s) => ({ id: s.id, name: s.name } as Service)))
    }
  }, [useApi, servicesWithIds])

  // Determine which clients and loading state to use
  const clients = useApi ? apiClients : externalClients
  const isLoading = useApi ? isLoadingApi : externalIsLoading
  const services = useApi 
    ? apiServices.map((s: Service) => s.name) 
    : externalServices

  // Debug logging
  React.useEffect(() => {
    if (useApi) {
      console.log('ClientTab Debug:', {
        useApi,
        clientsCount: clients.length,
        apiClientsCount: apiClients.length,
        isLoading,
        error,
      })
    }
  }, [useApi, clients.length, apiClients.length, isLoading, error])

  const handleRowClick = (client: Client) => {
    // Navigate to client details page
    router.push(`/client-management/${client.id}`)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort direction
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  const sortClients = (clientsToSort: Client[]): Client[] => {
    if (!sortField || !sortDirection) return clientsToSort

    return [...clientsToSort].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'email':
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case 'phone':
          aValue = a.phone || ''
          bValue = b.phone || ''
          break
        case 'companyName':
          aValue = a.companyName.toLowerCase()
          bValue = b.companyName.toLowerCase()
          break
        case 'followUpDate':
          aValue = a.followUpDate ? new Date(a.followUpDate).getTime() : 0
          bValue = b.followUpDate ? new Date(b.followUpDate).getTime() : 0
          break
        case 'onboardDate':
          aValue = a.onboardDate ? new Date(a.onboardDate).getTime() : 0
          bValue = b.onboardDate ? new Date(b.onboardDate).getTime() : 0
          break
        case 'lastContactedDate':
          aValue = a.lastContactedDate ? new Date(a.lastContactedDate).getTime() : 0
          bValue = b.lastContactedDate ? new Date(b.lastContactedDate).getTime() : 0
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // Apply search and status filter client-side (backend does not support these params)
  const filteredClients = React.useMemo(
    () => filterClients(clients, searchQuery, statusFilter ?? 'all'),
    [clients, searchQuery, statusFilter]
  )
  const sortedClients = sortClients(filteredClients)

  // Notify parent of filtered list for Export button
  React.useEffect(() => {
    onFilteredClientsChange?.(filteredClients)
  }, [filteredClients, onFilteredClientsChange])
  
  // Pagination
  const totalItems = sortedClients.length
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const displayClients = sortedClients.slice(startIndex, endIndex)

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading clients...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && useApi) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-destructive mb-2">Error loading clients</div>
            <div className="text-muted-foreground text-sm">{error}</div>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => fetchClients()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleClientSubmit = async (clientData: Omit<Client, 'id' | 'lastContactedDate'> & {
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
    try {
      // Resolve businessTypeId from name so "Other" / custom types are stored (backend expects businessTypeId)
      let resolvedBusinessTypeId: number | undefined | null = undefined
      if (useApi && clientData.businessType?.trim()) {
        const name = clientData.businessType.trim()
        const existing = businessTypesWithIds.find(
          (t) => t.name.trim().toLowerCase() === name.toLowerCase()
        )
        if (existing) {
          resolvedBusinessTypeId = existing.id
        } else {
          const user = getUserData()
          const organizationId = user?.organizationId != null ? Number(user.organizationId) : undefined
          if (organizationId != null) {
            try {
              const created = await createBusinessType({ name, organizationId })
              resolvedBusinessTypeId = created.id
            } catch (createErr) {
              console.warn('Failed to create custom business type, saving client without businessTypeId:', createErr)
            }
          }
        }
      }

      if (editingClient) {
        // Update existing client (PATCH /clients/:id with camelCase)
        if (useApi) {
          const updateRequest = transformComponentToUpdateRequest(
            clientData,
            useApi ? apiServices : [],
            resolvedBusinessTypeId
          )
          const updatedApiClient = await updateClient(editingClient.id, updateRequest)
          const updatedClient = transformApiClientToComponent(updatedApiClient)
          setApiClients(prev =>
            prev.map(c => (c.id === editingClient.id ? updatedClient : c))
          )
          await fetchClients()
          toast({
            title: 'Success',
            description: 'Client updated successfully',
            variant: 'success',
          })
        } else if (onClientUpdated) {
          await onClientUpdated({
            ...clientData,
            id: editingClient.id,
            lastContactedDate: editingClient.lastContactedDate,
          })
        }
        setEditingClient(null)
      } else {
        // Create new client via onboard (POST /clients/onboard) then add directors
        if (useApi) {
          const user = getUserData()
          const organizationId = user?.organizationId != null ? Number(user.organizationId) : undefined
          const onboardRequest = transformComponentToOnboardRequest(
            clientData,
            useApi ? apiServices : [],
            organizationId,
            resolvedBusinessTypeId ?? undefined
          )
          const newApiClient = await onboardClient(onboardRequest)
          const newClient = transformApiClientToComponent(newApiClient)
          // Directors are created by backend from onboard payload (onboardRequest.directors)
          setApiClients(prev => [newClient, ...prev])
          await fetchClients()
          toast({
            title: 'Success',
            description: 'Client created successfully',
            variant: 'success',
          })
        } else if (onClientAdded) {
          await onClientAdded(clientData)
        }
      }
      setIsDialogOpen(false)
    } catch (err: unknown) {
      console.error('Error saving client:', err)
      const errorMessage = err instanceof ApiError 
        ? err.detail 
        : 'Failed to save client. Please try again.'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw err // Re-throw to let form handle loading state
    }
  }

  const handleEdit = async (client: Client) => {
    setEditingClient(client)
    setEditingApiClient(null)
    setIsDialogOpen(true)
    if (useApi) {
      setIsLoadingEditData(true)
      try {
        const fullClientData = await getClientById(client.id)
        setEditingApiClient(fullClientData)
      } catch (err: unknown) {
        console.error('Error fetching client data for editing:', err)
        const errorMessage = err instanceof ApiError
          ? err.detail
          : 'Failed to load client data. Please try again.'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setIsLoadingEditData(false)
      }
    }
  }

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Are you sure you want to delete ${client.name}?`)) {
      return
    }

    try {
      if (useApi) {
        // Use API to delete
        await deleteClient(client.id)
        
        // Remove from local state
        setApiClients(prev => prev.filter(c => c.id !== client.id))
        
        // Refetch to ensure we have latest data
        await fetchClients()
        
        toast({
          title: 'Success',
          description: 'Client deleted successfully',
          variant: 'success',
        })
      } else if (onClientDeleted) {
        // Use callback
        await onClientDeleted(client.id)
      }
    } catch (err: unknown) {
      console.error('Error deleting client:', err)
      const errorMessage = err instanceof ApiError 
        ? err.detail 
        : 'Failed to delete client. Please try again.'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          {displayClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clients found
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead 
                      className="min-w-[120px]"
                      sortable
                      sortDirection={sortField === 'name' ? sortDirection : null}
                      onSort={() => handleSort('name')}
                    >
                      Client Name
                    </SortableTableHead>
                    <SortableTableHead 
                      className="min-w-[150px]"
                      sortable
                      sortDirection={sortField === 'companyName' ? sortDirection : null}
                      onSort={() => handleSort('companyName')}
                    >
                      Company Name
                    </SortableTableHead>
                    <TableHead className="min-w-[120px]">Business Type</TableHead>
                    <SortableTableHead 
                      className="min-w-[180px]"
                      sortable
                      sortDirection={sortField === 'email' ? sortDirection : null}
                      onSort={() => handleSort('email')}
                    >
                      Email
                    </SortableTableHead>
                    <SortableTableHead 
                      className="min-w-[140px]"
                      sortable
                      sortDirection={sortField === 'phone' ? sortDirection : null}
                      onSort={() => handleSort('phone')}
                    >
                      Phone No
                    </SortableTableHead>
                    <SortableTableHead 
                      className="min-w-[120px]"
                      sortable
                      sortDirection={sortField === 'followUpDate' ? sortDirection : null}
                      onSort={() => handleSort('followUpDate')}
                    >
                      Follow-up Date
                    </SortableTableHead>
                    <SortableTableHead 
                      className="min-w-[130px]"
                      sortable
                      sortDirection={sortField === 'lastContactedDate' ? sortDirection : null}
                      onSort={() => handleSort('lastContactedDate')}
                    >
                      Last Contacted
                    </SortableTableHead>
                    <TableHead className="min-w-[150px]">Services</TableHead>
                    <SortableTableHead 
                      className="min-w-[100px]"
                      sortable
                      sortDirection={sortField === 'status' ? sortDirection : null}
                      onSort={() => handleSort('status')}
                    >
                      Status
                    </SortableTableHead>
                    <SortableTableHead 
                      className="min-w-[120px]"
                      sortable
                      sortDirection={sortField === 'onboardDate' ? sortDirection : null}
                      onSort={() => handleSort('onboardDate')}
                    >
                      Onboard Date
                    </SortableTableHead>
                    <TableHead className="min-w-[100px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell 
                        className="font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(client)}
                      >
                        <span className="truncate block max-w-[120px]" title={client.name}>
                          {client.name}
                        </span>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(client)}
                      >
                        <span className="truncate block max-w-[150px]" title={client.companyName}>
                          {client.companyName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="truncate block max-w-[120px]" title={client.businessType ?? ''}>
                          {client.businessType ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="truncate block max-w-[180px]" title={client.email}>
                          {client.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        {client.phone || '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{formatDate(client.followUpDate)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{formatDate(client.lastContactedDate)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const dirs = formatDirectories(client.directories)
                            if (dirs === '—') return <span className="text-muted-foreground">—</span>
                            
                            const dirArray = Array.isArray(client.directories) 
                              ? client.directories 
                              : [client.directories]
                            
                            return dirArray.slice(0, 2).map((dir, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {dir}
                              </Badge>
                            ))
                          })()}
                          {Array.isArray(client.directories) && client.directories.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{client.directories.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.status ? (
                          <span
                            className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: client.status === 'Active' || client.status?.toLowerCase() === 'active' 
                                ? '#22c55e' // green-500
                                : client.status === 'Inactive' || client.status?.toLowerCase() === 'inactive'
                                ? '#000000' // black
                                : undefined,
                              color: (client.status === 'Active' || client.status?.toLowerCase() === 'active' || 
                                      client.status === 'Inactive' || client.status?.toLowerCase() === 'inactive')
                                ? '#ffffff' // white
                                : undefined,
                              borderColor: client.status === 'Active' || client.status?.toLowerCase() === 'active'
                                ? '#22c55e' // green-500
                                : client.status === 'Inactive' || client.status?.toLowerCase() === 'inactive'
                                ? '#000000' // black
                                : undefined,
                            }}
                          >
                            {client.status}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{formatDate(client.onboardDate)}</span>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleEdit(client)
                            }}
                            className="h-8 w-8 p-0"
                            title="Edit client"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(client)
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete client"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        
        {/* Pagination */}
        {totalItems > 0 && (
          <TablePagination
            totalItems={totalItems}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </CardContent>
    </Card>

    <Dialog 
      open={isDialogOpen} 
      onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) {
          setEditingClient(null)
          setEditingApiClient(null)
        }
      }}
    >
      <DialogContent className="max-w-[98vw] lg:max-w-7xl xl:max-w-[90vw] w-[98vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingClient ? 'Update Client' : 'Onboard New Client'}</DialogTitle>
          <DialogDescription>
            {editingClient 
              ? 'Update the client details in your system'
              : 'Fill in the client details to add them to your system'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="pr-2">
          {isLoadingEditData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading client data...</div>
            </div>
          ) : (
            <ClientOnboardForm
              key={editingClient ? `edit-${editingClient.id}` : 'create'}
              onSubmit={handleClientSubmit}
              onCancel={() => {
                setIsDialogOpen(false)
                setEditingClient(null)
                setEditingApiClient(null)
              }}
              isEditing={!!editingClient}
              defaultValues={editingClient ? (
                // If we have full API client data, use it (more complete)
                editingApiClient 
                  ? transformApiClientToFormValues(editingApiClient)
                  : {
                      // Fallback to basic client data if API fetch failed
                      name: editingClient.name,
                      email: editingClient.email,
                      phone: editingClient.phone || '',
                      companyName: editingClient.companyName,
                      directories: Array.isArray(editingClient.directories) 
                        ? editingClient.directories 
                        : editingClient.directories ? [editingClient.directories] : [],
                      followUpDate: editingClient.followUpDate ? new Date(editingClient.followUpDate) : null,
                      onboardDate: editingClient.onboardDate ? new Date(editingClient.onboardDate) : new Date(),
                      notes: '',
                      status: editingClient.status || '',
                      businessType: editingClient.businessType ?? '',
                      addressLine1: '',
                      city: '',
                      state: '',
                      country: '',
                      pincode: '',
                    }
              ) : undefined}
              services={services}
              businessTypes={businessTypes}
              clientStatuses={clientStatuses}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

