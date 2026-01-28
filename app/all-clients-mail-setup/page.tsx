"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AllClientsMailSetup } from "../pages/all_clients_mail_setup"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserData, isAuthenticated } from "@/lib/api/index"

export default function AllClientsMailSetupPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()

  // Role guard: clients should not access this page
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

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated()
        if (!authenticated) {
          router.push('/login')
        } else {
          setIsCheckingAuth(false)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMenuClick={() => setMobileMenuOpen(true)}
        onSidebarToggle={toggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
      />
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />
      <main 
        className={`transition-all duration-300 ${
          isDesktop && !sidebarCollapsed ? 'lg:ml-[15%]' : 'lg:ml-[60px]'
        }`}
      >
        <div className="p-4 sm:p-6">
          <AllClientsMailSetup />
        </div>
      </main>
    </div>
  )
}
