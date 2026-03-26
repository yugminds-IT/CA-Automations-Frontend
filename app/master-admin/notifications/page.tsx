"use client"

import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  isAuthenticated,
  isMasterAdminUser,
  getMasterAdminNotifications,
  type MasterAdminNotification,
} from "@/lib/api/index"
import { useToast } from "@/components/ui/use-toast"
import { Bell, UserPlus, Building2, AlertTriangle, CheckCircle, Info, Clock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

function formatTimestamp(ts: string): string {
  const date = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours !== 1 ? "s" : ""} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`
  return date.toLocaleDateString()
}

function getNotifStyle(severity: MasterAdminNotification["severity"], type: string) {
  if (severity === "success") return { icon: CheckCircle, color: "text-[#22C55E]", bg: "bg-[#F0FDF4]" }
  if (severity === "warning") return { icon: AlertTriangle, color: "text-[#F59E0B]", bg: "bg-[#FFFBEB]" }
  if (severity === "error") return { icon: AlertTriangle, color: "text-[#EF4444]", bg: "bg-[#FEF2F2]" }
  // info — pick icon by type
  if (type === "user_created") return { icon: UserPlus, color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" }
  if (type === "org_created") return { icon: Building2, color: "text-[#8B5CF6]", bg: "bg-[#F5F3FF]" }
  return { icon: Info, color: "text-[#0EA5E9]", bg: "bg-[#F0F9FF]" }
}

interface NotifState extends MasterAdminNotification {
  read: boolean
}

export default function MasterAdminNotificationsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [notifications, setNotifications] = useState<NotifState[]>([])
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
    fetchNotifications()
  }, [router, toast])

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const data = await getMasterAdminNotifications(20)
      const items = Array.isArray(data) ? data : []
      setNotifications(items.map((n) => ({ ...n, read: false })))
    } catch {
      toast({ title: "Error", description: "Failed to load notifications.", variant: "destructive" })
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

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

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
          <div className="p-6 space-y-6 max-w-3xl mx-auto">

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-xs font-semibold bg-[#2563EB] text-white px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-[#64748B] mt-1">
                  {isLoading ? "Loading…" : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""} loaded`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllRead}
                    className="text-xs border-[#E2E8F0] dark:border-[#334155] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchNotifications}
                  disabled={isLoading}
                  className="border-[#E2E8F0] dark:border-[#334155] text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">All Notifications</h2>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
                  <span className="text-sm text-[#94A3B8]">Loading notifications…</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Bell className="w-10 h-10 text-[#CBD5E1]" />
                  <p className="text-sm text-[#94A3B8]">No notifications yet</p>
                  <p className="text-xs text-[#CBD5E1]">System events will appear here as activity occurs</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9] dark:divide-[#334155]">
                  {notifications.map((notif) => {
                    const { icon: Icon, color, bg } = getNotifStyle(notif.severity, notif.type)
                    return (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-4 px-5 py-4 transition-colors cursor-default ${
                          notif.read
                            ? "hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]"
                            : "bg-[#EFF6FF]/40 dark:bg-[#1E3A5F]/20 hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A5F]/40"
                        }`}
                        onClick={() =>
                          setNotifications((prev) =>
                            prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                          )
                        }
                      >
                        <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#0F172A] dark:text-white">{notif.title}</p>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">{notif.description}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[#94A3B8] flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(notif.timestamp)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
