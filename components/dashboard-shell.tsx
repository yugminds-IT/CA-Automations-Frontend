"use client"

import { useAppUi } from "@/lib/use-app-ui"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { LekvyaLoader } from "@/components/ui/lekvya-loader"
import { getUserData, isAuthenticated, getRoleFromUser, restoreAutoLogoutTimer } from "@/lib/api/index"

/**
 * App frame for org users: auth check, fixed sidebar, sticky header, scrolling page area.
 * Used once by app/(app)/layout.tsx so it stays mounted while navigating between pages.
 * Layout is pure CSS (no window-width state), so nothing jumps on load.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  useAppUi()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }
    restoreAutoLogoutTimer()

    const role = getRoleFromUser(getUserData())?.toUpperCase()
    if (role === "MASTER_ADMIN") {
      router.replace("/master-admin")
      return
    }
    if (role === "CLIENT") {
      router.replace("/uploads")
      return
    }
    // Labeled sidebar by default; remember if the user collapses it.
    setSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true")
    setIsCheckingAuth(false)
  }, [router])

  const toggleSidebar = () => {
    setSidebarCollapsed((c) => {
      localStorage.setItem("sidebarCollapsed", String(!c))
      return !c
    })
  }

  if (isCheckingAuth) {
    return <LekvyaLoader className="min-h-screen" />
  }

  return (
    <div className="h-screen bg-background text-foreground">
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />
      <div
        className={`flex h-full flex-col transition-[padding] duration-200 ${
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
        }`}
      >
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
