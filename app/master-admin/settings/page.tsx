"use client"

import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
import { LekvyaLoader } from "@/components/ui/lekvya-loader"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, isMasterAdminUser } from "@/lib/api/index"
import { useToast } from "@/components/ui/use-toast"
import { Settings, Shield, Bell, Mail, Globe, Lock, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const settingSections = [
  {
    id: "general",
    title: "General",
    icon: Globe,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    desc: "Platform name, timezone, and locale settings.",
  },
  {
    id: "security",
    title: "Security",
    icon: Lock,
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/30",
    desc: "Password policy, session timeout, 2FA settings.",
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    desc: "Email alerts, push notifications, digest frequency.",
  },
  {
    id: "email",
    title: "Email Config",
    icon: Mail,
    color: "text-purple-500 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/30",
    desc: "SMTP settings, sender address, email limits.",
  },
]

export default function MasterAdminSettings() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [activeSection, setActiveSection] = useState("general")
  const [platformName, setPlatformName] = useState("CA Automations")
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
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Master admin system configuration and preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar nav */}
              <div className="bg-card rounded-xl border border-border p-2 shadow-sm h-fit">
                {settingSections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                      activeSection === s.id
                        ? "bg-blue-50 dark:bg-blue-900/30"
                        : "hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]"
                    }`}
                  >
                    <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${activeSection === s.id ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}>
                        {s.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${activeSection === s.id ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground/50"}`} />
                  </button>
                ))}
              </div>

              {/* Settings panel */}
              <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm">
                <div className="px-6 py-5 border-b border-border flex items-center gap-3">
                  <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-sm font-semibold text-foreground capitalize">
                    {settingSections.find((s) => s.id === activeSection)?.title} Settings
                  </h2>
                </div>

                <div className="p-6 space-y-5">
                  {activeSection === "general" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="platform-name" className="text-[13px] font-medium text-foreground">
                          Platform Name
                        </Label>
                        <Input
                          id="platform-name"
                          value={platformName}
                          onChange={(e) => setPlatformName(e.target.value)}
                          className="border-border bg-muted focus-visible:ring-[#2563EB]/30"
                        />
                        <p className="text-xs text-muted-foreground">Displayed in email headers and the browser tab.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone" className="text-[13px] font-medium text-foreground">
                          Default Timezone
                        </Label>
                        <Input
                          id="timezone"
                          defaultValue="Asia/Kolkata"
                          className="border-border bg-muted focus-visible:ring-[#2563EB]/30"
                        />
                      </div>
                    </>
                  )}

                  {activeSection !== "general" && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      {(() => {
                        const sec = settingSections.find((s) => s.id === activeSection)!
                        return (
                          <>
                            <div className={`w-12 h-12 ${sec.bg} rounded-xl flex items-center justify-center`}>
                              <sec.icon className={`w-6 h-6 ${sec.color}`} />
                            </div>
                            <p className="text-sm font-semibold text-foreground">{sec.title} Settings</p>
                            <p className="text-xs text-muted-foreground text-center max-w-xs">{sec.desc}</p>
                            <span className="text-[11px] text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full font-medium">
                              Coming Soon
                            </span>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {activeSection === "general" && (
                  <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border text-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                      onClick={() =>
                        toast({ title: "Settings saved", description: "Platform settings updated successfully.", variant: "success" })
                      }
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Security notice */}
            <div className="bg-[#0F172A] dark:bg-[#1E293B] rounded-xl p-5 flex items-start gap-4">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Master Admin Access</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All configuration changes made here are logged and audited. Changes take effect immediately across the platform.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
