"use client"

import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
import { LekvyaLoader } from "@/components/ui/lekvya-loader"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, isMasterAdminUser, getActivityLogs, type ActivityLog } from "@/lib/api/index"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  LogIn,
  LogOut,
  AlertTriangle,
  Info,
  ShieldAlert,
  Activity,
  RefreshCw,
  Search,
  Clock,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Activity; color: string; bg: string; badge: string }> = {
  login:        { label: "Login",        icon: LogIn,       color: "text-green-500 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30", badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" },
  logout:       { label: "Logout",       icon: LogOut,      color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  login_failed: { label: "Login Failed", icon: ShieldAlert, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30", badge: "bg-[#FEF3C7] text-[#D97706]" },
  error:        { label: "Error",        icon: AlertTriangle,color: "text-red-500 dark:text-red-400",bg: "bg-red-50 dark:bg-red-900/30", badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  info:         { label: "Info",         icon: Info,        color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30", badge: "bg-[#EDE9FE] text-[#7C3AED]" },
}

const FILTER_TYPES = [
  { value: "all",          label: "All" },
  { value: "login",        label: "Login" },
  { value: "logout",       label: "Logout" },
  { value: "login_failed", label: "Failed Login" },
  { value: "error",        label: "Errors" },
  { value: "info",         label: "Info" },
]

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { label: type, icon: Activity, color: "text-muted-foreground", bg: "bg-muted", badge: "bg-muted text-muted-foreground" }
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function formatDuration(ms: number | null): string {
  if (ms == null) return ""
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatAbsolute(ts: string): string {
  return new Date(ts).toLocaleString()
}

// ─── Row component ────────────────────────────────────────────────────────────
function LogRow({ log }: { log: ActivityLog }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = getTypeConfig(log.type)
  const Icon = cfg.icon

  return (
    <div className={`border-b border-[#F1F5F9] dark:border-[#334155] last:border-0 ${log.isError ? "bg-[#FFF8F8] dark:bg-[#1F1010]" : ""}`}>
      <div
        className="flex items-start gap-3 px-4 py-3 hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A] cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Icon */}
        <div className={`w-8 h-8 ${cfg.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
            {log.userEmail && (
              <span className="text-xs font-medium text-foreground truncate">{log.userEmail}</span>
            )}
            {log.orgName && (
              <span className="text-[10px] text-muted-foreground dark:text-muted-foreground truncate">({log.orgName})</span>
            )}
            {log.userRole && (
              <span className="text-[10px] bg-muted dark:bg-[#334155] text-muted-foreground dark:text-muted-foreground px-1.5 py-0.5 rounded">{log.userRole}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5 truncate">
            {log.description ?? (log.method && log.path ? `${log.method} ${log.path}` : "—")}
          </p>
        </div>

        {/* Right side: duration + status + time */}
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <div className="flex items-center gap-1.5">
            {log.statusCode != null && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${log.statusCode >= 400 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"}`}>
                {log.statusCode}
              </span>
            )}
            {log.durationMs != null && log.type === "logout" && (
              <span className="text-[10px] text-muted-foreground">{formatDuration(log.durationMs)}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatTimestamp(log.createdAt)}
          </div>
          {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 ml-11 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
          {log.ipAddress && <div><span className="text-muted-foreground">IP: </span><span className="font-mono">{log.ipAddress}</span></div>}
          {log.method && log.path && <div><span className="text-muted-foreground">Path: </span><span className="font-mono">{log.method} {log.path}</span></div>}
          {log.statusCode != null && <div><span className="text-muted-foreground">Status: </span><span className="font-mono">{log.statusCode}</span></div>}
          {log.durationMs != null && <div><span className="text-muted-foreground">Duration: </span><span>{log.type === "logout" ? formatDuration(log.durationMs) + " session" : log.durationMs + "ms"}</span></div>}
          {log.userAgent && <div className="col-span-2 sm:col-span-3"><span className="text-muted-foreground">User Agent: </span><span className="break-all">{log.userAgent}</span></div>}
          <div className="col-span-2 sm:col-span-3"><span className="text-muted-foreground">Time: </span><span>{formatAbsolute(log.createdAt)}</span></div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MasterAdminActivity() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLive, setIsLive] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [activeType, setActiveType] = useState("all")
  const [search, setSearch] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return }
    if (!isMasterAdminUser()) {
      toast({ title: "Access Denied", description: "You must be a master admin.", variant: "destructive" })
      router.replace("/"); return
    }
    setIsCheckingAuth(false)
  }, [router, toast])

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed")
    setSidebarCollapsed(saved !== null ? saved === "true" : true)
  }, [])

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check(); window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const res = await getActivityLogs({ type: activeType, limit: 200 })
      setLogs(Array.isArray(res.logs) ? res.logs : [])
      setTotal(res.total ?? 0)
      setIsConnected(true)
    } catch {
      setIsConnected(false)
      if (!silent) toast({ title: "Error", description: "Failed to load activity logs.", variant: "destructive" })
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [activeType, toast])

  // Initial fetch when auth done
  useEffect(() => {
    if (!isCheckingAuth) fetchLogs()
  }, [isCheckingAuth, fetchLogs])

  // Live polling every 10 seconds
  useEffect(() => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current)
    if (isLive && !isCheckingAuth) {
      liveIntervalRef.current = setInterval(() => fetchLogs(true), 10000)
    }
    return () => { if (liveIntervalRef.current) clearInterval(liveIntervalRef.current) }
  }, [isLive, isCheckingAuth, fetchLogs])

  // Re-fetch when filter changes
  useEffect(() => {
    if (!isCheckingAuth) fetchLogs()
  }, [activeType]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredLogs = search
    ? logs.filter((l) =>
        [l.userEmail, l.description, l.path, l.orgName, l.ipAddress]
          .some((v) => v?.toLowerCase().includes(search.toLowerCase()))
      )
    : logs

  // Stats
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayCount    = logs.filter((l) => new Date(l.createdAt) >= today).length
  const loginCount    = logs.filter((l) => l.type === "login").length
  const errorCount    = logs.filter((l) => l.isError).length
  const activeUsers   = [...new Set(logs.filter((l) => l.type === "login" && new Date(l.createdAt) >= today).map((l) => l.userEmail))].length

  if (isCheckingAuth) {
    return <LekvyaLoader className="min-h-screen" />
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <MasterAdminSidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} collapsed={sidebarCollapsed} />
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
          <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-foreground">Activity Log</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isLoading ? "Loading…" : `${total.toLocaleString()} total events`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Live toggle */}
                <button
                  type="button"
                  onClick={() => setIsLive((v) => !v)}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${isLive ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400" : "bg-muted border-border text-muted-foreground"}`}
                >
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3 text-red-500 dark:text-red-400" />}
                  {isLive ? "Live" : "Paused"}
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs()}
                  disabled={isLoading}
                  className="border-border text-xs h-8"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Today",        value: todayCount,   color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
                { label: "Logins",       value: loginCount,   color: "text-green-500 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30" },
                { label: "Active Today", value: activeUsers,  color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30" },
                { label: "Errors",       value: errorCount,   color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                  <p className={`text-xl font-bold ${s.color}`}>{isLoading ? "—" : s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter + Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-wrap gap-1.5">
                {FILTER_TYPES.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setActiveType(f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      activeType === f.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative sm:ml-auto sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-xs border-border"
                  placeholder="Search email, path, IP…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Log table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              {/* Table header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-foreground">Live Logs</span>
                </div>
                <div className="flex items-center gap-2">
                  {isLive && (
                    <span className="flex items-center gap-1 text-[10px] text-green-700 dark:text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Polling every 10s
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {filteredLogs.length} shown
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-10">
                  <LekvyaLoader />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Activity className="w-10 h-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No logs found</p>
                  <p className="text-xs text-muted-foreground/50">
                    {search ? "Try a different search term" : "Logs appear here as users interact with the system"}
                  </p>
                </div>
              ) : (
                <div className="divide-y-0">
                  {filteredLogs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
