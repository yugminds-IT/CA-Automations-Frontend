"use client"

/**
 * Sidebar Component - DO NOT MODIFY MENU ITEMS
 * 
 * This sidebar is configured with only 3 main menu items:
 * - Dashboard (active by default)
 * - Notifications
 * - Settings
 * 
 * DO NOT add: AI Models, Interactions, or Relations
 * These items have been permanently removed from the project.
 */

import {
  LayoutDashboard,
  Settings,
  LogOut,
  HelpCircle,
  Bell,
  Sun,
  Moon,
  Star,
  Menu,
  User as UserIcon,
} from "lucide-react"
import { useTheme } from "./theme-provider"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { getUserData, getOrganizationData, logout } from "@/lib/api/index"
import type { User, Organization, UserRole } from "@/lib/api/index"

export function Sidebar() {
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [important, setImportant] = useState<Set<string>>(new Set())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)

  // Function to load user and organization data
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

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true)
    // Load user and organization data on mount
    loadUserData()

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

    // Also refresh on window focus (in case data was updated)
    const handleFocus = () => {
      loadUserData()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('userDataUpdated', handleCustomStorage)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // FIXED MENU ITEMS - DO NOT CHANGE
  // Only these 3 items should be in the sidebar
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: Bell, label: "Notifications", active: false },
    { icon: Settings, label: "Settings", active: false },
  ] as const

  // Bottom menu items - Help and Logout
  const bottomItems = [
    { icon: HelpCircle, label: "Help" },
    { icon: LogOut, label: "Logout" },
  ] as const

  const toggleImportant = (label: string) => {
    const newImportant = new Set(important)
    if (newImportant.has(label)) {
      newImportant.delete(label)
    } else {
      newImportant.add(label)
    }
    setImportant(newImportant)
  }

  // Render menu items (used in both desktop sidebar and mobile menu)
  const renderMenuItems = () => (
    <>
      {/* Navigation Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.label} className="relative group">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full px-4 py-3 flex items-center gap-3 text-[13px] font-medium transition-colors ${
                item.active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {important.has(item.label) && <Star className="w-4 h-4 ml-auto fill-current" />}
            </button>
            <button
              onClick={() => toggleImportant(item.label)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Mark as important"
            >
              <Star className={`w-4 h-4 ${important.has(item.label) ? "fill-current" : ""}`} />
            </button>
          </div>
        ))}
      </nav>

      {/* Bottom Items */}
      <nav className="border-t border-sidebar-border py-4">
        {bottomItems.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              setMobileMenuOpen(false)
              if (item.label === "Logout") {
                logout()
                setUser(null)
                setOrganization(null)
                router.push("/login")
              }
            }}
            className="w-full px-4 py-3 flex items-center gap-3 text-[13px] font-medium text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[13px] font-medium"
          suppressHydrationWarning
        >
          {mounted && theme === "light" ? (
            <>
              <Moon className="w-4 h-4" />
              <span>Dark Mode</span>
            </>
          ) : mounted && theme === "dark" ? (
            <>
              <Sun className="w-4 h-4" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile/Tablet: Top Navigation Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold">AI</div>
            <h1 className="text-lg font-bold">AIFlow</h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile/Tablet Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="bg-sidebar text-sidebar-foreground w-[280px] sm:w-[320px] p-0">
          <SheetHeader className="p-6 border-b border-sidebar-border">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold">AI</div>
              <div>
                <h1 className="text-xl font-bold">AIFlow</h1>
              </div>
            </SheetTitle>
            {/* User Info Tab - Below Logo */}
            {(user || organization) && (
              <div className="mt-4 pt-4 border-t border-sidebar-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-sidebar-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {user && (
                      <p className="text-sm font-semibold text-sidebar-foreground truncate">
                        {user.full_name || user.email || 'User'}
                      </p>
                    )}
                    {organization?.name && (
                      <p className="text-xs text-sidebar-accent-foreground truncate">
                        {organization.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </SheetHeader>
          <div className="flex flex-col h-[calc(100vh-120px)] px-2">
            {renderMenuItems()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: Sidebar on the left - FIXED WIDTH 15% - DO NOT CHANGE */}
      <aside
        className="hidden lg:flex bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border m-0 px-2 py-0 h-screen fixed top-0 bottom-0 left-0"
        style={{ width: "15%" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold">AI</div>
            <h1 className="text-xl font-bold">AIFlow</h1>
          </div>
          {/* User Info Tab - Below Logo */}
          {(user || organization) && (
            <div className="mt-4 pt-4 border-t border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-sidebar-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  {user && (
                    <p className="text-sm font-semibold text-sidebar-foreground truncate">
                      {user.full_name || user.email || 'User'}
                    </p>
                  )}
                  {organization?.name && (
                    <p className="text-xs text-sidebar-accent-foreground truncate">
                      {organization.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {renderMenuItems()}
      </aside>
    </>
  )
}
