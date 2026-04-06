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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Verifying access…</p>
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
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      badge: "Active",
      badgeColor: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30",
      path: "/master-admin/organizations",
    },
    {
      title: "Total Users",
      value: isLoadingStats ? "—" : (stats?.totalUsers ?? 0).toString(),
      subtitle: `${stats?.recentUsers ?? 0} joined last 30 days`,
      icon: Users,
      iconColor: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-50 dark:bg-green-900/30",
      badge: "All roles",
      badgeColor: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30",
      path: "/master-admin/users",
    },
    {
      title: "Email Templates",
      value: isLoadingStats ? "—" : (stats?.totalEmailTemplates ?? 0).toString(),
      subtitle: "System-wide templates",
      icon: Mail,
      iconColor: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
      badge: "5 categories",
      badgeColor: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30",
      path: "/master-admin/email-templates",
    },
    {
      title: "Active Sessions",
      value: isLoadingStats ? "—" : (stats?.usersByRole?.ORG_ADMIN ?? 0 + (stats?.usersByRole?.CAA ?? 0)).toString(),
      subtitle: "Admins + CA Associates",
      icon: Activity,
      iconColor: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-50 dark:bg-green-900/30",
      badge: "Org staff",
      badgeColor: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30",
      path: "/master-admin/activity",
    },
  ]

  const quickActions = [
    {
      label: "Add Organization",
      icon: Plus,
      path: "/master-admin/organizations",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      label: "Create User",
      icon: UserPlus,
      path: "/master-admin/users",
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      label: "View Analytics",
      icon: BarChart3,
      path: "/master-admin/analytics",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      label: "Activity Log",
      icon: Activity,
      path: "/master-admin/activity",
      color: "bg-amber-500 hover:bg-amber-600",
    },
  ]

  const modules = [
    {
      label: "Organizations",
      desc: "Manage CA firm registrations & admins",
      icon: Building2,
      path: "/master-admin/organizations",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "User Management",
      desc: "Roles, permissions & user accounts",
      icon: Users,
      path: "/master-admin/users",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/30",
    },
    {
      label: "Email Templates",
      desc: "System notification templates",
      icon: Mail,
      path: "/master-admin/email-templates",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "System Activity",
      desc: "Audit logs & event monitoring",
      icon: Activity,
      path: "/master-admin/activity",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Analytics",
      desc: "Usage metrics & performance",
      icon: TrendingUp,
      path: "/master-admin/analytics",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/30",
    },
    {
      label: "Reports",
      desc: "Export & download system reports",
      icon: BarChart3,
      path: "/master-admin/reports",
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-900/30",
    },
  ]

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
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
                <h1 className="text-2xl font-bold text-foreground">
                  Dashboard
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  System overview — manage organizations, users, and platform settings.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card px-3 py-2 rounded-lg border border-border flex-shrink-0">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
                All Systems Online
              </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards.map((card) => (
                <button
                  key={card.title}
                  onClick={() => router.push(card.path)}
                  className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left group"
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
                  <p className="text-[13px] font-medium text-muted-foreground mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">{card.subtitle}</p>
                </button>
              ))}
            </div>

            {/* ── Quick Actions + Module Overview ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Quick Actions */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground mb-4">
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
              <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground">
                    Management Modules
                  </h2>
                  <span className="text-[11px] text-muted-foreground">
                    {modules.length} modules
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {modules.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => router.push(item.path)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group text-left"
                    >
                      <div
                        className={`w-9 h-9 ${item.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-foreground">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.desc}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
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
