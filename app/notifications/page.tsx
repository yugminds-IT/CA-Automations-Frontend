"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, FileUp, CheckCheck, Clock } from "lucide-react"
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api/index"
import type { AppNotification } from "@/lib/api/index"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function NotificationsPage() {
  const { toast } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [total, setTotal] = useState(0)
  const [unread, setUnread] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

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

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await listNotifications({ limit: 50 })
      setNotifications(res.notifications)
      setTotal(res.total)
      setUnread(res.unread)
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnread((prev) => Math.max(0, prev - 1))
    } catch {
      toast({ title: "Error", description: "Failed to mark as read", variant: "destructive" })
    }
  }

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAll(true)
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnread(0)
      toast({ title: "Done", description: "All notifications marked as read" })
    } catch {
      toast({ title: "Error", description: "Failed to mark all as read", variant: "destructive" })
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden w-full">
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />
      <div
        className="flex flex-col flex-1 transition-all duration-300 overflow-hidden min-w-0"
        style={{
          marginLeft: isDesktop ? (sidebarCollapsed ? "60px" : "240px") : "0",
          width: isDesktop ? (sidebarCollapsed ? "calc(100% - 60px)" : "calc(100% - 240px)") : "100%",
        }}
      >
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <div
          className="overflow-y-auto overflow-x-hidden w-full"
          style={{ height: "calc(100vh - 54px)", marginTop: "54px" }}
        >
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Bell className="h-6 w-6" />
                  Notifications
                  {unread > 0 && (
                    <Badge className="ml-1 bg-primary text-primary-foreground">{unread}</Badge>
                  )}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {total} total · {unread} unread
                </p>
              </div>
              {unread > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAll}
                  className="gap-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </Button>
              )}
            </div>

            {/* Notification list */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mx-auto w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">No notifications yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You'll see alerts here when clients upload documents.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <Card
                    key={n.id}
                    className={`border transition-colors ${
                      n.isRead
                        ? "bg-card border-border"
                        : "bg-primary/5 border-primary/20 cursor-pointer"
                    }`}
                    onClick={() => !n.isRead && handleMarkRead(n.id)}
                  >
                    <CardContent className="px-4 py-3 flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                          <FileUp className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {n.message ?? `${n.clientName ?? "Client"} uploaded a document`}
                          </p>
                          {!n.isRead && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary mt-1.5" />
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {n.clientName && (
                            <span className="font-medium text-foreground/80">{n.clientName}</span>
                          )}
                          {n.fileName && (
                            <span className="truncate max-w-[200px]">{n.fileName}</span>
                          )}
                          {n.fileType && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {n.fileType}
                            </Badge>
                          )}
                          {n.fileSize && (
                            <span>{formatFileSize(n.fileSize)}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
