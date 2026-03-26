"use client"

/**
 * Master Admin Header - Redesigned
 *
 * Clean white sticky header with global search, notification bell,
 * theme toggle, and profile section. Uses #2563EB Professional Blue accent.
 */

import {
  LogOut,
  Sun,
  Moon,
  PanelLeft,
  Shield,
  Search,
  Bell,
  ChevronDown,
  Menu,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserData, getOrganizationData, logout } from "@/lib/api/index"
import type { User, Organization } from "@/lib/api/index"
import { useTheme } from "./theme-provider"

interface MasterAdminHeaderProps {
  onMenuClick?: () => void
  onSidebarToggle?: () => void
  sidebarCollapsed?: boolean
}

export function MasterAdminHeader({
  onMenuClick,
  onSidebarToggle,
  sidebarCollapsed = false,
}: MasterAdminHeaderProps) {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  const loadUserData = () => {
    const userData = getUserData()
    const orgData = getOrganizationData()
    if (userData) setUser(userData)
    if (orgData) setOrganization(orgData)
  }

  useEffect(() => {
    setMounted(true)
    loadUserData()

    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkIsDesktop()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user_data" || e.key === "organization_data") loadUserData()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("userDataUpdated", loadUserData)
    window.addEventListener("resize", checkIsDesktop)
    window.addEventListener("focus", loadUserData)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("userDataUpdated", loadUserData)
      window.removeEventListener("resize", checkIsDesktop)
      window.removeEventListener("focus", loadUserData)
    }
  }, [])

  const getHeaderStyle = () => {
    if (isDesktop) {
      return {
        left: sidebarCollapsed ? "60px" : "240px",
        right: 0,
        width: sidebarCollapsed ? "calc(100% - 60px)" : "calc(100% - 240px)",
      }
    }
    return { left: 0, right: 0, width: "100%" }
  }

  const userInitial = (user?.full_name || user?.email || "A").charAt(0).toUpperCase()
  const displayName =
    user?.full_name || user?.email?.split("@")[0] || "Admin"

  return (
    <header
      className="fixed top-0 z-50 bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between px-4 md:px-6 transition-[left,width] duration-300 ease-out shadow-sm"
      style={{ height: "56px", minHeight: "56px", ...getHeaderStyle() }}
    >
      {/* ── Left: Controls + brand badge ── */}
      <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
        {/* Mobile hamburger */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-[#64748B] dark:text-[#94A3B8]" />
          </button>
        )}

        {/* Desktop sidebar collapse toggle */}
        {onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="hidden lg:flex p-2 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="w-5 h-5 text-[#64748B] dark:text-[#94A3B8]" />
          </button>
        )}

        {/* Master Admin badge + org name */}
        <div className="flex items-center gap-2 ml-1">
          <div className="hidden sm:flex items-center gap-1.5 bg-[#EFF6FF] dark:bg-[#1E3A5F] px-2.5 py-1 rounded-lg">
            <Shield className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="text-[11px] font-semibold text-[#2563EB] tracking-wide">
              MASTER ADMIN
            </span>
          </div>
          <span className="text-sm font-semibold text-[#0F172A] dark:text-white hidden md:block truncate max-w-[160px]">
            {organization?.name || "AIFlow"}
          </span>
        </div>
      </div>

      {/* ── Center: Global search ── */}
      <div className="hidden md:flex flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search organizations, users..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] transition-all"
          />
        </div>
      </div>

      {/* ── Right: Theme + notifications + profile ── */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition-colors"
          aria-label="Toggle theme"
          suppressHydrationWarning
        >
          {mounted && theme === "light" ? (
            <Moon className="w-4 h-4 text-[#64748B]" />
          ) : (
            <Sun className="w-4 h-4 text-[#94A3B8]" />
          )}
        </button>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition-colors">
          <Bell className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2563EB] rounded-full ring-2 ring-white dark:ring-[#0F172A]" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[#E2E8F0] dark:bg-[#1E293B] mx-1 hidden sm:block" />

        {/* Profile section */}
        {user && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition-colors cursor-default">
              <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-[11px] font-bold text-white">{userInitial}</span>
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-semibold text-[#0F172A] dark:text-white leading-none truncate max-w-[100px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] leading-none mt-0.5">
                  Master Admin
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-[#CBD5E1] hidden sm:block flex-shrink-0" />
            </div>

            <button
              onClick={() => {
                logout()
                router.push("/login")
              }}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
              aria-label="Logout"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-[#94A3B8] group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
