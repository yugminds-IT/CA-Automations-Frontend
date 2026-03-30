"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Settings, User, Pencil, Save, X, Building2, Mail, Phone, Shield } from "lucide-react"
import { getMe, updateProfile } from "@/lib/api/index"
import { useToast } from "@/components/ui/use-toast"

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

export default function SettingsPage() {
  const { toast } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")

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
      } catch {
        toast({ title: "Error", description: "Failed to load profile", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [toast])

  const startEdit = () => {
    setEditName(profile?.name ?? "")
    setEditPhone(profile?.phone ?? "")
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
  }

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

  const roleName =
    typeof profile?.role === "object"
      ? profile?.role?.name
      : (profile as unknown as { roleName?: string })?.roleName

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
          <div className="p-6 space-y-6 max-w-2xl">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            {/* Profile card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Profile
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Your personal account details
                    </CardDescription>
                  </div>
                  {!isEditing && !isLoading && (
                    <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Display Name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={isSaving}
                        className="gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{profile?.email ?? "—"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="text-sm font-medium">{profile?.name || "Not set"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{profile?.phone || "Not set"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Role</p>
                        <Badge variant="secondary" className="text-xs mt-0.5">
                          {formatRole(roleName)}
                        </Badge>
                      </div>
                    </div>
                    {profile?.organization && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Organization</p>
                            <p className="text-sm font-medium">{profile.organization.name}</p>
                            {(profile.organization.city || profile.organization.state) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {[profile.organization.city, profile.organization.state, profile.organization.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
