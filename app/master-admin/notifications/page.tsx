"use client"

import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
import { LekvyaLoader } from "@/components/ui/lekvya-loader"
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
  if (severity === "success") return { icon: CheckCircle, color: "text-green-500 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30" }
  if (severity === "warning") return { icon: AlertTriangle, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" }
  if (severity === "error") return { icon: AlertTriangle, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" }
  // info — pick icon by type
  if (type === "user_created") return { icon: UserPlus, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" }
  if (type === "org_created") return { icon: Building2, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30" }
  return { icon: Info, color: "text-sky-500 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-900/30" }
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
          <div className="p-6 space-y-6 max-w-3xl mx-auto">

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isLoading ? "Loading…" : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""} loaded`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllRead}
                    className="text-xs border-border hover:bg-[#EFF6FF] hover:text-blue-600 dark:text-blue-400"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchNotifications}
                  disabled={isLoading}
                  className="border-border text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-semibold text-foreground">All Notifications</h2>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-10">
                  <LekvyaLoader />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Bell className="w-10 h-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground/50">System events will appear here as activity occurs</p>
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
                            : "bg-[#EFF6FF]/40 dark:bg-[#1E3A5F]/20 hover:bg-blue-50 dark:hover:bg-blue-900/30/40"
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
                            <p className="text-sm font-medium text-foreground">{notif.title}</p>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">{notif.description}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-shrink-0">
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
