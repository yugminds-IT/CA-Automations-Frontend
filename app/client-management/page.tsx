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

  // Check authentication first
  useEffect(() => {
    const checkAuth = () => {
      try {
        if (!isAuthenticated()) {
          router.replace("/login")
          return
        }
        setIsCheckingAuth(false)
      } catch (error) {
        console.error('Error checking authentication:', error)
        // If auth check fails, assume not authenticated
        router.replace("/login")
      }
    }
    
    checkAuth()
    
    // Fallback: if auth check takes too long, stop loading
    const timeout = setTimeout(() => {
      setIsCheckingAuth(false)
    }, 2000)
    
    return () => clearTimeout(timeout)
  }, [router])

  // Fetch enums on mount (after auth check)
  useEffect(() => {
    // Don't fetch if still checking auth or not authenticated
    if (isCheckingAuth) {
      return
    }
    
    if (!isAuthenticated()) {
      return
    }

    let isMounted = true

    const fetchEnums = async () => {
      try {
        setIsLoadingEnums(true)
        
        // Fetch all enums in parallel for better performance
        // Add timeout wrapper to prevent hanging
        const fetchWithTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
          const timeout = new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          })
          return Promise.race([promise, timeout])
        }
        
        const [statusResponse, businessTypeResponse, servicesResponse] = await Promise.all([
          fetchWithTimeout(getClientStatusEnum()),
          fetchWithTimeout(getBusinessTypeEnum()),
          fetchWithTimeout(getServices()),
        ])

        // Only update state if component is still mounted
        if (isMounted) {
          // Extract values from enum responses
          setStatusOptions(statusResponse.values || [])
          setBusinessTypes(businessTypeResponse.values || [])
          
          // Extract service names from services response
          const serviceNames = servicesResponse.services?.map((service: { name: string }) => service.name) || []
          setServices(serviceNames)
        }
      } catch (error) {
        console.error('Error fetching enums:', error)
        
        // Only update state if component is still mounted
        if (isMounted) {
          // Set empty arrays on error to prevent UI issues
          setStatusOptions([])
          setBusinessTypes([])
          setServices([])

          // If we hit auth errors, send user to login
          if (error instanceof ApiError && error.status === 401) {
            router.replace("/login")
          } else {
            // Error toast will be handled by the ClientTab component
            // But still show the page with empty arrays so user can see something
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingEnums(false)
        }
      }
    }

    fetchEnums()
    
    return () => {
      isMounted = false
    }
  }, [router, isCheckingAuth])
  
  // Show page immediately, even while enums are loading
  // This prevents the page from appearing completely blank


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
            <ClientManagement 
              statusOptions={statusOptions}
              businessTypes={businessTypes}
              services={services}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

