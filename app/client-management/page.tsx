"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ClientManagement } from "../pages/client_management"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  getClientStatusEnum,
  getBusinessTypeEnum,
  getServices,
} from "@/lib/api/clients"
import { getUserData, isAuthenticated, ApiError } from "@/lib/api/index"

export default function ClientManagementPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [businessTypes, setBusinessTypes] = useState<string[]>([])
  const [services, setServices] = useState<string[]>([])
  const [isLoadingEnums, setIsLoadingEnums] = useState(true)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()

  // Role guard: clients should not access client management
  useEffect(() => {
    const user = getUserData()
    if (user?.role === 'client') {
      router.replace('/uploads')
    }
  }, [router])

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true')
    } else {
      // Default to collapsed (closed) if no saved state
      setSidebarCollapsed(true)
    }
  }, [])

  // Check if desktop on mount and resize
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)
    return () => window.removeEventListener('resize', checkIsDesktop)
  }, [])

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  // Fetch enums on mount
  useEffect(() => {
    const fetchEnums = async () => {
      try {
        setIsLoadingEnums(true)
        
        // Fetch all enums in parallel
        const [statusResponse, businessTypeResponse, servicesResponse] = await Promise.all([
          getClientStatusEnum(),
          getBusinessTypeEnum(),
          getServices(),
        ])

        // Extract values from enum responses
        setStatusOptions(statusResponse.values || [])
        setBusinessTypes(businessTypeResponse.values || [])
        
        // Extract service names from services response
        const serviceNames = servicesResponse.services?.map(service => service.name) || []
        setServices(serviceNames)
      } catch (error) {
        console.error('Error fetching enums:', error)
        // Set empty arrays on error to prevent UI issues
        setStatusOptions([])
        setBusinessTypes([])
        setServices([])

        // If we hit auth errors, send user to login
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login")
        } else {
          // Error toast will be handled by the ClientTab component
        }
      } finally {
        setIsLoadingEnums(false)
      }
    }

    // Guard: don't call protected APIs when logged out
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }

    setIsCheckingAuth(false)
    fetchEnums()
  }, [router])

  // Show loading state while redirecting/checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden w-full">
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />
      <div 
        className="flex flex-col flex-1 transition-all duration-300 overflow-hidden min-w-0"
        style={{ 
          marginLeft: isDesktop ? (sidebarCollapsed ? '60px' : '15%') : '0',
          width: isDesktop ? (sidebarCollapsed ? 'calc(100% - 60px)' : 'calc(100% - 15%)') : '100%',
        }}
      >
        <Header 
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        <div 
          className="overflow-y-auto overflow-x-hidden w-full" 
          style={{ 
            height: "calc(100vh - 3vh)", 
            marginTop: "3vh",
          }}
        >
          <div className="w-full max-w-full">
            {isLoadingEnums ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : (
              <ClientManagement 
                statusOptions={statusOptions}
                businessTypes={businessTypes}
                services={services}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

