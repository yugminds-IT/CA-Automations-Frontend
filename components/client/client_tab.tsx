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
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getServices,
} from '@/lib/api/clients'
import { ApiError } from '@/lib/api/client'
import type {
  Client as ApiClient,
  CreateClientRequest,
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
  clientStatuses?: string[]
  // If true, component will fetch clients from API instead of using props
  useApi?: boolean
  // Optional search and filter params for API fetching
  searchQuery?: string
  statusFilter?: string
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
function transformApiClientToComponent(apiClient: ApiClient): Client {
  // Extract service names from services array
  const serviceNames = apiClient.services?.map(s => s.name) || []
  
  return {
    id: apiClient.id,
    name: apiClient.client_name,
    email: apiClient.email,
    phone: apiClient.phone_number,
    companyName: apiClient.company_name,
    directories: serviceNames.length > 0 ? serviceNames : '—',
    followUpDate: apiClient.follow_date,
    onboardDate: apiClient.onboard_date,
    lastContactedDate: null, // API doesn't provide this field
    status: apiClient.status,
  }
}

// Transform component Client data to API CreateClientRequest format
function transformComponentToCreateRequest(
  clientData: Omit<Client, 'id' | 'lastContactedDate'>,
  services: Service[]
): CreateClientRequest {
  // Map service names to service IDs
  const serviceIds = Array.isArray(clientData.directories)
    ? clientData.directories
        .map(dir => {
          const service = services.find(s => s.name === dir)
          return service?.id
        })
        .filter((id): id is number => id !== undefined)
    : []

  // Transform directors if available
  const directors = clientData.directors?.map(dir => ({
    director_name: dir.name,
    email: dir.email || '',
    phone_number: dir.phone || '',
    designation: dir.designation || '',
    din: dir.din,
    pan: dir.pan,
    aadhaar: dir.aadhar,
  }))

  return {
    client_name: clientData.name,
    email: clientData.email,
    phone_number: clientData.phone || undefined,
    company_name: clientData.companyName,
    business_type: clientData.businessType,
    pan_number: clientData.panNumber,
    gst_number: clientData.gstNumber,
    status: clientData.status,
    address: clientData.address,
    city: clientData.city,
    state: clientData.state,
    country: clientData.country,
    pin_code: clientData.pincode,
    onboard_date: typeof clientData.onboardDate === 'string' 
      ? clientData.onboardDate 
      : clientData.onboardDate?.toISOString().split('T')[0],
    follow_date: clientData.followUpDate 
      ? (typeof clientData.followUpDate === 'string' 
          ? clientData.followUpDate 
          : clientData.followUpDate.toISOString().split('T')[0])
      : undefined,
    additional_notes: clientData.notes,
    service_ids: serviceIds.length > 0 ? serviceIds : undefined,
    directors: directors,
  }
}

// Transform API Client to form defaultValues format
function transformApiClientToFormValues(apiClient: ApiClient): {
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
  // Extract service names
  const serviceNames = apiClient.services?.map(s => s.name) || []
  
  // Parse address - API returns address as a single string, form expects addressLine1
  const addressLine1 = apiClient.address || ''
  
  // Handle business type - check if it's a custom type (not in standard list)
  const businessType = apiClient.business_type || ''
  
  // Transform directors
  const directors = apiClient.directors?.map(dir => ({
    name: dir.director_name,
    email: dir.email || '',
    phone: dir.phone_number || '',
    designation: dir.designation || '',
    din: dir.din || '',
    pan: dir.pan || '',
    aadhar: dir.aadhaar || '',
  })) || []

  return {
    name: apiClient.client_name,
    email: apiClient.email,
    phone: apiClient.phone_number || '',
    companyName: apiClient.company_name,
    panNumber: apiClient.pan_number || undefined,
    gstNumber: apiClient.gst_number || undefined,
    businessType: businessType,
    customBusinessType: undefined, // Will be set if businessType is "Other"
    status: apiClient.status,
    addressLine1: addressLine1,
    city: apiClient.city || '',
    state: apiClient.state || '',
    country: apiClient.country || '',
    pincode: apiClient.pin_code || '',
    directories: serviceNames,
    onboardDate: apiClient.onboard_date ? new Date(apiClient.onboard_date) : new Date(),
    followUpDate: apiClient.follow_date ? new Date(apiClient.follow_date) : null,
    notes: apiClient.additional_notes || undefined,
    directors: directors,
  }
}

// Transform component Client data to API UpdateClientRequest format
function transformComponentToUpdateRequest(
  clientData: Omit<Client, 'id' | 'lastContactedDate'>,
  services: Service[]
): UpdateClientRequest {
  // Map service names to service IDs
  const serviceIds = Array.isArray(clientData.directories)
    ? clientData.directories
        .map(dir => {
          const service = services.find(s => s.name === dir)
          return service?.id
        })
        .filter((id): id is number => id !== undefined)
    : []

  // Transform directors if available
  const directors = clientData.directors?.map(dir => ({
    director_name: dir.name,
    email: dir.email || '',
    phone_number: dir.phone || '',
    designation: dir.designation || '',
    din: dir.din,
    pan: dir.pan,
    aadhaar: dir.aadhar,
  }))

  return {
    client_name: clientData.name,
    email: clientData.email,
    phone_number: clientData.phone || undefined,
    company_name: clientData.companyName,
    business_type: clientData.businessType,
    pan_number: clientData.panNumber,
    gst_number: clientData.gstNumber,
    status: clientData.status,
    address: clientData.address,
    city: clientData.city,
    state: clientData.state,
    country: clientData.country,
    pin_code: clientData.pincode,
    onboard_date: typeof clientData.onboardDate === 'string' 
      ? clientData.onboardDate 
      : clientData.onboardDate?.toISOString().split('T')[0],
    follow_date: clientData.followUpDate 
      ? (typeof clientData.followUpDate === 'string' 
          ? clientData.followUpDate 
          : clientData.followUpDate.toISOString().split('T')[0])
      : undefined,
    additional_notes: clientData.notes,
    service_ids: serviceIds.length > 0 ? serviceIds : undefined,
    directors: directors,
  }
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
  clientStatuses = [],
  useApi = false,
  searchQuery = '',
  statusFilter,
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
      const params: { search?: string; status_filter?: string } = {}
      if (searchQuery) {
        params.search = searchQuery
      }
      if (statusFilter && statusFilter !== 'all') {
        params.status_filter = statusFilter
      }
      
      console.log('Fetching clients with params:', params)
      const response = await getClients(params)
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
      // Only fetch services if not provided externally (avoid duplicate API call)
      if (externalServices.length === 0) {
        fetchServices()
      } else {
        // Use external services - map to Service format
        setApiServices(externalServices.map(name => ({ id: 0, name } as Service)))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useApi, fetchClients])
  
  // Update services when external services change (if using API)
  useEffect(() => {
    if (useApi && externalServices.length > 0) {
      setApiServices(externalServices.map(name => ({ id: 0, name } as Service)))
    }
  }, [useApi, externalServices])

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

  const allClients = clients
  const sortedClients = sortClients(allClients)
  
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
      if (editingClient) {
        // Update existing client
        if (useApi) {
          // Use API to update
          const updateRequest = transformComponentToUpdateRequest(
            clientData,
            useApi ? apiServices : []
          )
          const updatedApiClient = await updateClient(editingClient.id, updateRequest)
          const updatedClient = transformApiClientToComponent(updatedApiClient)
          
          // Update local state
          setApiClients(prev => 
            prev.map(c => c.id === editingClient.id ? updatedClient : c)
          )
          
          // Refetch to ensure we have latest data
          await fetchClients()
          
          toast({
            title: 'Success',
            description: 'Client updated successfully',
            variant: 'success',
          })
        } else if (onClientUpdated) {
          // Use callback
          await onClientUpdated({
            ...clientData,
            id: editingClient.id,
            lastContactedDate: editingClient.lastContactedDate,
          })
        }
        setEditingClient(null)
      } else {
        // Create new client
        if (useApi) {
          // Use API to create
          const createRequest = transformComponentToCreateRequest(
            clientData,
            useApi ? apiServices : []
          )
          const newApiClient = await createClient(createRequest)
          const newClient = transformApiClientToComponent(newApiClient)
          
          // Add to local state
          setApiClients(prev => [newClient, ...prev])
          
          // Refetch to ensure we have latest data
          await fetchClients()
          
          toast({
            title: 'Success',
            description: 'Client created successfully',
            variant: 'success',
          })
        } else if (onClientAdded) {
          // Use callback
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
    setIsDialogOpen(true)
    
    // If using API, fetch full client data including all fields
    if (useApi) {
      setIsLoadingEditData(true)
      try {
        const fullClientData = await getClientById(client.id)
        setEditingApiClient(fullClientData)
        console.log('Fetched full client data for editing:', fullClientData)
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
        // Still allow editing with the basic data we have
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
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
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
                      businessType: '',
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

