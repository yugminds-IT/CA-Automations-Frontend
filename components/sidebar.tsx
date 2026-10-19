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
  Bell,
  Users,
  Upload,
  Mail,
  Send,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  KeyRound,
  Inbox,
  Code2,
  ListOrdered,
  ShoppingCart,
  HeartPulse,
  Rocket,
  Globe,
  Webhook,
  ShieldCheck,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { getUserData, getRoleFromUser, getOrganizationData } from "@/lib/api/index"

interface SidebarProps {
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (open: boolean) => void
  collapsed?: boolean
}

type NavItem =
  | { type: 'item'; icon: React.ElementType; label: string; path: string }
  | { type: 'group'; icon: React.ElementType; label: string; children: { icon: React.ElementType; label: string; path: string }[] }

function getMenuItemsForIndustry(industry: string, role?: string): NavItem[] {
  if (role === 'client') {
    return [{ type: 'item', icon: Upload, label: 'Uploads', path: '/uploads' }]
  }

  const dashboardItem: NavItem = { type: 'item', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' }
  const notificationsItem: NavItem = { type: 'item', icon: Bell, label: 'Notifications', path: '/notifications' }
  const settingsItem: NavItem = {
    type: 'group',
    icon: Settings,
    label: 'Settings',
    children: [
      { icon: Settings, label: 'General & SMTP', path: '/settings' },
      { icon: Globe, label: 'Sending Domains', path: '/settings/domains' },
    ],
  }

  switch (industry) {
    case 'school':
    case 'education':
      return [
        dashboardItem,
        {
          type: 'group',
          icon: GraduationCap,
          label: 'Students & Parents',
          children: [
            { icon: Users, label: 'Student Directory & Batches', path: '/client-management' },
            { icon: Send, label: 'Send Fees & Exam Notices', path: '/all-clients-mail-setup' },
            { icon: FileText, label: 'Student Notice Templates', path: '/email-templates' },
            { icon: Clock, label: 'Scheduled Notices', path: '/email-management/scheduled-mails' },
          ],
        },
        {
          type: 'group',
          icon: Globe,
          label: 'Faculty & Administration',
          children: [
            { icon: Users, label: 'Lecturers, Teachers & Staff', path: '/client-management' },
            { icon: Send, label: 'Director & HOD Circulars', path: '/all-clients-mail-setup' },
            { icon: FileText, label: 'Faculty Council Templates', path: '/email-templates' },
          ],
        },
        notificationsItem,
        settingsItem,
      ]

    case 'website_developer':
      return [
        dashboardItem,
        { type: 'item', icon: Users, label: 'Clients & Contacts', path: '/client-management' },
        {
          type: 'group',
          icon: KeyRound,
          label: 'Developer API',
          children: [
            { icon: KeyRound, label: 'API Keys', path: '/developer/keys' },
            { icon: Inbox, label: 'Form Inquiries', path: '/developer/inbox' },
            { icon: Code2, label: 'HTML Form Code', path: '/developer/quickstart' },
            { icon: Webhook, label: 'Webhooks', path: '/developer/webhooks' },
            { icon: ListOrdered, label: 'Delivery Logs', path: '/developer/logs' },
          ],
        },
        {
          type: 'group',
          icon: Mail,
          label: 'Email & Templates',
          children: [
            { icon: FileText, label: 'Auto-Responders', path: '/email-templates' },
            { icon: Send, label: 'Broadcast Mailer', path: '/all-clients-mail-setup' },
            { icon: Clock, label: 'Scheduled Mails', path: '/email-management/scheduled-mails' },
          ],
        },
        notificationsItem,
        settingsItem,
      ]

    case 'ecommerce':
      return [
        dashboardItem,
        {
          type: 'group',
          icon: ShoppingCart,
          label: 'Commerce & Orders',
          children: [
            { icon: Users, label: 'Customer Directory', path: '/client-management' },
            { icon: Send, label: 'Order Notifications', path: '/all-clients-mail-setup' },
            { icon: FileText, label: 'Store Templates', path: '/email-templates' },
            { icon: Clock, label: 'Scheduled Drips', path: '/email-management/scheduled-mails' },
          ],
        },
        {
          type: 'group',
          icon: KeyRound,
          label: 'Developer API',
          children: [
            { icon: KeyRound, label: 'Store API Keys', path: '/developer/keys' },
            { icon: ListOrdered, label: 'Order Email Logs', path: '/developer/logs' },
          ],
        },
        notificationsItem,
        settingsItem,
      ]

    case 'healthcare':
      return [
        dashboardItem,
        {
          type: 'group',
          icon: HeartPulse,
          label: 'Clinic & Patients',
          children: [
            { icon: Users, label: 'Patient Directory', path: '/client-management' },
            { icon: Send, label: 'Appointment Reminders', path: '/all-clients-mail-setup' },
            { icon: FileText, label: 'Clinical Templates', path: '/email-templates' },
            { icon: Clock, label: 'Scheduled Reminders', path: '/email-management/scheduled-mails' },
          ],
        },
        notificationsItem,
        settingsItem,
      ]

    case 'saas':
      return [
        dashboardItem,
        {
          type: 'group',
          icon: Rocket,
          label: 'App & Users',
          children: [
            { icon: Users, label: 'User Base', path: '/client-management' },
            { icon: KeyRound, label: 'Developer API Keys', path: '/developer/keys' },
            { icon: Webhook, label: 'Webhooks', path: '/developer/webhooks' },
            { icon: Code2, label: 'API Quickstart', path: '/developer/quickstart' },
            { icon: ListOrdered, label: 'Event Logs', path: '/developer/logs' },
          ],
        },
        {
          type: 'group',
          icon: Mail,
          label: 'Email Campaigns',
          children: [
            { icon: FileText, label: 'Lifecycle Templates', path: '/email-templates' },
            { icon: Send, label: 'Broadcast Mailer', path: '/all-clients-mail-setup' },
            { icon: Clock, label: 'Scheduled Drips', path: '/email-management/scheduled-mails' },
          ],
        },
        notificationsItem,
        settingsItem,
      ]

    case 'financial_services':
    default:
      return [
        dashboardItem,
        { type: 'item', icon: Users, label: 'Client Management', path: '/client-management' },
        {
          type: 'group',
          icon: Mail,
          label: 'Email Management',
          children: [
            { icon: Send, label: 'Send Mails', path: '/all-clients-mail-setup' },
            { icon: FileText, label: 'Templates', path: '/email-templates' },
            { icon: Clock, label: 'Scheduled Mails', path: '/email-management/scheduled-mails' },
          ],
        },
        {
          type: 'group',
          icon: KeyRound,
          label: 'Developer API',
          children: [
            { icon: KeyRound, label: 'API Keys', path: '/developer/keys' },
            { icon: Inbox, label: 'Form Inquiries', path: '/developer/inbox' },
            { icon: Webhook, label: 'Webhooks', path: '/developer/webhooks' },
            { icon: ListOrdered, label: 'Delivery Logs', path: '/developer/logs' },
          ],
        },
        notificationsItem,
        settingsItem,
      ]
  }
}

export function Sidebar({ mobileMenuOpen: externalMobileMenuOpen, setMobileMenuOpen: setExternalMobileMenuOpen, collapsed = false }: SidebarProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const DEFAULT_EXPANDED_GROUPS = [
    'Email & Templates',
    'Email Management',
    'Email Campaigns',
    'Developer API',
    'Students & Parents',
    'Faculty & Administration',
    'Commerce & Orders',
    'Clinic & Patients',
    'App & Users',
    'School & Notices',
    'Settings',
  ]

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(DEFAULT_EXPANDED_GROUPS))
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false)
  const [industry, setIndustry] = useState<string>('financial_services')
  const [userRole, setUserRole] = useState<string | undefined>(undefined)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_expanded_groups')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setExpandedGroups(new Set([...parsed, 'Email & Templates']))
        }
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    const refreshData = () => {
      const user = getUserData()
      const org = getOrganizationData()
      const role = getRoleFromUser(user)?.toLowerCase()
      setUserRole(role)
      setIndustry(org?.industry || user?.organization?.industry || 'financial_services')
    }
    refreshData()
    window.addEventListener('userDataUpdated', refreshData)
    return () => window.removeEventListener('userDataUpdated', refreshData)
  }, [])

  const mobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen
  const setMobileMenuOpen = setExternalMobileMenuOpen || setInternalMobileMenuOpen

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      try {
        localStorage.setItem('sidebar_expanded_groups', JSON.stringify(Array.from(next)))
      } catch (e) {}
      return next
    })
  }

  const menuItems: NavItem[] = getMenuItemsForIndustry(industry, userRole)

  useEffect(() => {
    for (const item of menuItems) {
      if (item.type === 'group') {
        const hasActiveChild = item.children.some(
          (c) => pathname === c.path || (c.path !== '/dashboard' && pathname.startsWith(c.path + '/'))
        )
        if (hasActiveChild) {
          setExpandedGroups((prev) => {
            if (prev.has(item.label)) return prev
            const next = new Set(prev)
            next.add(item.label)
            try {
              localStorage.setItem('sidebar_expanded_groups', JSON.stringify(Array.from(next)))
            } catch (e) {}
            return next
          })
        }
      }
    }
  }, [pathname, menuItems])

  const getActivePage = () => {
    // 1. Exact match takes highest priority
    for (const item of menuItems) {
      if (item.type === 'item') {
        if (pathname === item.path) return item.label
      } else {
        for (const child of item.children) {
          if (pathname === child.path) return child.label
        }
      }
    }

    // 2. Prefix match for nested sub-routes (e.g. /settings/sub-page)
    let bestMatch: { label: string; path: string } | null = null
    for (const item of menuItems) {
      if (item.type === 'item') {
        if (item.path !== '/dashboard' && pathname.startsWith(item.path + '/')) {
          if (!bestMatch || item.path.length > bestMatch.path.length) {
            bestMatch = { label: item.label, path: item.path }
          }
        }
      } else {
        for (const child of item.children) {
          if (pathname.startsWith(child.path + '/')) {
            if (!bestMatch || child.path.length > bestMatch.path.length) {
              bestMatch = { label: child.label, path: child.path }
            }
          }
        }
      }
    }

    if (bestMatch) return bestMatch.label
    return 'Dashboard'
  }

  const activePage = getActivePage()

  const isGroupActive = (item: NavItem) =>
    item.type === 'group' && item.children.some((c) => pathname === c.path || (c.path !== '/dashboard' && pathname.startsWith(c.path + '/')))

  const renderMenuItems = (isCollapsed: boolean = false) => (
    <nav className="flex-1 py-4 overflow-y-auto" aria-label="Main navigation">
      <ul className={isCollapsed ? 'space-y-0.5' : 'space-y-1'} role="list">
        {menuItems.map((item) => {
          if (item.type === 'item') {
            const isActive = activePage === item.label
            const btn = (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); router.push(item.path) }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    relative w-full flex items-center text-[13px] font-medium
                    rounded-none transition-all duration-200 ease-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar
                    ${isCollapsed ? 'px-2 justify-center py-3' : 'px-3 py-2.5 gap-3'}
                    ${isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 dark:hover:bg-sidebar-accent/30'
                    }
                  `}
                >
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sidebar-primary" aria-hidden />}
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            )
            if (isCollapsed) {
              return (
                <Tooltip key={item.label} delayDuration={300}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="text-xs">{item.label}</TooltipContent>
                </Tooltip>
              )
            }
            return btn
          }

          // Group item
          const groupActive = isGroupActive(item)
          const isExpanded = expandedGroups.has(item.label)

          if (isCollapsed) {
            return (
              <li key={item.label}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.label)}
                      className={`
                        relative w-full flex items-center justify-center py-3 px-2
                        rounded-none transition-all duration-200 ease-out
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring
                        ${groupActive ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}
                      `}
                    >
                      {groupActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sidebar-primary" aria-hidden />}
                      <item.icon className="w-5 h-5 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="text-xs">{item.label}</TooltipContent>
                </Tooltip>
                {isExpanded && (
                  <ul className="space-y-0.5">
                    {item.children.map((child) => {
                      const childActive = activePage === child.label
                      return (
                        <Tooltip key={child.label} delayDuration={300}>
                          <TooltipTrigger asChild>
                            <li>
                              <button
                                type="button"
                                onClick={() => { setMobileMenuOpen(false); router.push(child.path) }}
                                className={`
                                  relative w-full flex items-center justify-center py-2.5 px-2
                                  rounded-none transition-all duration-200 ease-out
                                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring
                                  ${childActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'}
                                `}
                              >
                                <child.icon className="w-4 h-4 shrink-0" />
                              </button>
                            </li>
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8} className="text-xs">{child.label}</TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          }

          return (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                className={`
                  relative w-full flex items-center text-[13px] font-medium
                  rounded-none transition-all duration-200 ease-out px-3 py-2.5 gap-3
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring
                  ${groupActive ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent/50 dark:hover:bg-sidebar-accent/30'}
                `}
              >
                {groupActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sidebar-primary" aria-hidden />}
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="truncate flex-1 text-left">{item.label}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0 opacity-60" /> : <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />}
              </button>
              {isExpanded && (
                <ul className="space-y-0.5 mt-0.5">
                  {item.children.map((child) => {
                    const childActive = activePage === child.label
                    return (
                      <li key={child.label}>
                        <button
                          type="button"
                          onClick={() => { setMobileMenuOpen(false); router.push(child.path) }}
                          aria-current={childActive ? 'page' : undefined}
                          className={`
                            relative w-full flex items-center text-[12px] font-medium
                            rounded-none transition-all duration-200 ease-out
                            pl-9 pr-3 py-2 gap-2.5
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring
                            ${childActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'}
                          `}
                        >
                          {childActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary" aria-hidden />}
                          <child.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{child.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )

  return (
    <>
      {/* Mobile/Tablet Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="right"
          className="bg-sidebar text-sidebar-foreground w-[min(320px,100vw-2rem)] p-0 rounded-none border-sidebar-border shadow-xl"
        >
          <SheetHeader className="p-5 border-b border-sidebar-border/80">
            <SheetTitle className="flex items-center">
              <img src="/Light.png" className="h-12 w-auto max-w-[180px] object-contain dark:hidden" alt="Lekvya" />
              <img src="/Light.png" className="h-12 w-auto max-w-[180px] object-contain hidden dark:block" alt="Lekvya" />
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-5.5rem)] flex flex-col px-3 py-4 overflow-hidden">
            {renderMenuItems()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: Sidebar — straight edges, no curves */}
      <aside
        role="navigation"
        aria-label="Sidebar"
        className="hidden lg:flex bg-sidebar text-sidebar-foreground flex-col h-screen fixed top-0 bottom-0 left-0 z-[51] transition-[width] duration-300 ease-out"
        style={{
          width: collapsed ? "60px" : "240px",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Brand / Header */}
        <div
          className={`shrink-0 border-b border-sidebar-border ${collapsed ? "py-4 px-2" : "py-5 px-3"}`}
        >
          <div className="flex items-center justify-center">
            {collapsed ? (
              <>
                <img src="/Light.png" className="h-10 w-10 object-contain dark:hidden" alt="Lekvya" />
                <img src="/Light.png" className="h-10 w-10 object-contain hidden dark:block" alt="Lekvya" />
              </>
            ) : (
              <>
                <img src="/Light.png" className="h-12 w-auto max-w-[180px] object-contain dark:hidden" alt="Lekvya" />
                <img src="/Light.png" className="h-12 w-auto max-w-[180px] object-contain hidden dark:block" alt="Lekvya" />
              </>
            )}
          </div>
        </div>

        {renderMenuItems(collapsed)}
      </aside>
    </>
  )
}
