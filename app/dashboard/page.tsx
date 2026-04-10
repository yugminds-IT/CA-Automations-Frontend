/**
 * Main dashboard layout — org user home (non–master-admin, non-client).
 *
 * Layout structure:
 * - Header: 5% height at top
 * - Sidebar: 15% width on desktop, top nav on mobile/tablet
 * - Content area: Adjusts margin/padding based on screen size
 *
 * DO NOT change the margin-left (220px) or padding-top (16) values
 * as they are synchronized with the sidebar width.
 */

"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { LekvyaLoader } from "@/components/ui/lekvya-loader"
import { Dashboard } from "../pages/dashboard"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserData, isAuthenticated, getRoleFromUser, restoreAutoLogoutTimer, getMe } from "@/lib/api/index"

export default function DashboardHomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [trialNotice, setTrialNotice] = useState<string | null>(null)
  const router = useRouter()

  // Auth guard: redirect to login if not authenticated
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
    if (isCheckingAuth) return
    let cancelled = false
    ;(async () => {
      try {
        const me = (await getMe()) as {
          organization?: { accessUntil?: string | null; approvalStatus?: string }
        }
        const until = me?.organization?.accessUntil
        if (!until || me?.organization?.approvalStatus !== "approved") return
        const end = new Date(until).getTime()
        const daysLeft = (end - Date.now()) / (86400000)
        if (!cancelled && daysLeft > 0 && daysLeft <= 3) {
          setTrialNotice(
            `Your access ends on ${new Date(until).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}. Purchase a subscription or contact support to extend.`,
          )
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isCheckingAuth])

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
        <div className="overflow-auto" style={{ height: "calc(100vh - 54px)", marginTop: "54px" }}>
          {trialNotice && (
            <div
              role="status"
              className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
            >
              {trialNotice}
            </div>
          )}
          <Dashboard />
        </div>
      </div>
    </div>
  )
}
