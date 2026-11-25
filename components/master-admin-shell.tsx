"use client"

import { useAppUi } from "@/lib/use-app-ui"
import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
import { LekvyaLoader } from "@/components/ui/lekvya-loader"
import { isAuthenticated, isMasterAdminUser } from "@/lib/api/index"

/** Persistent master-admin frame: auth gate, sidebar, sticky header. Layout is pure CSS. */
export function MasterAdminShell({ children }: { children: ReactNode }) {
  useAppUi()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) return router.replace("/login")
    if (!isMasterAdminUser()) return router.replace("/dashboard")
    try {
      setCollapsed(localStorage.getItem("sidebarCollapsed") === "true")
    } catch {}
    setReady(true)
  }, [router])

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("sidebarCollapsed", String(!c))
      } catch {}
      return !c
    })

  if (!ready) return <LekvyaLoader className="min-h-screen" />

  return (
    <div className="h-screen bg-background text-foreground">
      <MasterAdminSidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} collapsed={collapsed} />
      <div className={`flex h-full flex-col transition-[padding] duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-64"}`}>
        <MasterAdminHeader
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={toggle}
          sidebarCollapsed={collapsed}
        />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
