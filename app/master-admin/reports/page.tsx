"use client"

import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
import { LekvyaLoader } from "@/components/ui/lekvya-loader"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, isMasterAdminUser, downloadMasterAdminCsv } from "@/lib/api/index"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Download, Users, Building2, Mail, Activity, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

const reportTypes = [
  {
    title: "User Report",
    desc: "Complete list of all users with roles, organizations, and registration dates.",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    formats: ["CSV"],
    status: "Available",
    statusColor: "text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/30",
    exportKey: "users" as const,
  },
  {
    title: "Organization Report",
    desc: "All registered CA organizations with admin details and location data.",
    icon: Building2,
    color: "text-green-500 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/30",
    formats: ["CSV"],
    status: "Available",
    statusColor: "text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/30",
    exportKey: "organizations" as const,
  },
  {
    title: "Email Activity Report",
    desc: "Summary of emails sent, templates used, and delivery statistics.",
    icon: Mail,
    color: "text-purple-500 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/30",
    formats: ["CSV"],
    status: "Coming Soon",
    statusColor: "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
    exportKey: null,
  },
  {
    title: "System Activity Report",
    desc: "Audit log export covering logins, config changes, and admin actions.",
    icon: Activity,
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    formats: ["CSV", "JSON"],
    status: "Coming Soon",
    statusColor: "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
    exportKey: null,
  },
  {
    title: "Monthly Summary",
    desc: "Aggregated monthly stats across all modules — ideal for management review.",
    icon: Calendar,
    color: "text-sky-500 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-900/30",
    formats: ["PDF"],
    status: "Coming Soon",
    statusColor: "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
    exportKey: null,
  },
]

export default function MasterAdminReports() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return }
    if (!isMasterAdminUser()) {
      toast({ title: "Access Denied", description: "You must be a master admin to access this page.", variant: "destructive" })
      router.replace("/dashboard")
      return
    }
    setIsCheckingAuth(false)
  }, [router, toast])

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
    return <LekvyaLoader className="min-h-screen" />
  }

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
          <div className="p-6 space-y-6 max-w-5xl mx-auto">

            <div>
              <h1 className="text-2xl font-bold text-foreground">Reports</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Download and export system reports in various formats.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reportTypes.map((report) => (
                <div
                  key={report.title}
                  className="bg-card rounded-xl border border-border p-5 shadow-sm flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-10 h-10 ${report.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <report.icon className={`w-5 h-5 ${report.color}`} />
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${report.statusColor}`}>
                      {report.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{report.title}</h3>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1 leading-relaxed">{report.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    {report.formats.map((fmt) => (
                      <Button
                        key={fmt}
                        variant="outline"
                        size="sm"
                        disabled={report.status !== "Available"}
                        className="h-8 px-3 text-xs border-border hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 hover:border-[#BFDBFE] transition-colors disabled:opacity-40"
                        onClick={() => {
                          if (report.exportKey) {
                            downloadMasterAdminCsv(report.exportKey)
                          }
                        }}
                      >
                        <Download className="w-3 h-3 mr-1.5" />
                        {fmt}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-[#BFDBFE] dark:border-[#1E3A5F] px-5 py-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 dark:text-[#93C5FD]">Custom Reports</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 dark:text-[#60A5FA] mt-0.5">
                    Advanced filtering and custom date-range reports will be available in a future release.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
