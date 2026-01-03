"use client"

import { useState } from "react"
import { Search, Download, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClientTab, type Client } from "@/components/client/client_tab"
import { useToast } from "@/components/ui/use-toast"

interface ClientManagementProps {
  statusOptions?: string[]
  services?: string[]
  businessTypes?: string[]
}

export function ClientManagement({ 
  statusOptions = [],
  services = [],
  businessTypes = []
}: ClientManagementProps) {
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleClientAdded = async (clientData: Omit<Client, 'id' | 'lastContactedDate'>) => {
    // Generate a temporary ID for the new client
    const newClient: Client = {
      ...clientData,
      id: Date.now(), // Temporary ID - replace with actual API call
      lastContactedDate: null,
    }
    
    // Add the new client to the list
    setClients((prevClients) => [...prevClients, newClient])
    
    // TODO: Replace with actual API call to save the client
    // await createClient(clientData)
    
    console.log('New client added:', newClient)
  }

  const handleExport = () => {
    // Filter clients based on search query and status
    const filteredClients = filterClients(clients, searchQuery, statusFilter)
    
    if (filteredClients.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'Please filter clients or ensure there are clients to export.',
        variant: 'warning',
      })
      return
    }
    
    try {
    // Convert to CSV
    const headers = ['Name', 'Email', 'Phone', 'Company Name', 'Directories', 'Follow-up Date', 'Onboard Date', 'Last Contacted']
    const rows = filteredClients.map(client => [
      client.name,
      client.email,
      client.phone || '',
      client.companyName,
      Array.isArray(client.directories) ? client.directories.join('; ') : client.directories || '',
      client.followUpDate ? new Date(client.followUpDate).toLocaleDateString() : '',
      client.onboardDate ? new Date(client.onboardDate).toLocaleDateString() : '',
      client.lastContactedDate ? new Date(client.lastContactedDate).toLocaleDateString() : '',
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `clients_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast({
        title: 'Export Successful',
        description: `Exported ${filteredClients.length} client(s) to CSV file.`,
        variant: 'success',
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export Failed',
        description: 'Failed to export clients. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const filterClients = (clientsList: Client[], query: string, status: string): Client[] => {
    let filtered = clientsList
    
    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter(client => client.status === status)
    }
    
    // Filter by search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(lowerQuery) ||
        client.email.toLowerCase().includes(lowerQuery) ||
        client.phone?.toLowerCase().includes(lowerQuery) ||
        client.companyName.toLowerCase().includes(lowerQuery) ||
        (Array.isArray(client.directories) 
          ? client.directories.some(dir => dir.toLowerCase().includes(lowerQuery))
          : String(client.directories).toLowerCase().includes(lowerQuery))
      )
    }
    
    return filtered
  }

  const filteredClients = filterClients(clients, searchQuery, statusFilter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Client Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your clients and their information
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border border-input"
            />
          </div>
          {/* Status Filter Dropdown */}
          <Select 
            value={statusFilter} 
            onValueChange={setStatusFilter}
            disabled={statusOptions.length === 0}
          >
            <SelectTrigger className="w-[140px] h-9 border border-input">
              <SelectValue placeholder={statusOptions.length === 0 ? "No status options" : "Filter by status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredClients.length === 0}
            className="border border-input"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {/* Onboard Client Button */}
          <Button
            onClick={() => setIsDialogOpen(true)}
            size="sm"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Onboard Client
          </Button>
        </div>
      </div>
      
      <ClientTab 
        useApi={true}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        services={services}
        businessTypes={businessTypes}
        clientStatuses={statusOptions}
      />
    </div>
  )
}

