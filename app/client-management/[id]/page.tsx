"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ClientDetails } from "@/components/client/client_details"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

export default function ClientDetailsPage() {
  const params = useParams()
  const clientId = params?.id as string
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)

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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden w-full relative">
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
            <ClientDetails clientId={clientId} />
          </div>
        </div>
      </div>
    </div>
  )
}
