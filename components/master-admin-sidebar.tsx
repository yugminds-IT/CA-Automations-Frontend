"use client"

/**
 * Master Admin Sidebar Component
 * 
 * This sidebar is specifically designed for Master Admin users
 * with different menu items and styling compared to regular admin sidebar.
 */

import {
  LayoutDashboard,
  Settings,
  Bell,
  Menu,
  Users,
  Shield,
  Building2,
  Activity,
  FileText,
  BarChart3,
  Mail,
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
import { getUserData } from "@/lib/api/index"

interface MasterAdminSidebarProps {
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (open: boolean) => void
  collapsed?: boolean
}

export function MasterAdminSidebar({ mobileMenuOpen: externalMobileMenuOpen, setMobileMenuOpen: setExternalMobileMenuOpen, collapsed = false }: MasterAdminSidebarProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false)
  const user = getUserData()
  
  const mobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen
  const setMobileMenuOpen = setExternalMobileMenuOpen || setInternalMobileMenuOpen

  // Master Admin specific menu items
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/master-admin" },
    { icon: Users, label: "User Management", path: "/master-admin/users" },
    { icon: Building2, label: "Organizations", path: "/master-admin/organizations" },
    { icon: Mail, label: "Email Templates", path: "/master-admin/email-templates" },
    { icon: Activity, label: "System Activity", path: "/master-admin/activity" },
    { icon: BarChart3, label: "Analytics", path: "/master-admin/analytics" },
    { icon: FileText, label: "Reports", path: "/master-admin/reports" },
    { icon: Bell, label: "Notifications", path: "/master-admin/notifications" },
    { icon: Settings, label: "Settings", path: "/master-admin/settings" },
  ]

  const getActivePage = () => {
    const exactMatch = menuItems.find(item => item.path === pathname)
    if (exactMatch) return exactMatch.label
    
    const pathMatch = menuItems.find(item => pathname.startsWith(item.path) && item.path !== '/master-admin')
    if (pathMatch) return pathMatch.label
    
    return "Dashboard"
  }
  
  const activePage = getActivePage()

  const renderMenuItems = (isCollapsed: boolean = false) => (
    <>
      <nav className="flex-1 py-2 sm:py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activePage === item.label
          const menuItem = (
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                router.push(item.path)
              }}
              className={`w-full ${isCollapsed ? 'px-2 justify-center' : 'px-3 sm:px-4'} py-2.5 sm:py-3 flex items-center ${isCollapsed ? '' : 'gap-2 sm:gap-3'} text-xs sm:text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-gradient-to-r from-slate-600 to-slate-700 dark:from-purple-800 dark:to-indigo-800 text-white border-l-4 border-amber-400 dark:border-yellow-400"
                  : "text-sidebar-foreground hover:bg-slate-100 dark:hover:bg-purple-900/30 hover:text-slate-700 dark:hover:text-purple-300"
              }`}
            >
              <item.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
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
        <SheetContent side="right" className="bg-gradient-to-b from-slate-50 to-slate-100 dark:from-purple-950 dark:to-indigo-950 text-sidebar-foreground w-[280px] xs:w-[300px] sm:w-[320px] md:w-[340px] p-0">
          <SheetHeader className="p-4 sm:p-6 border-b border-slate-300 dark:border-purple-800">
            <SheetTitle className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-slate-600 to-slate-700 dark:from-purple-600 dark:to-indigo-600 rounded flex items-center justify-center text-white font-bold flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold truncate">Master Admin</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">System Control</p>
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] px-2 sm:px-3 overflow-y-auto">
            {renderMenuItems()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: Sidebar on the left */}
      <aside
        className="hidden lg:flex bg-gradient-to-b from-slate-50 to-slate-100 dark:from-purple-950 dark:to-indigo-950 text-sidebar-foreground flex-col border-r border-slate-300 dark:border-purple-800 m-0 py-0 h-screen fixed top-0 bottom-0 left-0 transition-all duration-300 shadow-lg"
        style={{ 
          width: collapsed ? "60px" : "15%",
          minWidth: collapsed ? "60px" : "200px",
          maxWidth: collapsed ? "60px" : "280px",
          paddingLeft: collapsed ? "0" : "0.5rem",
          paddingRight: collapsed ? "0" : "0.5rem"
        }}
      >
        {/* Header */}
        <div className={`${collapsed ? 'p-2' : 'p-4 xl:p-6'} border-b border-slate-300 dark:border-purple-800 flex-shrink-0`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2 sm:gap-3'}`}>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-slate-600 to-slate-700 dark:from-purple-600 dark:to-indigo-600 rounded flex items-center justify-center text-white font-bold flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-lg xl:text-xl font-bold truncate">Master Admin</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">System Control</p>
              </div>
            )}
          </div>
        </div>

        {renderMenuItems(collapsed)}
      </aside>
    </>
  )
}

