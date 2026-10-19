"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { LekvyaLoader } from "@/components/ui/lekvya-loader"
import { getUserData, isAuthenticated, getRoleFromUser, restoreAutoLogoutTimer } from "@/lib/api/index"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }

    restoreAutoLogoutTimer()

    const role = getRoleFromUser(getUserData())
    if (role != null) {
      const roleUpper = role.toUpperCase()
      if (roleUpper === "MASTER_ADMIN") {
        router.replace("/master-admin")
        return
      }
      if (roleUpper === "CLIENT") {
        router.replace("/uploads")
        return
      }
    }
    setIsCheckingAuth(false)
  }, [router])

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed")
    if (savedState !== null) {
      setSidebarCollapsed(savedState === "true")
    } else {
      setSidebarCollapsed(true)
    }
  }, [])

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    checkIsDesktop()
    window.addEventListener("resize", checkIsDesktop)
    return () => window.removeEventListener("resize", checkIsDesktop)
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  if (isCheckingAuth) {
    return <LekvyaLoader className="min-h-screen" />
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
          marginLeft: isDesktop ? (sidebarCollapsed ? "60px" : "240px") : "0",
          width: isDesktop
            ? sidebarCollapsed
              ? "calc(100% - 60px)"
              : "calc(100% - 240px)"
            : "100%",
        }}
      >
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        <div
          className="overflow-auto flex-1 w-full"
          style={{ height: "calc(100vh - 54px)", marginTop: "54px" }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
