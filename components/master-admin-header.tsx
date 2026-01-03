"use client"

import { User as UserIcon, Menu, HelpCircle, LogOut, Sun, Moon, PanelLeft, Shield } from "lucide-react"
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

export function MasterAdminHeader({ onMenuClick, onSidebarToggle, sidebarCollapsed = false }: MasterAdminHeaderProps) {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  const loadUserData = () => {
    const userData = getUserData()
    const orgData = getOrganizationData()
    if (userData) {
      setUser(userData)
    }
    if (orgData) {
      setOrganization(orgData)
    }
  }

  useEffect(() => {
    setMounted(true)
    loadUserData()

    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    checkIsDesktop()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_data' || e.key === 'organization_data') {
        loadUserData()
      }
    }

    const handleCustomStorage = () => {
      loadUserData()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('userDataUpdated', handleCustomStorage)
    window.addEventListener('resize', checkIsDesktop)

    const handleFocus = () => {
      loadUserData()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('userDataUpdated', handleCustomStorage)
      window.removeEventListener('resize', checkIsDesktop)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const getHeaderStyle = () => {
    if (isDesktop) {
      return {
        left: sidebarCollapsed ? '60px' : '15%',
        right: 0,
        width: sidebarCollapsed ? 'calc(100% - 60px)' : 'calc(100% - 15%)',
      }
    }
    return {
      left: 0,
      right: 0,
      width: '100%',
    }
  }

  return (
    <header 
      className="fixed top-0 z-50 bg-gradient-to-r from-slate-700 to-slate-800 dark:from-purple-800 dark:to-indigo-800 text-white border-b border-slate-500 dark:border-purple-600 flex items-center justify-between px-2 sm:px-3 md:px-4 transition-all duration-300 shadow-lg"
      style={{ 
        height: "3vh",
        minHeight: "48px",
        ...getHeaderStyle()
      }}
    >
      {/* Left side: Master Admin badge, company name, sidebar toggle */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 sm:p-2 rounded-md hover:bg-slate-600 dark:hover:bg-purple-700 transition-colors flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
        {onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="hidden lg:flex p-1.5 sm:p-2 rounded-md hover:bg-slate-600 dark:hover:bg-purple-700 transition-colors flex-shrink-0"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 dark:text-yellow-300 flex-shrink-0" />
          <span className="text-[10px] xs:text-xs font-semibold bg-amber-400 dark:bg-yellow-500 text-slate-900 dark:text-purple-950 px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap">
            MASTER ADMIN
          </span>
        </div>
        {organization?.name ? (
          <h1 className="text-xs sm:text-sm font-bold ml-1 sm:ml-2 truncate">{organization.name}</h1>
        ) : (
          <h1 className="text-xs sm:text-sm font-bold ml-1 sm:ml-2 truncate">AIFlow</h1>
        )}
      </div>

      {/* Right side: User icon, name, Help, Dark Mode, and Logout */}
      <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 flex-shrink-0">
        <button
          className="p-1.5 sm:p-2 rounded-md hover:bg-slate-600 dark:hover:bg-purple-700 transition-colors flex-shrink-0"
          aria-label="Help"
          title="Help"
        >
          <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </button>

        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-md hover:bg-slate-600 dark:hover:bg-purple-700 transition-colors flex-shrink-0"
          aria-label="Toggle theme"
          title={mounted && theme === "light" ? "Dark Mode" : "Light Mode"}
          suppressHydrationWarning
        >
          {mounted && theme === "light" ? (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          ) : mounted && theme === "dark" ? (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          ) : (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          )}
        </button>

        {user && (
          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-500 dark:border-purple-600 flex-shrink-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 dark:bg-yellow-500 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-900 dark:text-purple-950" />
            </div>
            <span className="text-[10px] xs:text-xs sm:text-sm font-semibold text-white hidden xs:inline truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">
              {user.full_name || user.email || 'Admin'}
            </span>
            <button
              onClick={() => {
                logout()
                router.push("/login")
              }}
              className="p-1.5 sm:p-2 rounded-md hover:bg-red-600 dark:hover:bg-red-600 transition-colors flex-shrink-0"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

