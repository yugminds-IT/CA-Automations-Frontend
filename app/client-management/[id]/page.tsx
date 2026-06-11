"use client"

import { Sidebar } from "@/components/sidebar"
import { ClientDetailSidebar, type ClientDetailSection } from "@/components/client/client-detail-sidebar"
import { Header } from "@/components/header"
import { ClientDetails } from "@/components/client/client_details"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/api/index"
import { LekvyaLoader } from "@/components/ui/lekvya-loader"

// Main sidebar is always icon-only (60px) on this page so the client detail
// sidebar has room without crowding the content area.
const MAIN_SIDEBAR_WIDTH = 60

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params?.id as string

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [clientSidebarCollapsed, setClientSidebarCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeSection, setActiveSection] = useState<ClientDetailSection>('details')
  const [clientName, setClientName] = useState<string>('')

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }
    setAuthChecked(true)
  }, [router])

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const clientSidebarWidth = isDesktop ? (clientSidebarCollapsed ? 60 : 240) : 0
  const totalSidebarWidth = isDesktop ? MAIN_SIDEBAR_WIDTH + clientSidebarWidth : 0

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden w-full relative">
      {/* Main app sidebar — always collapsed (icon-only) on this page */}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={true}
      />

      {/* Client-specific sidebar — sits immediately to the right of the main sidebar */}
      <ClientDetailSidebar
        clientName={clientName}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={clientSidebarCollapsed}
        offsetLeft={isDesktop ? MAIN_SIDEBAR_WIDTH : 0}
      />

      {/* Content area */}
      <div
        className="flex flex-col flex-1 transition-all duration-300 overflow-hidden min-w-0"
        style={{
          marginLeft: isDesktop ? `${totalSidebarWidth}px` : '0',
          width: isDesktop ? `calc(100% - ${totalSidebarWidth}px)` : '100%',
        }}
      >
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setClientSidebarCollapsed((v) => !v)}
          sidebarCollapsed={clientSidebarCollapsed}
        />
        <div
          className="overflow-y-auto overflow-x-hidden w-full"
          style={{ height: "calc(100vh - 54px)", marginTop: "54px" }}
        >
          <div className="w-full max-w-full">
            {authChecked && clientId ? (
              <ClientDetails
                clientId={clientId}
                activeSection={activeSection}
                onClientNameChange={setClientName}
              />
            ) : !authChecked ? (
              <div className="flex justify-center py-10"><LekvyaLoader /></div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
