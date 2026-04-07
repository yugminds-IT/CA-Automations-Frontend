"use client"

/**
 * Master Admin Sidebar Component - Redesigned
 *
 * Clean, dark enterprise sidebar with Professional Blue (#2563EB) active state,
 * grouped navigation with section labels, and smooth collapse/expand behavior.
 */

import {
  LayoutDashboard,
  Settings,
  Bell,
  Users,
  Building2,
  Activity,
  FileText,
  BarChart3,
  Mail,
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

interface MasterAdminSidebarProps {
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (open: boolean) => void
  collapsed?: boolean
}

const menuGroups = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/master-admin" },
    ],
  },
  {
    label: "Management",
    items: [
      { icon: Users, label: "User Management", path: "/master-admin/users" },
      { icon: Building2, label: "Organizations", path: "/master-admin/organizations" },
      { icon: Mail, label: "Email Templates", path: "/master-admin/email-templates" },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { icon: Activity, label: "System Activity", path: "/master-admin/activity" },
      { icon: BarChart3, label: "Analytics", path: "/master-admin/analytics" },
      { icon: FileText, label: "Reports", path: "/master-admin/reports" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: Bell, label: "Notifications", path: "/master-admin/notifications" },
      { icon: Settings, label: "Settings", path: "/master-admin/settings" },
    ],
  },
]

const allItems = menuGroups.flatMap((g) => g.items)

export function MasterAdminSidebar({
  mobileMenuOpen: externalMobileMenuOpen,
  setMobileMenuOpen: setExternalMobileMenuOpen,
  collapsed = false,
}: MasterAdminSidebarProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false)

  const mobileMenuOpen =
    externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen
  const setMobileMenuOpen = setExternalMobileMenuOpen || setInternalMobileMenuOpen

  const getActivePage = () => {
    const exactMatch = allItems.find((item) => item.path === pathname)
    if (exactMatch) return exactMatch.label
    const pathMatch = allItems.find(
      (item) => pathname.startsWith(item.path) && item.path !== "/master-admin"
    )
    if (pathMatch) return pathMatch.label
    return "Dashboard"
  }

  const activePage = getActivePage()

  const renderNavItem = (
    item: (typeof allItems)[0],
    isCollapsed: boolean
  ) => {
    const isActive = activePage === item.label
    const button = (
      <button
        onClick={() => {
          setMobileMenuOpen(false)
          router.push(item.path)
        }}
        className={`w-full flex items-center ${
          isCollapsed ? "justify-center px-2" : "gap-3 px-3"
        } py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? "bg-[#2563EB] text-white shadow-sm"
            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
        }`}
      >
        <item.icon
          className={`w-4 h-4 flex-shrink-0 ${
            isActive ? "text-white" : "text-[#64748B]"
          }`}
        />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
        {!isCollapsed && isActive && (
          <ChevronRight className="w-3 h-3 ml-auto text-white/70 flex-shrink-0" />
        )}
      </button>
    )

    if (isCollapsed) {
      return (
        <Tooltip key={item.label}>
          <TooltipTrigger asChild>
            <div className="w-full">{button}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      )
    }

    return <div key={item.label}>{button}</div>
  }

  const renderMenuItems = (isCollapsed: boolean = false) => (
    <nav className="flex-1 overflow-y-auto py-3">
      {isCollapsed ? (
        <div className="px-2 space-y-1">
          {allItems.map((item) => renderNavItem(item, true))}
        </div>
      ) : (
        menuGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-4 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
                {group.label}
              </span>
            </div>
            <div className="px-2 space-y-0.5">
              {group.items.map((item) => renderNavItem(item, false))}
            </div>
          </div>
        ))
      )}
    </nav>
  )

  const brandSection = (isCollapsed: boolean) => (
    <div
      className={`${
        isCollapsed ? "p-3" : "px-4 py-5"
      } border-b border-[#1E293B] flex-shrink-0`}
    >
      <div className="flex items-center justify-center">
        {isCollapsed ? (
          <img src="/Dark.png" className="h-10 w-10 object-contain" alt="Lekvya" />
        ) : (
          <img src="/Dark.png" className="h-12 w-auto max-w-[180px] object-contain" alt="Lekvya" />
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="bg-[#0F172A] text-white w-[260px] p-0 border-r border-[#1E293B]"
        >
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          </SheetHeader>
          {brandSection(false)}
          <div className="flex flex-col h-[calc(100vh-73px)] overflow-y-auto">
            {renderMenuItems(false)}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex bg-[#0F172A] flex-col border-r border-[#1E293B] h-screen fixed top-0 bottom-0 left-0 transition-all duration-300 z-40"
        style={{ width: collapsed ? "60px" : "240px" }}
      >
        {brandSection(collapsed)}
        {renderMenuItems(collapsed)}

      </aside>
    </>
  )
}
