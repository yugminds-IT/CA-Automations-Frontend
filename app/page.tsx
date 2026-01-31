/**
 * Main Page Layout - FIXED STRUCTURE
 * 
 * Layout structure:
 * - Header: 5% height at top
 * - Sidebar: 15% width on desktop, top nav on mobile/tablet
 * - Content area: Adjusts margin/padding based on screen size
 * 
 * DO NOT change the margin-left (15%) or padding-top (16) values
 * as they are synchronized with the sidebar width.
 */

"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Dashboard } from "./pages/dashboard"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserData, isAuthenticated, getRoleFromUser, restoreAutoLogoutTimer } from "@/lib/api/index"

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }
    
    // Restore auto-logout timer on page load/refresh
    restoreAutoLogoutTimer()
    
    const role = getRoleFromUser(getUserData())
    if (role != null) {
      const roleUpper = role.toUpperCase()
      if (roleUpper === 'MASTER_ADMIN') {
        router.replace("/master-admin")
        return
      }
      if (roleUpper === 'CLIENT') {
        router.replace("/uploads")
        return
      }
    }
    setIsCheckingAuth(false)
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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // Show loading state while redirecting/checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
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
        <div className="overflow-auto" style={{ height: "calc(100vh - 3vh)", marginTop: "3vh" }}>
          <Dashboard />
        </div>
      </div>
    </div>
  )
}
