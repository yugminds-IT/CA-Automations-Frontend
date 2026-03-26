"use client"

import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  isAuthenticated,
  isMasterAdminUser,
  getMasterAdminStats,
  type MasterAdminStats,
} from "@/lib/api/index"
import { useToast } from "@/components/ui/use-toast"
import {
  Building2,
  Users,
  Mail,
  Activity,
  ChevronRight,
  Plus,
  UserPlus,
  BarChart3,
  TrendingUp,
} from "lucide-react"

export default function MasterAdminDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [stats, setStats] = useState<MasterAdminStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }
    if (!isMasterAdminUser()) {
      toast({
        title: "Access Denied",
        description: "You must be a master admin to access this page.",
        variant: "destructive",
      })
      router.replace("/")
      return
    }
    setIsCheckingAuth(false)
    loadStats()
  }, [router, toast])

  const loadStats = async () => {
    try {
      setIsLoadingStats(true)
      const data = await getMasterAdminStats()
      setStats(data)
    } catch {
      // silently ignore — UI shows "—" on error
    } finally {
      setIsLoadingStats(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed")
    setSidebarCollapsed(saved !== null ? saved === "true" : true)
  }, [])

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0A0F1E]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
          <p className="text-sm text-[#64748B]">Verifying access…</p>
        </div>
      </div>
    )
  }

  const kpiCards = [
    {
      title: "Total Organizations",
      value: isLoadingStats ? "—" : (stats?.totalOrganizations ?? 0).toString(),
      subtitle: `${stats?.recentOrganizations ?? 0} added last 30 days`,
      icon: Building2,
      iconColor: "text-[#2563EB]",
      iconBg: "bg-[#EFF6FF]",
      badge: "Active",
      badgeColor: "text-[#2563EB] bg-[#EFF6FF]",
      path: "/master-admin/organizations",
    },
    {
      title: "Total Users",
      value: isLoadingStats ? "—" : (stats?.totalUsers ?? 0).toString(),
      subtitle: `${stats?.recentUsers ?? 0} joined last 30 days`,
      icon: Users,
      iconColor: "text-[#22C55E]",
      iconBg: "bg-[#F0FDF4]",
      badge: "All roles",
      badgeColor: "text-[#22C55E] bg-[#F0FDF4]",
      path: "/master-admin/users",
    },
    {
      title: "Email Templates",
      value: isLoadingStats ? "—" : (stats?.totalEmailTemplates ?? 0).toString(),
      subtitle: "System-wide templates",
      icon: Mail,
      iconColor: "text-[#8B5CF6]",
      iconBg: "bg-[#F5F3FF]",
      badge: "5 categories",
      badgeColor: "text-[#8B5CF6] bg-[#F5F3FF]",
      path: "/master-admin/email-templates",
    },
    {
      title: "Active Sessions",
      value: isLoadingStats ? "—" : (stats?.usersByRole?.ORG_ADMIN ?? 0 + (stats?.usersByRole?.CAA ?? 0)).toString(),
      subtitle: "Admins + CA Associates",
      icon: Activity,
      iconColor: "text-[#22C55E]",
      iconBg: "bg-[#F0FDF4]",
      badge: "Org staff",
      badgeColor: "text-[#22C55E] bg-[#F0FDF4]",
      path: "/master-admin/activity",
    },
  ]

  const quickActions = [
    {
      label: "Add Organization",
      icon: Plus,
      path: "/master-admin/organizations",
      color: "bg-[#2563EB] hover:bg-[#1D4ED8]",
    },
    {
      label: "Create User",
      icon: UserPlus,
      path: "/master-admin/users",
      color: "bg-[#22C55E] hover:bg-[#16A34A]",
    },
    {
      label: "View Analytics",
      icon: BarChart3,
      path: "/master-admin/analytics",
      color: "bg-[#8B5CF6] hover:bg-[#7C3AED]",
    },
    {
      label: "Activity Log",
      icon: Activity,
      path: "/master-admin/activity",
      color: "bg-[#F59E0B] hover:bg-[#D97706]",
    },
  ]

  const modules = [
    {
      label: "Organizations",
      desc: "Manage CA firm registrations & admins",
      icon: Building2,
      path: "/master-admin/organizations",
      color: "text-[#2563EB]",
      bg: "bg-[#EFF6FF]",
    },
    {
      label: "User Management",
      desc: "Roles, permissions & user accounts",
      icon: Users,
      path: "/master-admin/users",
      color: "text-[#22C55E]",
      bg: "bg-[#F0FDF4]",
    },
    {
      label: "Email Templates",
      desc: "System notification templates",
      icon: Mail,
      path: "/master-admin/email-templates",
      color: "text-[#8B5CF6]",
      bg: "bg-[#F5F3FF]",
    },
    {
      label: "System Activity",
      desc: "Audit logs & event monitoring",
      icon: Activity,
      path: "/master-admin/activity",
      color: "text-[#F59E0B]",
      bg: "bg-[#FFFBEB]",
    },
    {
      label: "Analytics",
      desc: "Usage metrics & performance",
      icon: TrendingUp,
      path: "/master-admin/analytics",
      color: "text-[#EF4444]",
      bg: "bg-[#FEF2F2]",
    },
    {
      label: "Reports",
      desc: "Export & download system reports",
      icon: BarChart3,
      path: "/master-admin/reports",
      color: "text-[#0EA5E9]",
      bg: "bg-[#F0F9FF]",
    },
  ]

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E] text-foreground overflow-hidden">
      <MasterAdminSidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />
      <div
        className="flex flex-col flex-1 transition-all duration-300 overflow-hidden min-w-0"
        style={{
          marginLeft: isDesktop ? (sidebarCollapsed ? "60px" : "240px") : "0",
        }}
      >
        <MasterAdminHeader
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <div className="overflow-auto flex-1" style={{ marginTop: "56px" }}>
          <div className="p-6 space-y-6 max-w-7xl mx-auto">

            {/* ── Page Header ── */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">
                  Dashboard
                </h1>
                <p className="text-sm text-[#64748B] mt-1">
                  System overview — manage organizations, users, and platform settings.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#64748B] bg-white dark:bg-[#1E293B] px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] flex-shrink-0">
                <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse inline-block" />
                All Systems Online
              </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards.map((card) => (
                <button
                  key={card.title}
                  onClick={() => router.push(card.path)}
                  className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-5 shadow-sm hover:shadow-md hover:border-[#BFDBFE] dark:hover:border-[#334155] transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center`}
                    >
                      <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${card.badgeColor}`}
                    >
                      {card.badge}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-[#0F172A] dark:text-white">
                    {card.value}
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">{card.subtitle}</p>
                </button>
              ))}
            </div>

            {/* ── Quick Actions + Module Overview ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Quick Actions */}
              <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white mb-4">
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => router.push(action.path)}
                      className={`${action.color} text-white rounded-xl p-4 flex flex-col items-start gap-2.5 transition-colors`}
                    >
                      <action.icon className="w-4 h-4" />
                      <span className="text-[11px] font-semibold leading-tight">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Management Modules */}
              <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">
                    Management Modules
                  </h2>
                  <span className="text-[11px] text-[#94A3B8]">
                    {modules.length} modules
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {modules.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => router.push(item.path)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A] transition-colors group text-left"
                    >
                      <div
                        className={`w-9 h-9 ${item.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#0F172A] dark:text-white">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-[#94A3B8] truncate">
                          {item.desc}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#2563EB] transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
