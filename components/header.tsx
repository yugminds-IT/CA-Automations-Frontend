"use client"

import { User as UserIcon, Menu, HelpCircle, LogOut, Sun, Moon, PanelLeft, Home } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { getUserData, getOrganizationData, logout } from "@/lib/api/index"
import type { User, Organization } from "@/lib/api/index"
import { useTheme } from "./theme-provider"
import { useToast } from "@/components/ui/use-toast"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface HeaderProps {
  onMenuClick?: () => void
  onSidebarToggle?: () => void
  sidebarCollapsed?: boolean
}

// Route segment to breadcrumb label
const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  "client-management": "Client Management",
  "all-clients-mail-setup": "Mail Scheduler",
  "email-templates": "Email Templates",
  "notifications": "Notifications",
  "settings": "Settings",
  "uploads": "Uploads",
  "master-admin": "Master Admin",
  "organizations": "Organizations",
  "users": "Users",
}

function pathSegmentToLabel(segment: string, prevPath: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment]
  if (segment === "new" && prevPath.endsWith("client-management")) return "Add New Client"
  if (prevPath.endsWith("client-management")) return "Client Details"
  if (prevPath.endsWith("master-admin")) return segment
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function Header({ onMenuClick, onSidebarToggle, sidebarCollapsed = false }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Build breadcrumb items from current pathname
  const breadcrumbItems = (() => {
    const segments = pathname.split("/").filter(Boolean)
    const items: { href: string; label: string; isLast: boolean }[] = []
    let acc = ""
    segments.forEach((segment, i) => {
      acc += `/${segment}`
      const label = pathSegmentToLabel(segment, acc.slice(0, -segment.length - 1))
      items.push({ href: acc, label, isLast: i === segments.length - 1 })
    })
    if (items.length === 0) {
      items.push({ href: "/", label: "Dashboard", isLast: true })
    }
    return items
  })()

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
      className="fixed top-0 z-50 bg-background text-foreground border-b border-border flex items-center justify-between gap-3 px-3 sm:px-4 transition-all duration-300"
      style={{ 
        minHeight: "52px",
        marginBottom: "2px",
        ...getHeaderStyle()
      }}
    >
      {/* Left: menu, sidebar toggle, breadcrumb (example style – Home icon, teal links, gray chevrons) */}
      <div className="flex flex-1 min-w-0 items-center gap-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        {onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="hidden lg:flex p-2 rounded-md hover:bg-muted transition-colors shrink-0"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <Breadcrumb className="hidden sm:block min-w-0">
          <BreadcrumbList className="gap-1.5 text-sm font-medium [&_[data-slot=breadcrumb-separator]]:text-muted-foreground [&_[data-slot=breadcrumb-separator]>svg]:size-4">
            {/* Home icon as first item */}
            <BreadcrumbItem className="inline-flex items-center gap-1.5">
              <BreadcrumbLink asChild>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-primary hover:opacity-90 transition-colors"
                  aria-label="Home"
                >
                  <Home className="w-4 h-4 shrink-0" strokeWidth={2} />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbItems.length > 0 && breadcrumbItems[0].href !== "/" && (
              <BreadcrumbSeparator />
            )}
            {breadcrumbItems.flatMap((item, i) => {
              const isOnlyDashboard = breadcrumbItems.length === 1 && item.href === "/"
              if (isOnlyDashboard) return []
              return [
                ...(i > 0 ? [<BreadcrumbSeparator key={`sep-${item.href}`} />] : []),
                <BreadcrumbItem key={item.href} className="inline-flex items-center gap-1.5">
                  {item.isLast ? (
                    <BreadcrumbPage className="text-foreground font-semibold truncate max-w-[160px] sm:max-w-[220px]">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        href={item.href}
                        className="text-primary hover:opacity-90 transition-colors truncate max-w-[140px] sm:max-w-[180px]"
                      >
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>,
              ]
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Center: Company name (fixed in the middle) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <h1 className="text-sm font-bold truncate max-w-[180px] sm:max-w-[240px]" title={organization?.name ?? "CAA"}>
          {organization?.name ?? "CAA"}
        </h1>
      </div>

      {/* Right: Help, theme, user */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Help button */}
        <button
          className="p-1 rounded-md hover:bg-muted transition-colors"
          aria-label="Help"
          title="Help"
        >
          <HelpCircle className="w-4 h-4 text-foreground" />
        </button>

        {/* Dark Mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          aria-label="Toggle theme"
          title={mounted && theme === "light" ? "Dark Mode" : "Light Mode"}
          suppressHydrationWarning
        >
          {mounted && theme === "light" ? (
            <Moon className="w-4 h-4 text-foreground" />
          ) : mounted && theme === "dark" ? (
            <Sun className="w-4 h-4 text-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-foreground" />
          )}
        </button>

        {/* User icon, name, and logout */}
        {user && (
          <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-0 border-l border-border">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-foreground hidden sm:inline">
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
              className="p-1 rounded-md hover:bg-muted hover:text-destructive transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-foreground" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

