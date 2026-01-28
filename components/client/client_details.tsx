'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { Client } from './client_tab'
import { DirectorsTab, type Director } from './director_info/directors_tab'
import { EmailSetup } from './director_info/email-setup'
import { ClientLoginTab } from './director_info/client-login-tab'
import { FilesTab } from './director_info/files_tab'
import { getClientById, updateClientLogin } from '@/lib/api/clients'
import { ApiError } from '@/lib/api/client'
import type { Client as ApiClient } from '@/lib/api/types'

interface ClientDetailsProps {
  clientId: string
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

// Transform API Directors to component Director format
function transformApiDirectors(apiDirectors?: Array<{
  id?: number
  director_name: string
  email: string
  phone_number: string
  designation?: string
  din?: string
  pan?: string
  aadhaar?: string
}>): Director[] {
  if (!apiDirectors || apiDirectors.length === 0) {
    return []
  }
  
  return apiDirectors.map(dir => ({
    name: dir.director_name,
    email: dir.email || '',
    phone: dir.phone_number || '',
    designation: dir.designation || '',
    din: dir.din || '',
    pan: dir.pan || '',
    aadhar: dir.aadhaar || '', // Note: API uses aadhaar, component uses aadhar
  }))
}

export function ClientDetails({ clientId }: ClientDetailsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [client, setClient] = useState<Client | null>(null)
  const [directors, setDirectors] = useState<Director[]>([])
  const [initialLogins, setInitialLogins] = useState<Array<{ email: string; password: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load client data from API
  useEffect(() => {
    const loadClientData = async () => {
      if (!clientId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const apiClient = await getClientById(clientId)
        const transformedClient = transformApiClientToComponent(apiClient)
        setClient(transformedClient)
        
        // Extract directors from API response
        if (apiClient.directors) {
          const transformedDirectors = transformApiDirectors(apiClient.directors)
          setDirectors(transformedDirectors)
        }
        
        // Extract login credentials from API response
        // Note: The GET /api/v1/client/{id} endpoint should return login_email if client has login credentials
        // Password may be returned by API when it's newly generated
        if (apiClient.login_email) {
          // Extract password - handle both null/undefined and empty string
          const passwordValue = (apiClient.login_password && apiClient.login_password.trim()) 
            ? apiClient.login_password.trim() 
            : ''
          
          const loginData = {
            email: apiClient.login_email,
            password: passwordValue,
          }
          console.log('Setting initial logins from API response:', {
            email: loginData.email,
            password: loginData.password ? `${loginData.password.substring(0, 3)}***` : 'empty',
            passwordLength: loginData.password?.length || 0,
            rawLoginPassword: apiClient.login_password ? 'present' : 'missing',
            rawLoginPasswordType: typeof apiClient.login_password
          })
          setInitialLogins([loginData])
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
            // If detail is an object, extract a meaningful message
            const detailObj = detail as Record<string, any>
            if (detailObj.errors && typeof detailObj.errors === 'object') {
              const errorMessages = Object.entries(detailObj.errors)
                .map(([key, value]) => {
                  if (Array.isArray(value)) {
                    return `${key}: ${value.join(', ')}`
                  }
                  return `${key}: ${String(value)}`
                })
                .join('; ')
              errorMessage = errorMessages || (detailObj.detail as string) || String(detail)
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
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadClientData()
  }, [clientId, toast])

  const handleRemoveDirector = (index: number) => {
    setDirectors(directors.filter((_, i) => i !== index))
    // TODO: Call API to remove director
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
          <div className="text-destructive mb-2">
            {error || 'Client not found'}
          </div>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push('/client-management')}
          >
            Back to Client Management
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => router.push('/client-management')}
                className="cursor-pointer hover:text-foreground"
              >
                Client Management
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Client Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/client-management')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="directors" className="w-full">
        <div className="w-full sm:w-[60%] overflow-x-auto sm:overflow-x-visible" style={{ WebkitOverflowScrolling: 'touch' }}>
          <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-3 sm:min-w-0 h-auto p-0 gap-0 border-b border-border">
            <TabsTrigger value="directors" className="text-[10px] sm:text-sm py-2 px-2 sm:px-4 whitespace-nowrap flex-shrink-0 flex-1 sm:flex-none min-w-0">
              Directors List
            </TabsTrigger>
            <TabsTrigger value="login" className="text-[10px] sm:text-sm py-2 px-2 sm:px-4 whitespace-nowrap flex-shrink-0 flex-1 sm:flex-none min-w-0">
              Client Login
            </TabsTrigger>
            <TabsTrigger value="files" className="text-[10px] sm:text-sm py-2 px-2 sm:px-4 whitespace-nowrap flex-shrink-0 flex-1 sm:flex-none min-w-0">
              Files
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Director List Tab */}
        <TabsContent value="directors" className="mt-4 -mx-4 sm:mx-0 px-4 sm:px-0">
          <DirectorsTab 
            directors={directors}
            onRemoveDirector={handleRemoveDirector}
            clientName={client?.companyName}
          />
        </TabsContent>

        {/* Client Login Tab */}
        <TabsContent value="login" className="mt-4 -mx-4 sm:mx-0 px-4 sm:px-0 space-y-6">
          <ClientLoginTab 
            clientName={client?.name || ''}
            initialLogins={initialLogins}
            onSave={async (logins) => {
              if (!client) {
                throw new Error('Client not loaded')
              }
              try {
              // Backend supports a single login credential set (login_email/login_password).
              // If UI has multiple rows, we use the most recently added one.
              const latest = logins[logins.length - 1]
                console.log('Saving login credentials (password will be generated by backend):', { 
                  clientId: client.id, 
                  email: latest.email
                })
                
                // Only send email - backend will generate password automatically
                // Pass empty string for password to indicate it should be generated
                await updateClientLogin(client.id, latest.email, '')
                
                // Refresh client data after saving to get updated login info with generated password
                const updatedClient = await getClientById(clientId)
                if (updatedClient.login_email) {
                  const passwordValue = (updatedClient.login_password && updatedClient.login_password.trim()) 
                    ? updatedClient.login_password.trim() 
                    : ''
                  console.log('Updating logins after save:', {
                    email: updatedClient.login_email,
                    password: passwordValue ? `${passwordValue.substring(0, 3)}***` : 'empty',
                    passwordLength: passwordValue?.length || 0
                  })
                  setInitialLogins([{
                    email: updatedClient.login_email,
                    password: passwordValue,
                  }])
                } else {
                  setInitialLogins([])
                }
              } catch (error) {
                console.error('Error in onSave callback:', error)
                throw error // Re-throw to let ClientLoginTab handle the error display
              }
            }}
          />
          
          {/* Email Setup below Client Login */}
          <EmailSetup 
            clientId={clientId}
            clientName={client?.companyName || ''}
          />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-4 -mx-4 sm:mx-0 px-4 sm:px-0">
          <FilesTab 
            clientId={clientId}
            clientName={client?.companyName || ''}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

