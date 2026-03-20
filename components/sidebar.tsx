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
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { getUserData, getRoleFromUser } from "@/lib/api/index"

interface SidebarProps {
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (open: boolean) => void
  collapsed?: boolean
}

type NavItem =
  | { type: 'item'; icon: React.ElementType; label: string; path: string }
  | { type: 'group'; icon: React.ElementType; label: string; children: { icon: React.ElementType; label: string; path: string }[] }

export function Sidebar({ mobileMenuOpen: externalMobileMenuOpen, setMobileMenuOpen: setExternalMobileMenuOpen, collapsed = false }: SidebarProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Email Management']))
  const user = getUserData()
  const role = getRoleFromUser(user)?.toLowerCase()

  const mobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen
  const setMobileMenuOpen = setExternalMobileMenuOpen || setInternalMobileMenuOpen

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const menuItems: NavItem[] =
    role === 'client'
      ? [{ type: 'item', icon: Upload, label: 'Uploads', path: '/uploads' }]
      : [
          { type: 'item', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
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
          { type: 'item', icon: Bell, label: 'Notifications', path: '/notifications' },
          { type: 'item', icon: Settings, label: 'Settings', path: '/settings' },
        ]

  const getActivePage = () => {
    for (const item of menuItems) {
      if (item.type === 'item') {
        if (pathname === item.path) return item.label
        if (item.path !== '/' && pathname.startsWith(item.path)) return item.label
      } else {
        for (const child of item.children) {
          if (pathname === child.path || pathname.startsWith(child.path)) return child.label
        }
      }
    }
    return 'Dashboard'
  }

  const activePage = getActivePage()

  const isGroupActive = (item: NavItem) =>
    item.type === 'group' && item.children.some((c) => pathname === c.path || pathname.startsWith(c.path))

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
            <SheetTitle className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-sm shrink-0"
                aria-hidden
              >
                AI
              </div>
              <span className="text-lg font-semibold tracking-tight">
                AIFlow
              </span>
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
        {/* Brand / Header — logo always visible; when collapsed only the circle shows */}
        <div
          className={`shrink-0 border-b border-sidebar-border ${collapsed ? "py-4 px-2" : "py-5 px-3"}`}
        >
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <div
              className="w-10 h-10 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-sm shrink-0"
              aria-hidden
            >
              AI
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold tracking-tight truncate">
                AIFlow
              </span>
            )}
          </div>
        </div>

        {renderMenuItems(collapsed)}
      </aside>
    </>
  )
}
