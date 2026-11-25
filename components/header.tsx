"use client"

import { User as UserIcon, Menu, LogOut, Sun, Moon, PanelLeft, Home, Send, FileText, Clock, Bell } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { getUserData, getOrganizationData, logout, listNotifications } from "@/lib/api/index"
import { getIndustryMailConfig } from "@/lib/industry-config"
import type { User, Organization } from "@/lib/api/index"
import { useTheme } from "./theme-provider"
import { useRealtimeEvent } from "@/lib/realtime"
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

// Email Management dropdown items (mirrors sidebar)
const EMAIL_MANAGEMENT_ITEMS = [
  { icon: Send, label: 'Send Mails', path: '/all-clients-mail-setup' },
  { icon: FileText, label: 'Templates', path: '/email-templates' },
  { icon: Clock, label: 'Scheduled Mails', path: '/email-management/scheduled-mails' },
]

// Flat routes that belong under Email Management (need virtual parent injected)
const EMAIL_MANAGEMENT_FLAT: Record<string, string> = {
  '/all-clients-mail-setup': 'Send Mails',
  '/email-templates': 'Email Templates',
}

// Route segment to breadcrumb label
const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  dashboard: "Dashboard",
  "client-management": "Client Management",
  "email-management": "Email Management",
  "all-clients-mail-setup": "Send Mails",
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
  const [emailDropdownOpen, setEmailDropdownOpen] = useState(false)
  const emailDropdownRef = useRef<HTMLDivElement>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [subscriptionExpiringSoon, setSubscriptionExpiringSoon] = useState(false)

  // Industry Mail Config
  const currentOrgData = organization ?? getOrganizationData() ?? (user as any)?.organization ?? null
  const currentIndustry = currentOrgData?.industry || (user as any)?.organization?.industry || 'financial_services'
  const industryConfig = getIndustryMailConfig(currentIndustry)

  // Build breadcrumb items from current pathname
  const breadcrumbItems = (() => {
    const segments = pathname.split("/").filter(Boolean)
    const items: { href: string; label: string; isLast: boolean }[] = []
    let acc = ""
    segments.forEach((segment, i) => {
      acc += `/${segment}`
      let label = pathSegmentToLabel(segment, acc.slice(0, -segment.length - 1))
      if (acc === '/all-clients-mail-setup') {
        label = industryConfig.breadcrumbLabel
      }
      items.push({ href: acc, label, isLast: i === segments.length - 1 })
    })
    if (items.length === 0) {
      items.push({ href: "/", label: "Dashboard", isLast: true })
    }
    // Inject virtual parent for flat email routes with industry-specific group name
    const flatLabel = EMAIL_MANAGEMENT_FLAT[pathname]
    if (flatLabel && items.length === 1) {
      items[0].isLast = true
      items.unshift({ href: '#', label: industryConfig.groupLabel, isLast: false })
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
      if (orgData.accessUntil) {
        const msLeft = new Date(orgData.accessUntil).getTime() - Date.now()
        const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24))
        setSubscriptionExpiringSoon(daysLeft <= 10)
      }
    } else {
      setOrganization(null)
    }
  }

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

    const handleClickOutside = (e: MouseEvent) => {
      if (emailDropdownRef.current && !emailDropdownRef.current.contains(e.target as Node)) {
        setEmailDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('userDataUpdated', handleCustomStorage)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Poll unread notification count every 60s for org users (fallback if the socket is down)
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await listNotifications({ limit: 1 })
        setUnreadNotifications(res.unread)
      } catch {
        // not an org user or not logged in — ignore
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Live update as soon as a new notification is created
  useRealtimeEvent('notification.created', () => {
    listNotifications({ limit: 1 })
      .then((res) => setUnreadNotifications(res.unread))
      .catch(() => {})
  })

  return (
    <header className="sticky top-0 z-40 h-16 shrink-0 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 text-foreground border-b border-border flex items-center justify-between gap-3 px-3 sm:px-6">
      {/* Left: menu, sidebar toggle, breadcrumb (example style – Home icon, teal links, gray chevrons) */}
      <div className="flex flex-1 min-w-0 overflow-hidden items-center gap-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="hidden lg:flex p-2 rounded-md hover:bg-muted transition-colors shrink-0"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}
        <Breadcrumb className="hidden sm:block min-w-0">
          <BreadcrumbList className="flex-nowrap whitespace-nowrap gap-1.5 text-sm font-medium [&_[data-slot=breadcrumb-separator]]:text-muted-foreground [&_[data-slot=breadcrumb-separator]>svg]:size-4">
            {/* Home icon as first item */}
            <BreadcrumbItem className="inline-flex items-center gap-1.5">
              <BreadcrumbLink asChild>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-primary hover:opacity-90 transition-colors"
                  aria-label="Home"
                >
                  <Home className="w-4 h-4 shrink-0" strokeWidth={2} />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbItems.length > 0 && breadcrumbItems[0].href !== "/dashboard" && (
              <BreadcrumbSeparator />
            )}
            {breadcrumbItems.flatMap((item, i) => {
              const isOnlyDashboard = breadcrumbItems.length === 1 && item.href === "/dashboard"
              if (isOnlyDashboard) return []
              const isEmailManagement = item.href === '/email-management'
              return [
                ...(i > 0 ? [<BreadcrumbSeparator key={`sep-${item.href}`} />] : []),
                <BreadcrumbItem key={item.href} className="inline-flex items-center gap-1.5">
                  {item.isLast && !isEmailManagement ? (
                    <BreadcrumbPage className="text-foreground font-semibold truncate max-w-[160px] sm:max-w-[220px]">
                      {item.label}
                    </BreadcrumbPage>
                  ) : isEmailManagement ? (
                    <div ref={emailDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setEmailDropdownOpen((v) => !v)}
                        className="inline-flex items-center gap-1 text-primary hover:opacity-90 transition-colors text-sm font-medium"
                      >
                        {item.label}
                      </button>
                      {emailDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1.5 w-48 rounded-lg border border-border bg-popover shadow-md z-50 py-1 text-sm">
                          {EMAIL_MANAGEMENT_ITEMS.map((em) => {
                            const Icon = em.icon
                            const isActive = pathname === em.path
                            return (
                              <Link
                                key={em.path}
                                href={em.path}
                                onClick={() => setEmailDropdownOpen(false)}
                                className={`flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors ${isActive ? 'text-primary font-medium bg-muted' : 'text-foreground'}`}
                              >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                {em.label}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
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

      {/* Right: Help, theme, user */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Help button */}
        
        {/* Notification bell */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="w-5 h-5 text-foreground" />
          {(unreadNotifications + (subscriptionExpiringSoon ? 1 : 0)) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground leading-none">
              {unreadNotifications + (subscriptionExpiringSoon ? 1 : 0) > 99 ? "99+" : unreadNotifications + (subscriptionExpiringSoon ? 1 : 0)}
            </span>
          )}
        </Link>

        {/* Dark Mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle theme"
          title={mounted && theme === "light" ? "Dark Mode" : "Light Mode"}
          suppressHydrationWarning
        >
          {mounted && theme === "light" ? (
            <Moon className="w-5 h-5 text-foreground" />
          ) : mounted && theme === "dark" ? (
            <Sun className="w-5 h-5 text-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-foreground" />
          )}
        </button>

        {/* User icon, name, and logout */}
        {user && (
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-border">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight min-w-0">
              <span className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                {(user as any).name ?? (user as any).full_name ?? user.email ?? 'User'}
              </span>
              {organization?.name && (
                <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={organization.name}>{organization.name}</span>
              )}
            </div>
            {/* Logout button */}
            <button
              onClick={async () => {
                await logout()
                window.location.replace("/login")
              }}
              className="p-2 rounded-lg hover:bg-muted hover:text-destructive transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-foreground" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

