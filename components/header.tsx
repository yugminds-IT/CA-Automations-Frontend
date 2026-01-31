"use client"

import { User as UserIcon, Menu, HelpCircle, LogOut, Sun, Moon, PanelLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserData, getOrganizationData, logout } from "@/lib/api/index"
import type { User, Organization } from "@/lib/api/index"
import { useTheme } from "./theme-provider"
import { useToast } from "@/components/ui/use-toast"

interface HeaderProps {
  onMenuClick?: () => void
  onSidebarToggle?: () => void
  sidebarCollapsed?: boolean
}

export function Header({ onMenuClick, onSidebarToggle, sidebarCollapsed = false }: HeaderProps) {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Function to load user and organization data (org from stored org or user.organization)
  const loadUserData = () => {
    const userData = getUserData()
    const orgData = getOrganizationData() ?? (userData as any)?.organization ?? null
    if (userData) {
      setUser(userData)
    }
    if (orgData) {
      setOrganization(orgData)
    } else {
      setOrganization(null)
    }
  }

  useEffect(() => {
    setMounted(true)
    // Load user and organization data on mount
    loadUserData()

    // Check if desktop on mount and resize
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    checkIsDesktop()

    // Listen for storage changes (when data is updated in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_data' || e.key === 'organization_data') {
        loadUserData()
      }
    }

    // Listen for custom storage event (for same-tab updates)
    const handleCustomStorage = () => {
      loadUserData()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('userDataUpdated', handleCustomStorage)
    window.addEventListener('resize', checkIsDesktop)

    // Also refresh on window focus (in case data was updated)
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

  // Calculate header position based on sidebar state
  // On mobile (< lg), header is full width (sidebar is a menu)
  // On desktop (>= lg), header starts after sidebar
  const getHeaderStyle = () => {
    if (isDesktop) {
      // Desktop: header should be beside sidebar
      return {
        left: sidebarCollapsed ? '60px' : '15%',
        right: 0,
        width: sidebarCollapsed ? 'calc(100% - 60px)' : 'calc(100% - 15%)',
      }
    }
    // Mobile: header is full width
    return {
      left: 0,
      right: 0,
      width: '100%',
    }
  }

  return (
    <header 
      className="fixed top-0 z-50 bg-sidebar text-sidebar-foreground border-b border-sidebar-border flex items-center justify-between px-3 transition-all duration-300"
      style={{ 
        height: "3vh",
        ...getHeaderStyle()
      }}
    >
      {/* Left side: Company name, sidebar toggle (desktop), and mobile menu button */}
      <div className="flex items-center gap-2">
        {/* Mobile menu button */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        {/* Desktop sidebar toggle button */}
        {onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="hidden lg:flex p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <h1 className="text-sm font-bold truncate max-w-[180px] sm:max-w-[240px]" title={organization?.name ?? 'CAA'}>
          {organization?.name ?? 'CAA'}
        </h1>
      </div>

      {/* Right side: User icon, name, Help, Dark Mode, and Logout */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Help button */}
        <button
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Help"
          title="Help"
        >
          <HelpCircle className="w-4 h-4 text-sidebar-foreground" />
        </button>

        {/* Dark Mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
          title={mounted && theme === "light" ? "Dark Mode" : "Light Mode"}
          suppressHydrationWarning
        >
          {mounted && theme === "light" ? (
            <Moon className="w-4 h-4 text-sidebar-foreground" />
          ) : mounted && theme === "dark" ? (
            <Sun className="w-4 h-4 text-sidebar-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-sidebar-foreground" />
          )}
        </button>

        {/* User icon, name, and logout */}
        {user && (
          <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-0 border-l border-sidebar-border">
            <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-3.5 h-3.5 text-sidebar-accent-foreground" />
            </div>
            <span className="text-xs font-semibold text-sidebar-foreground hidden sm:inline">
              {(user as any).name ?? (user as any).full_name ?? user.email ?? 'User'}
            </span>
            {/* Logout button */}
            <button
              onClick={() => {
                toast({
                  title: 'Logged Out',
                  description: 'You have been successfully logged out.',
                  variant: 'success',
                })
                logout()
                router.push("/login")
              }}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-sidebar-foreground" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

