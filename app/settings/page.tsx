"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  User,
  Pencil,
  Save,
  X,
  Building2,
  Mail,
  Phone,
  Shield,
  Globe,
  Lock,
  Bell,
  ChevronRight,
  Trash2,
  SendHorizontal,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import { getMe, updateProfile, isAuthenticated } from "@/lib/api/index"
import { getSmtpConfig, saveSmtpConfig, clearSmtpConfig, testSmtpConfig } from "@/lib/api/organizations"
import { useToast } from "@/components/ui/use-toast"
import type { SmtpConfigResponse } from "@/lib/api/types"

interface UserProfile {
  id: number
  email: string
  name?: string
  phone?: string
  role?: { name?: string }
  roleName?: string
  organization?: { name?: string; city?: string; state?: string; country?: string }
  organizationId?: number
  createdAt?: string
}

function formatRole(role?: string): string {
  if (!role) return "—"
  const map: Record<string, string> = {
    MASTER_ADMIN: "Master Admin",
    ORG_ADMIN: "Org Admin",
    CAA: "CAA",
    ORG_EMPLOYEE: "Employee",
    CLIENT: "Client",
  }
  return map[role] ?? role
}

const settingSections = [
  {
    id: "general",
    title: "General",
    icon: Globe,
    color: "text-[#2563EB]",
    bg: "bg-[#EFF6FF]",
    desc: "Profile and account details.",
  },
  {
    id: "security",
    title: "Security",
    icon: Lock,
    color: "text-[#EF4444]",
    bg: "bg-[#FEF2F2]",
    desc: "Password policy and session settings.",
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    color: "text-[#F59E0B]",
    bg: "bg-[#FFFBEB]",
    desc: "Email alerts and digest frequency.",
  },
  {
    id: "email",
    title: "Email Config",
    icon: Mail,
    color: "text-[#8B5CF6]",
    bg: "bg-[#F5F3FF]",
    desc: "Custom SMTP settings for your organization.",
  },
]

export default function SettingsPage() {
  const { toast } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [activeSection, setActiveSection] = useState("general")

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")

  // SMTP state
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigResponse | null>(null)
  const [smtpLoading, setSmtpLoading] = useState(false)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpClearing, setSmtpClearing] = useState(false)
  const [smtpEditMode, setSmtpEditMode] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [smtpForm, setSmtpForm] = useState({
    smtpHost: "",
    smtpPort: "",
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
  })

  // Derive from profile (API result) — reliable even if localStorage role is in a different shape
  const orgId = profile?.organizationId
  const isOrgAdmin = (() => {
    if (!profile) return false
    const rn =
      typeof profile.role === "object"
        ? profile.role?.name
        : (profile as unknown as { roleName?: string }).roleName ?? (profile.role as unknown as string)
    return rn === "ORG_ADMIN"
  })()

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login")
    }
  }, [])

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getMe()
        setProfile(data as UserProfile)
        setTestEmail((data as UserProfile).email ?? "")
      } catch {
        toast({ title: "Error", description: "Failed to load profile", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [toast])

  const loadSmtpConfig = useCallback(async (id: number) => {
    setSmtpLoading(true)
    try {
      const cfg = await getSmtpConfig(id)
      setSmtpConfig(cfg)
      if (cfg.configured) {
        setSmtpForm({
          smtpHost: cfg.smtpHost ?? "",
          smtpPort: cfg.smtpPort?.toString() ?? "",
          smtpSecure: cfg.smtpSecure ?? false,
          smtpUser: cfg.smtpUser ?? "",
          smtpPass: "",
          smtpFrom: cfg.smtpFrom ?? "",
        })
      }
    } catch {
      toast({ title: "Error", description: "Failed to load SMTP config", variant: "destructive" })
    } finally {
      setSmtpLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (activeSection === "email" && orgId) {
      loadSmtpConfig(orgId)
    }
  }, [activeSection, orgId, loadSmtpConfig])

  // ─── Profile handlers ──────────────────────────────────────────────────────
  const startEdit = () => {
    setEditName(profile?.name ?? "")
    setEditPhone(profile?.phone ?? "")
    setIsEditing(true)
  }

  const cancelEdit = () => setIsEditing(false)

  const saveEdit = async () => {
    try {
      setIsSaving(true)
      const updated = await updateProfile({ name: editName, phone: editPhone })
      setProfile((prev) => (prev ? { ...prev, ...(updated as Partial<UserProfile>) } : prev))
      setIsEditing(false)
      toast({ title: "Saved", description: "Profile updated successfully" })
    } catch {
      toast({ title: "Error", description: "Failed to save profile", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // ─── SMTP handlers ─────────────────────────────────────────────────────────
  const handleSmtpSave = async () => {
    if (!orgId) return
    setSmtpSaving(true)
    try {
      await saveSmtpConfig(orgId, {
        smtpHost: smtpForm.smtpHost,
        smtpPort: parseInt(smtpForm.smtpPort as string) || 587,
        smtpSecure: smtpForm.smtpSecure,
        smtpUser: smtpForm.smtpUser,
        smtpPass: smtpForm.smtpPass,
        smtpFrom: smtpForm.smtpFrom || smtpForm.smtpUser,
      })
      toast({ title: "Saved", description: "SMTP configuration saved successfully" })
      setSmtpEditMode(false)
      setTestResult(null)
      await loadSmtpConfig(orgId)
    } catch {
      toast({ title: "Error", description: "Failed to save SMTP configuration", variant: "destructive" })
    } finally {
      setSmtpSaving(false)
    }
  }

  const handleSmtpClear = async () => {
    if (!orgId) return
    setSmtpClearing(true)
    try {
      await clearSmtpConfig(orgId)
      toast({ title: "Removed", description: "SMTP config removed. Global SMTP will be used." })
      setSmtpEditMode(false)
      setTestResult(null)
      setSmtpForm({ smtpHost: "", smtpPort: "", smtpSecure: false, smtpUser: "", smtpPass: "", smtpFrom: "" })
      await loadSmtpConfig(orgId)
    } catch {
      toast({ title: "Error", description: "Failed to remove SMTP config", variant: "destructive" })
    } finally {
      setSmtpClearing(false)
    }
  }

  const handleSmtpTest = async () => {
    if (!orgId || !testEmail) return
    setSmtpTesting(true)
    setTestResult(null)
    try {
      const result = await testSmtpConfig(orgId, { testEmail })
      setTestResult(result)
      if (result.success) {
        toast({ title: "Test passed", description: result.message })
      } else {
        toast({ title: "Test failed", description: result.message, variant: "destructive" })
      }
    } catch (err: any) {
      const msg: string = err?.detail ?? err?.message ?? "Failed to run SMTP test"
      const isKeyMismatch = msg.toLowerCase().includes("re-save")
      setTestResult({ success: false, message: msg })
      toast({
        title: "Test failed",
        description: isKeyMismatch
          ? "Encryption key changed — click Edit Config and re-save your password to fix this."
          : msg,
        variant: "destructive",
      })
    } finally {
      setSmtpTesting(false)
    }
  }

  const roleName =
    typeof profile?.role === "object"
      ? profile?.role?.name
      : (profile as unknown as { roleName?: string })?.roleName

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E] text-foreground overflow-hidden">
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />
      <div
        className="flex flex-col flex-1 transition-all duration-300 overflow-hidden min-w-0"
        style={{ marginLeft: isDesktop ? (sidebarCollapsed ? "60px" : "240px") : "0" }}
      >
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <div className="overflow-auto flex-1" style={{ marginTop: "56px" }}>
          <div className="p-6 space-y-6 max-w-5xl mx-auto">

            <div>
              <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Settings</h1>
              <p className="text-sm text-[#64748B] mt-1">Manage your account and organization configuration.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar nav */}
              <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-2 shadow-sm h-fit">
                {settingSections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                      activeSection === s.id
                        ? "bg-[#EFF6FF] dark:bg-[#1E3A5F]"
                        : "hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]"
                    }`}
                  >
                    <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${activeSection === s.id ? "text-[#2563EB]" : "text-[#0F172A] dark:text-white"}`}>
                        {s.title}
                      </p>
                      <p className="text-[10px] text-[#94A3B8] truncate">{s.desc}</p>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${activeSection === s.id ? "text-[#2563EB]" : "text-[#CBD5E1]"}`} />
                  </button>
                ))}
              </div>

              {/* Settings panel */}
              <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-sm">
                <div className="px-6 py-5 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center gap-3">
                  {(() => {
                    const s = settingSections.find((x) => x.id === activeSection)!
                    return (
                      <>
                        <s.icon className={`w-4 h-4 ${s.color}`} />
                        <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">
                          {s.title} Settings
                        </h2>
                      </>
                    )
                  })()}
                </div>

                <div className="p-6">
                  {/* ── General / Profile ── */}
                  {activeSection === "general" && (
                    <div className="space-y-5">
                      {isLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 rounded bg-[#F1F5F9] dark:bg-[#0F172A] animate-pulse" />
                          ))}
                        </div>
                      ) : isEditing ? (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#0F172A] dark:text-white">Display Name</Label>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Your name"
                              className="border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#0F172A] dark:text-white">Phone</Label>
                            <Input
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder="+91 98765 43210"
                              className="border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {[
                            { icon: Mail, label: "Email", value: profile?.email ?? "—" },
                            { icon: User, label: "Name", value: profile?.name || "Not set" },
                            { icon: Phone, label: "Phone", value: profile?.phone || "Not set" },
                          ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center gap-3 py-2 border-b border-[#F1F5F9] dark:border-[#334155] last:border-0">
                              <div className="w-8 h-8 bg-[#F1F5F9] dark:bg-[#0F172A] rounded-lg flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-[#64748B]" />
                              </div>
                              <div>
                                <p className="text-[11px] text-[#94A3B8]">{label}</p>
                                <p className="text-sm font-medium text-[#0F172A] dark:text-white">{value}</p>
                              </div>
                            </div>
                          ))}

                          <div className="flex items-center gap-3 py-2 border-b border-[#F1F5F9] dark:border-[#334155]">
                            <div className="w-8 h-8 bg-[#F1F5F9] dark:bg-[#0F172A] rounded-lg flex items-center justify-center flex-shrink-0">
                              <Shield className="w-4 h-4 text-[#64748B]" />
                            </div>
                            <div>
                              <p className="text-[11px] text-[#94A3B8]">Role</p>
                              <Badge variant="secondary" className="text-xs mt-0.5">
                                {formatRole(roleName)}
                              </Badge>
                            </div>
                          </div>

                          {profile?.organization && (
                            <div className="flex items-center gap-3 py-2">
                              <div className="w-8 h-8 bg-[#F1F5F9] dark:bg-[#0F172A] rounded-lg flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-[#64748B]" />
                              </div>
                              <div>
                                <p className="text-[11px] text-[#94A3B8]">Organization</p>
                                <p className="text-sm font-medium text-[#0F172A] dark:text-white">{profile.organization.name}</p>
                                {(profile.organization.city || profile.organization.state) && (
                                  <p className="text-xs text-[#94A3B8] mt-0.5">
                                    {[profile.organization.city, profile.organization.state, profile.organization.country]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Email Config ── */}
                  {activeSection === "email" && (
                    <div className="space-y-5">
                      {!orgId ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <div className="w-12 h-12 bg-[#F5F3FF] rounded-xl flex items-center justify-center">
                            <Mail className="w-6 h-6 text-[#8B5CF6]" />
                          </div>
                          <p className="text-sm font-medium text-[#0F172A] dark:text-white">No Organization</p>
                          <p className="text-xs text-[#94A3B8] text-center max-w-xs">
                            You must belong to an organization to configure custom SMTP settings.
                          </p>
                        </div>
                      ) : smtpLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 rounded bg-[#F1F5F9] dark:bg-[#0F172A] animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        <>
                          {/* Status banner */}
                          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                            smtpConfig?.configured
                              ? "bg-[#F0FDF4] dark:bg-[#052e16] border border-[#BBF7D0]"
                              : "bg-[#FFF7ED] dark:bg-[#1c1007] border border-[#FED7AA]"
                          }`}>
                            {smtpConfig?.configured ? (
                              <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                            )}
                            <div>
                              <p className={`text-sm font-medium ${smtpConfig?.configured ? "text-[#16A34A]" : "text-[#D97706]"}`}>
                                {smtpConfig?.configured ? "Custom SMTP active" : "Using global SMTP"}
                              </p>
                              <p className="text-xs text-[#94A3B8]">
                                {smtpConfig?.configured
                                  ? `Sending from ${smtpConfig.smtpFrom ?? smtpConfig.smtpUser} via ${smtpConfig.smtpHost}`
                                  : "Configure custom SMTP to send from your own email address."}
                              </p>
                            </div>
                          </div>

                          {/* SMTP form */}
                          {(smtpEditMode || !smtpConfig?.configured) && isOrgAdmin && (
                            <div className="space-y-4 pt-1">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-[13px] font-medium text-[#0F172A] dark:text-white">SMTP Host</Label>
                                  <Input
                                    placeholder="smtp.gmail.com"
                                    value={smtpForm.smtpHost}
                                    onChange={(e) => setSmtpForm((f) => ({ ...f, smtpHost: e.target.value }))}
                                    className="border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[13px] font-medium text-[#0F172A] dark:text-white">Port</Label>
                                  <Input
                                    type="text"
                                    placeholder="587"
                                    value={smtpForm.smtpPort}
                                    onChange={(e) => setSmtpForm((f) => ({ ...f, smtpPort: e.target.value }))}
                                    className="border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
                                <div>
                                  <p className="text-[13px] font-medium text-[#0F172A] dark:text-white">SSL/TLS (Secure)</p>
                                  <p className="text-[11px] text-[#94A3B8]">Enable for port 465, disable for 587 (STARTTLS)</p>
                                </div>
                                <Switch
                                  checked={smtpForm.smtpSecure}
                                  onCheckedChange={(v) => setSmtpForm((f) => ({ ...f, smtpSecure: v }))}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#0F172A] dark:text-white">Username / Email</Label>
                                <Input
                                  placeholder="your@email.com"
                                  value={smtpForm.smtpUser}
                                  onChange={(e) => setSmtpForm((f) => ({ ...f, smtpUser: e.target.value }))}
                                  className="border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#0F172A] dark:text-white">
                                  Password {smtpConfig?.configured && <span className="text-[11px] text-[#94A3B8] font-normal">(leave blank to keep current)</span>}
                                </Label>
                                <Input
                                  type="text"
                                  placeholder={smtpConfig?.configured ? "••••••••" : "SMTP password or app password"}
                                  value={smtpForm.smtpPass}
                                  onChange={(e) => setSmtpForm((f) => ({ ...f, smtpPass: e.target.value }))}
                                  className="border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#0F172A] dark:text-white">
                                  From Address <span className="text-[11px] text-[#94A3B8] font-normal">(optional — defaults to username)</span>
                                </Label>
                                <Input
                                  placeholder="Your Name <your@email.com>"
                                  value={smtpForm.smtpFrom}
                                  onChange={(e) => setSmtpForm((f) => ({ ...f, smtpFrom: e.target.value }))}
                                  className="border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]"
                                />
                              </div>
                            </div>
                          )}

                          {/* Configured view (read-only) */}
                          {smtpConfig?.configured && !smtpEditMode && (
                            <div className="space-y-3">
                              {[
                                { label: "SMTP Host", value: smtpConfig.smtpHost },
                                { label: "Port", value: smtpConfig.smtpPort?.toString() },
                                { label: "Secure (SSL)", value: smtpConfig.smtpSecure ? "Yes" : "No" },
                                { label: "Username", value: smtpConfig.smtpUser },
                                { label: "From Address", value: smtpConfig.smtpFrom ?? smtpConfig.smtpUser },
                              ].map(({ label, value }) => (
                                <div key={label} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] dark:border-[#334155] last:border-0">
                                  <p className="text-[13px] text-[#64748B]">{label}</p>
                                  <p className="text-[13px] font-medium text-[#0F172A] dark:text-white">{value ?? "—"}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Test email — only shown after SMTP config is saved */}
                          {smtpConfig?.configured && !smtpEditMode && (
                            <div className="rounded-xl border border-[#E2E8F0] dark:border-[#334155] overflow-hidden">
                              {/* header */}
                              <div className="flex items-center gap-3 px-4 py-3 bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#334155]">
                                <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                                  <SendHorizontal className="w-3.5 h-3.5 text-[#2563EB]" />
                                </div>
                                <div>
                                  <p className="text-[13px] font-semibold text-[#0F172A] dark:text-white">Send Test Mail</p>
                                  <p className="text-[11px] text-[#94A3B8]">Verify your SMTP is working by sending a test email</p>
                                </div>
                              </div>

                              {/* body */}
                              <div className="px-4 py-4 space-y-3">
                                <div className="space-y-1.5">
                                  <Label className="text-[12px] font-medium text-[#64748B]">Recipient Email</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="email"
                                      placeholder="recipient@example.com"
                                      value={testEmail}
                                      onChange={(e) => { setTestEmail(e.target.value); setTestResult(null) }}
                                      className="border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B]"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={handleSmtpTest}
                                      disabled={smtpTesting || !testEmail}
                                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1.5 flex-shrink-0"
                                    >
                                      {smtpTesting ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <SendHorizontal className="w-3.5 h-3.5" />
                                      )}
                                      {smtpTesting ? "Sending…" : "Send Test"}
                                    </Button>
                                  </div>
                                </div>

                                {testResult && (
                                  <div className={`flex items-start gap-2.5 px-3 py-3 rounded-lg text-xs ${
                                    testResult.success
                                      ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                                      : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                                  }`}>
                                    {testResult.success
                                      ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-px" />
                                      : <XCircle className="w-4 h-4 flex-shrink-0 mt-px" />}
                                    <div>
                                      <p className="font-semibold">{testResult.success ? "Test passed" : "Test failed"}</p>
                                      <p className="mt-0.5 opacity-80">{testResult.message}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Coming soon sections ── */}
                  {(activeSection === "security" || activeSection === "notifications") && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      {(() => {
                        const sec = settingSections.find((s) => s.id === activeSection)!
                        return (
                          <>
                            <div className={`w-12 h-12 ${sec.bg} rounded-xl flex items-center justify-center`}>
                              <sec.icon className={`w-6 h-6 ${sec.color}`} />
                            </div>
                            <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{sec.title} Settings</p>
                            <p className="text-xs text-[#94A3B8] text-center max-w-xs">{sec.desc}</p>
                            <span className="text-[11px] text-[#F59E0B] bg-[#FFFBEB] px-3 py-1 rounded-full font-medium">
                              Coming Soon
                            </span>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                {activeSection === "general" && !isLoading && (
                  <div className="px-6 py-4 border-t border-[#E2E8F0] dark:border-[#334155] flex justify-end gap-3">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="border-[#E2E8F0] dark:border-[#334155] gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          disabled={isSaving}
                          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1.5"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          {isSaving ? "Saving…" : "Save Changes"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startEdit}
                        className="border-[#E2E8F0] dark:border-[#334155] gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit Profile
                      </Button>
                    )}
                  </div>
                )}

                {activeSection === "email" && orgId && !smtpLoading && isOrgAdmin && (
                  <div className="px-6 py-4 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between gap-3">
                    <div>
                      {smtpConfig?.configured && !smtpEditMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSmtpClear}
                          disabled={smtpClearing}
                          className="border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] gap-1.5"
                        >
                          {smtpClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Remove Config
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {smtpEditMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSmtpEditMode(false); setTestResult(null) }}
                          className="border-[#E2E8F0] dark:border-[#334155] gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </Button>
                      )}
                      {smtpConfig?.configured && !smtpEditMode ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSmtpEditMode(true)}
                          className="border-[#E2E8F0] dark:border-[#334155] gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Config
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleSmtpSave}
                          disabled={smtpSaving || !smtpForm.smtpHost || !smtpForm.smtpUser || (!smtpConfig?.configured && !smtpForm.smtpPass)}
                          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1.5"
                        >
                          {smtpSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          {smtpSaving ? "Saving…" : "Save Config"}
                        </Button>
                      )}
                    </div>
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
