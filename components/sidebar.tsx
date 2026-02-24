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
  Menu,
  Users,
  Upload,
  Mail,
} from "lucide-react"
import { Send } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { getUserData } from "@/lib/api/index"

interface SidebarProps {
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (open: boolean) => void
  collapsed?: boolean
}

export function Sidebar({ mobileMenuOpen: externalMobileMenuOpen, setMobileMenuOpen: setExternalMobileMenuOpen, collapsed = false }: SidebarProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false)
  const user = getUserData()
  const role = user?.role as string | undefined
  
  // Use external state if provided, otherwise use internal state
  const mobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen
  const setMobileMenuOpen = setExternalMobileMenuOpen || setInternalMobileMenuOpen

  // Menu items with navigation
  const menuItems =
    role === 'client'
      ? [{ icon: Upload, label: "Uploads", path: "/uploads" }]
      : [
          { icon: LayoutDashboard, label: "Dashboard", path: "/" },
          { icon: Users, label: "Client Management", path: "/client-management" },
          { icon: Send, label: "Mail Scheduler", path: "/all-clients-mail-setup" },
          { icon: Mail, label: "Email Templates", path: "/email-templates" },
          { icon: Bell, label: "Notifications", path: "/notifications" },
          { icon: Settings, label: "Settings", path: "/settings" },
        ]

  // Determine active page based on current pathname
  const getActivePage = () => {
    // Check for exact match first
    const exactMatch = menuItems.find(item => item.path === pathname)
    if (exactMatch) return exactMatch.label
    
    // Check for pathname that starts with menu item path (for nested routes)
    const pathMatch = menuItems.find(item => pathname.startsWith(item.path) && item.path !== '/')
    if (pathMatch) return pathMatch.label
    
    return "Dashboard"
  }
  
  const activePage = getActivePage()

  // Render menu items (used in both desktop sidebar and mobile menu)
  const renderMenuItems = (isCollapsed: boolean = false) => (
    <>
      <nav className="flex-1 py-4 overflow-y-auto" aria-label="Main navigation">
        <ul className={isCollapsed ? "space-y-0.5" : "space-y-1"} role="list">
          {menuItems.map((item) => {
            const isActive = activePage === item.label
            const menuItem = (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    router.push(item.path)
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    relative w-full flex items-center text-[13px] font-medium
                    rounded-none transition-all duration-200 ease-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar
                    ${isCollapsed ? "px-2 justify-center py-3" : "px-3 py-2.5 gap-3"}
                    ${isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 dark:hover:bg-sidebar-accent/30"
                    }
                  `}
                >
                  {/* Active indicator: left accent bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sidebar-primary"
                      aria-hidden
                    />
                  )}
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            )

            if (isCollapsed) {
              return (
                <Tooltip key={item.label} delayDuration={300}>
                  <TooltipTrigger asChild>{menuItem}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }
            return menuItem
          })}
        </ul>
      </nav>
    </>
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
        className="hidden lg:flex bg-sidebar text-sidebar-foreground flex-col h-screen fixed top-0 bottom-0 left-0 z-40 transition-[width,padding] duration-300 ease-out"
        style={{
          width: collapsed ? "60px" : "15%",
          paddingLeft: collapsed ? "0" : "0.75rem",
          paddingRight: collapsed ? "0" : "0.75rem",
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
