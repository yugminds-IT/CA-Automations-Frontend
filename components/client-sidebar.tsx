"use client"

/**
 * Client Sidebar Component
 * 
 * This sidebar is used specifically for client login functionality.
 * UI matches the main sidebar.tsx component.
 */

import {
  Lock,
  Users,
  ArrowLeft,
  Settings,
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

interface ClientSidebarProps {
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (open: boolean) => void
  collapsed?: boolean
}

export function ClientSidebar({ mobileMenuOpen: externalMobileMenuOpen, setMobileMenuOpen: setExternalMobileMenuOpen, collapsed = false }: ClientSidebarProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false)
  
  // Use external state if provided, otherwise use internal state
  const mobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen
  const setMobileMenuOpen = setExternalMobileMenuOpen || setInternalMobileMenuOpen

  // Menu items with navigation - client login specific
  const menuItems = [
    { icon: Lock, label: "Client Login", path: "/client-management" },
    { icon: Users, label: "Client Management", path: "/client-management" },
    { icon: ArrowLeft, label: "Back to Dashboard", path: "/" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ] as const

  // Determine active page based on current pathname
  const getActivePage = () => {
    // Check for exact match first
    const exactMatch = menuItems.find(item => item.path === pathname)
    if (exactMatch) return exactMatch.label
    
    // Check for pathname that starts with menu item path (for nested routes)
    const pathMatch = menuItems.find(item => pathname.startsWith(item.path) && item.path !== '/')
    if (pathMatch) return pathMatch.label
    
    return "Client Login"
  }
  
  const activePage = getActivePage()

  // Render menu items (used in both desktop sidebar and mobile menu)
  const renderMenuItems = (isCollapsed: boolean = false) => (
    <>
      {/* Navigation Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activePage === item.label
          const menuItem = (
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                router.push(item.path)
              }}
              className={`w-full ${isCollapsed ? 'px-2 justify-center' : 'px-4'} py-3 flex items-center ${isCollapsed ? '' : 'gap-3'} text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          )

          if (isCollapsed) {
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    {menuItem}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          }

          return (
            <div key={item.label}>
              {menuItem}
            </div>
          )
        })}
      </nav>
    </>
  )

  return (
    <>
      {/* Mobile/Tablet Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="bg-sidebar text-sidebar-foreground w-[280px] sm:w-[320px] p-0">
          <SheetHeader className="p-6 border-b border-sidebar-border">
            <SheetTitle className="flex items-center">
              <img src="/Light.png" className="h-12 w-auto max-w-[180px] object-contain dark:hidden" alt="Lekvya" />
              <img src="/Dark.png" className="h-12 w-auto max-w-[180px] object-contain hidden dark:block" alt="Lekvya" />
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100vh-120px)] px-2">
            {renderMenuItems()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: Sidebar on the left */}
      <aside
        className="hidden lg:flex bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border m-0 py-0 h-screen fixed top-0 bottom-0 left-0 transition-all duration-300"
        style={{ 
          width: collapsed ? "60px" : "240px",
          paddingLeft: collapsed ? "0" : "0.5rem",
          paddingRight: collapsed ? "0" : "0.5rem"
        }}
      >
        {/* Header */}
        <div className={`${collapsed ? 'p-2' : 'p-6'} border-b border-sidebar-border`}>
          <div className="flex items-center justify-center">
            {collapsed ? (
              <>
                <img src="/Light.png" className="h-10 w-10 object-contain dark:hidden" alt="Lekvya" />
                <img src="/Dark.png" className="h-10 w-10 object-contain hidden dark:block" alt="Lekvya" />
              </>
            ) : (
              <>
                <img src="/Light.png" className="h-12 w-auto max-w-[180px] object-contain dark:hidden" alt="Lekvya" />
                <img src="/Dark.png" className="h-12 w-auto max-w-[180px] object-contain hidden dark:block" alt="Lekvya" />
              </>
            )}
          </div>
        </div>

        {renderMenuItems(collapsed)}
      </aside>
    </>
  )
}
