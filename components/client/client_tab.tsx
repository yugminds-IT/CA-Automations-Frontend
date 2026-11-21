'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, ExternalLink, Users } from 'lucide-react'
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
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { ClientOnboardForm } from './client_onboardform'
import { getIndustryClientConfig } from '@/lib/industry-config'
import {
  onboardClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getServices,
} from '@/lib/api/clients'
import { getUserData, createBusinessType } from '@/lib/api/index'
import { ApiError } from '@/lib/api/client'
import type {
  Client as ApiClient,
  Service,
} from '@/lib/api/types'

import {
  type Client,
  filterClients,
  formatDate,
  transformApiClientToComponent,
  transformComponentToOnboardRequest,
  transformComponentToUpdateRequest,
  transformApiClientToFormValues,
} from './client-transforms'

export type { Client } from './client-transforms'
export { transformApiClientToFormValues } from './client-transforms'

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
  const { toast } = useToast()
  const [industry, setIndustry] = useState<string | null>(null)

  useEffect(() => {
    const user = getUserData() as any
    if (user?.organization?.industry) {
      setIndustry(user.organization.industry)
    }
  }, [])

  const currentIndustry = industry || 'financial_services'
  const clientConfig = React.useMemo(() => getIndustryClientConfig(industry), [industry])

  const [internalDialogOpen, setInternalDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set())

  const toggleExpand = (id: string | number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
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
    window.open(`/client-management/${client.id}`, '_blank')
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
          <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0">
            <Table>
              <TableSkeleton rows={6} columns={9} />
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && useApi) {
    return (
      <Card>
        <CardContent>
          <InlineError
            message={error}
            onRetry={() => fetchClients()}
            className="py-12"
          />
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

  if (isDialogOpen) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">
                {editingClient ? clientConfig.editTitle : clientConfig.onboardTitle}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {editingClient
                  ? clientConfig.editSubtitle
                  : clientConfig.onboardSubtitle
                }
              </p>
            </div>
            {!isLoadingEditData && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingClient(null)
                    setEditingApiClient(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="client-onboard-form"
                  size="sm"
                >
                  {editingClient ? clientConfig.editTitle : clientConfig.onboardButtonLabel}
                </Button>
              </div>
            )}
          </div>

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
                editingApiClient
                  ? transformApiClientToFormValues(editingApiClient)
                  : {
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
              industry={currentIndustry}
            />
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent>
          {displayClients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients found"
              description={
                searchQuery || (statusFilter && statusFilter !== 'all')
                  ? 'Try adjusting your search or filters'
                  : `No ${clientConfig.nameLabel.toLowerCase()}s have been added yet`
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <SortableTableHead
                      className="min-w-[120px]"
                      sortable
                      sortDirection={sortField === 'name' ? sortDirection : null}
                      onSort={() => handleSort('name')}
                    >
                      {clientConfig.nameLabel}
                    </SortableTableHead>
                    <SortableTableHead
                      className="min-w-[150px]"
                      sortable
                      sortDirection={sortField === 'companyName' ? sortDirection : null}
                      onSort={() => handleSort('companyName')}
                    >
                      {clientConfig.companyLabel}
                    </SortableTableHead>
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
                      Phone
                    </SortableTableHead>
                    <TableHead className="min-w-[120px]">{clientConfig.businessTypeLabel}</TableHead>
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
                      sortDirection={sortField === 'followUpDate' ? sortDirection : null}
                      onSort={() => handleSort('followUpDate')}
                    >
                      {clientConfig.followUpDateLabel}
                    </SortableTableHead>
                    <TableHead className="min-w-[100px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayClients.map((client) => {
                    const isExpanded = expandedRows.has(client.id)
                    return (
                      <React.Fragment key={client.id}>
                        <TableRow>
                          <TableCell className="w-[40px] pr-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpand(client.id)}
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />
                              }
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="truncate block max-w-[120px]" title={client.name}>
                              {client.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="truncate block max-w-[150px]" title={client.companyName}>
                              {client.companyName}
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
                            <span className="truncate block max-w-[120px]" title={client.businessType ?? ''}>
                              {client.businessType ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {client.status ? (
                              <span
                                className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: client.status === 'Active' || client.status?.toLowerCase() === 'active'
                                    ? '#22c55e'
                                    : client.status === 'Inactive' || client.status?.toLowerCase() === 'inactive'
                                    ? '#000000'
                                    : undefined,
                                  color: (client.status === 'Active' || client.status?.toLowerCase() === 'active' ||
                                          client.status === 'Inactive' || client.status?.toLowerCase() === 'inactive')
                                    ? '#ffffff'
                                    : undefined,
                                  borderColor: client.status === 'Active' || client.status?.toLowerCase() === 'active'
                                    ? '#22c55e'
                                    : client.status === 'Inactive' || client.status?.toLowerCase() === 'inactive'
                                    ? '#000000'
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
                            <span className="text-xs">{formatDate(client.followUpDate)}</span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRowClick(client)
                                }}
                                className="h-8 px-2 text-xs gap-1"
                                title="View client details"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                More
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={9} className="py-3 px-6">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Email</p>
                                  <p className="break-all">{client.email || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Phone</p>
                                  <p>{client.phone || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium mb-0.5">{clientConfig.businessTypeLabel}</p>
                                  <p>{client.businessType || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Status</p>
                                  <p>{client.status || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium mb-0.5">{clientConfig.followUpDateLabel}</p>
                                  <p>{formatDate(client.followUpDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium mb-0.5">{clientConfig.onboardDateLabel}</p>
                                  <p>{formatDate(client.onboardDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Last Contacted</p>
                                  <p>{formatDate(client.lastContactedDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium mb-0.5">{clientConfig.servicesSectionTitle}</p>
                                  <p>{Array.isArray(client.directories) ? client.directories.join(', ') || '—' : client.directories || '—'}</p>
                                </div>
                                {client.panNumber && (
                                  <div>
                                    <p className="text-xs text-muted-foreground font-medium mb-0.5">{clientConfig.panLabel}</p>
                                    <p>{client.panNumber}</p>
                                  </div>
                                )}
                                {client.gstNumber && (
                                  <div>
                                    <p className="text-xs text-muted-foreground font-medium mb-0.5">{clientConfig.gstLabel}</p>
                                    <p>{client.gstNumber}</p>
                                  </div>
                                )}
                                {(client.city || client.state || client.country) && (
                                  <div>
                                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Location</p>
                                    <p>{[client.city, client.state, client.country].filter(Boolean).join(', ')}</p>
                                  </div>
                                )}
                                {client.notes && (
                                  <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Notes</p>
                                    <p className="text-muted-foreground">{client.notes}</p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
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

    </>
  )
}

