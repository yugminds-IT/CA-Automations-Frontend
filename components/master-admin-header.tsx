"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Bell, LogOut, Menu, Moon, PanelLeft, Shield, Sun } from "lucide-react"
import { getUserData, logout } from "@/lib/api/index"
import type { User } from "@/lib/api/index"
import { useTheme } from "./theme-provider"

interface MasterAdminHeaderProps {
  onMenuClick?: () => void
  onSidebarToggle?: () => void
  sidebarCollapsed?: boolean
}

/** Sticky top bar for master-admin pages. Positioned by MasterAdminShell's CSS layout. */
export function MasterAdminHeader({ onMenuClick, onSidebarToggle, sidebarCollapsed = false }: MasterAdminHeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const load = () => setUser(getUserData())
    setMounted(true)
    load()
    window.addEventListener("userDataUpdated", load)
    return () => window.removeEventListener("userDataUpdated", load)
  }, [])

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Admin"
  const iconBtn = "p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"

  return (
    <header className="sticky top-0 z-40 h-16 shrink-0 flex items-center justify-between gap-3 px-3 sm:px-6 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center gap-2 min-w-0">
        {onMenuClick && (
          <button onClick={onMenuClick} className={`lg:hidden ${iconBtn}`} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
        )}
        {onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className={`hidden lg:flex ${iconBtn}`}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary">
          <Shield className="w-3.5 h-3.5" /> MASTER ADMIN
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={toggleTheme} className={iconBtn} aria-label="Toggle theme" suppressHydrationWarning>
          {mounted && theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <Link href="/master-admin/notifications" className={iconBtn} aria-label="Notifications">
          <Bell className="w-4 h-4" />
        </Link>
        {user && (
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-border">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-xs font-semibold text-foreground truncate max-w-[140px]">{displayName}</span>
            <button
              onClick={async () => {
                await logout()
                window.location.replace("/login")
              }}
              className={`${iconBtn} hover:text-destructive`}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
