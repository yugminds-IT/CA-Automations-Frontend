"use client"

import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
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
    color: "text-[#2563EB]",
    bg: "bg-[#EFF6FF]",
    formats: ["CSV"],
    status: "Available",
    statusColor: "text-[#22C55E] bg-[#F0FDF4]",
    exportKey: "users" as const,
  },
  {
    title: "Organization Report",
    desc: "All registered CA organizations with admin details and location data.",
    icon: Building2,
    color: "text-[#22C55E]",
    bg: "bg-[#F0FDF4]",
    formats: ["CSV"],
    status: "Available",
    statusColor: "text-[#22C55E] bg-[#F0FDF4]",
    exportKey: "organizations" as const,
  },
  {
    title: "Email Activity Report",
    desc: "Summary of emails sent, templates used, and delivery statistics.",
    icon: Mail,
    color: "text-[#8B5CF6]",
    bg: "bg-[#F5F3FF]",
    formats: ["CSV"],
    status: "Coming Soon",
    statusColor: "text-[#F59E0B] bg-[#FFFBEB]",
    exportKey: null,
  },
  {
    title: "System Activity Report",
    desc: "Audit log export covering logins, config changes, and admin actions.",
    icon: Activity,
    color: "text-[#F59E0B]",
    bg: "bg-[#FFFBEB]",
    formats: ["CSV", "JSON"],
    status: "Coming Soon",
    statusColor: "text-[#F59E0B] bg-[#FFFBEB]",
    exportKey: null,
  },
  {
    title: "Monthly Summary",
    desc: "Aggregated monthly stats across all modules — ideal for management review.",
    icon: Calendar,
    color: "text-[#0EA5E9]",
    bg: "bg-[#F0F9FF]",
    formats: ["PDF"],
    status: "Coming Soon",
    statusColor: "text-[#F59E0B] bg-[#FFFBEB]",
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
      router.replace("/")
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0A0F1E]">
        <div className="w-8 h-8 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E] text-foreground overflow-hidden">
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
              <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Reports</h1>
              <p className="text-sm text-[#64748B] mt-1">
                Download and export system reports in various formats.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reportTypes.map((report) => (
                <div
                  key={report.title}
                  className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-5 shadow-sm flex flex-col gap-4"
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
                    <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">{report.title}</h3>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 leading-relaxed">{report.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    {report.formats.map((fmt) => (
                      <Button
                        key={fmt}
                        variant="outline"
                        size="sm"
                        disabled={report.status !== "Available"}
                        className="h-8 px-3 text-xs border-[#E2E8F0] dark:border-[#334155] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-colors disabled:opacity-40"
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

            <div className="bg-[#EFF6FF] dark:bg-[#1E3A5F] rounded-xl border border-[#BFDBFE] dark:border-[#1E3A5F] px-5 py-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#1D4ED8] dark:text-[#93C5FD]">Custom Reports</p>
                  <p className="text-xs text-[#3B82F6] dark:text-[#60A5FA] mt-0.5">
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
