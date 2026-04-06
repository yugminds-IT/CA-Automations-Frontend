"use client"

import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, isMasterAdminUser, getMasterAdminAnalytics, type MasterAdminAnalytics } from "@/lib/api/index"
import { useToast } from "@/components/ui/use-toast"
import { BarChart3, TrendingUp, Users, Building2, Mail, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MasterAdminAnalyticsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [data, setData] = useState<MasterAdminAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return }
    if (!isMasterAdminUser()) {
      toast({ title: "Access Denied", description: "You must be a master admin to access this page.", variant: "destructive" })
      router.replace("/")
      return
    }
    setIsCheckingAuth(false)
    fetchAnalytics()
  }, [router, toast])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const result = await getMasterAdminAnalytics()
      setData(result)
    } catch {
      toast({ title: "Error", description: "Failed to load analytics.", variant: "destructive" })
    } finally {
      setIsLoading(false)
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
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const metrics = [
    {
      label: "User Growth",
      value: isLoading ? "—" : `${data?.userGrowthPercent != null ? (data.userGrowthPercent >= 0 ? "+" : "") + data.userGrowthPercent.toFixed(1) + "%" : "0%"}`,
      period: "vs last month",
      icon: Users,
      color: "text-green-500 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/30",
    },
    {
      label: "New Organizations",
      value: isLoading ? "—" : `+${data?.newOrganizationsThisMonth ?? 0}`,
      period: "this month",
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Emails Sent",
      value: isLoading ? "—" : (data?.emailsSentThisWeek ?? 0).toString(),
      period: "this week",
      icon: Mail,
      color: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Total Users",
      value: isLoading ? "—" : (data?.totalUsers ?? 0).toString(),
      period: "registered",
      icon: TrendingUp,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/30",
    },
  ]

  // Monthly registrations bar chart — combined users + orgs
  const monthly = data?.monthlyRegistrations ?? []
  const barData = monthly.map((m) => ({
    label: m.month.slice(0, 3),
    value: m.users + m.organizations,
  }))
  const barMax = barData.length > 0 ? Math.max(...barData.map((b) => b.value), 1) : 1

  // User breakdown by role percentages
  const rolePercent = data?.usersByRolePercent ?? {}
  const roleBreakdown = [
    { role: "Org Admin", key: "ORG_ADMIN", color: "bg-blue-600" },
    { role: "Employee", key: "ORG_EMPLOYEE", color: "bg-green-500" },
    { role: "Client", key: "CLIENT", color: "bg-purple-500" },
    { role: "Master Admin", key: "MASTER_ADMIN", color: "bg-amber-500" },
    { role: "CA Associate", key: "CAA", color: "bg-sky-500" },
  ].map((r) => ({ ...r, pct: Math.round(rolePercent[r.key] ?? 0) }))
    .filter((r) => r.pct > 0)

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <MasterAdminSidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />
      <div
        className="flex flex-col flex-1 transition-all duration-300 overflow-hidden min-w-0"
        style={{ marginLeft: isDesktop ? (sidebarCollapsed ? "60px" : "240px") : "0" }}
      >
        <MasterAdminHeader
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <div className="overflow-auto flex-1" style={{ marginTop: "56px" }}>
          <div className="p-6 space-y-6 max-w-7xl mx-auto">

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
                <p className="text-sm text-muted-foreground mt-1">Platform usage metrics and performance insights.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={isLoading}
                className="border-border text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((m) => (
                <div key={m.label} className="bg-card rounded-xl border border-border p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${m.bg} rounded-lg flex items-center justify-center`}>
                      <m.icon className={`w-5 h-5 ${m.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{m.value}</p>
                  <p className="text-[13px] font-medium text-muted-foreground dark:text-muted-foreground mt-0.5">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.period}</p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar chart — real monthly registrations */}
              <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Monthly Registrations</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Organizations + users combined</p>
                  </div>
                  <BarChart3 className="w-4 h-4 text-muted-foreground/50" />
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : barData.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No data available</div>
                ) : (
                  <div className="flex items-end gap-2 h-32">
                    {barData.map((bar) => (
                      <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-blue-600 rounded-t-md opacity-80 hover:opacity-100 transition-opacity"
                          style={{ height: `${Math.max((bar.value / barMax) * 100, 4)}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User breakdown — real percentages */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-4">User Breakdown</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center h-24">
                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : roleBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No users yet</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {roleBreakdown.map((r) => (
                      <div key={r.role}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground dark:text-muted-foreground">{r.role}</span>
                          <span className="font-semibold text-foreground">{r.pct}%</span>
                        </div>
                        <div className="h-2 bg-muted dark:bg-[#334155] rounded-full overflow-hidden">
                          <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
