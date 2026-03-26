"use client"

import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserData, isAuthenticated, isMasterAdminUser, masterAdminGetOrganizations, masterAdminCreateOrganization, masterAdminUpdateOrganization, masterAdminDeleteOrganization, masterAdminCreateUser, ApiError, type Organization, type CreateOrganizationRequest } from "@/lib/api/index"
import { UserRole } from "@/lib/api/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Plus, Edit, Trash2, UserPlus, Shield } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function MasterAdminOrganizations() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true)
  const [createAdminDialogOpen, setCreateAdminDialogOpen] = useState(false)
  const [addOrgDialogOpen, setAddOrgDialogOpen] = useState(false)
  const [editOrgDialogOpen, setEditOrgDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const [adminFormData, setAdminFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: UserRole.ORG_ADMIN,
  })
  const [orgFormData, setOrgFormData] = useState({
    name: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
  })
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false)
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false)
  const [isDeletingOrg, setIsDeletingOrg] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }
    
    // Check if user is master admin
    if (!isMasterAdminUser()) {
      toast({
        title: "Access Denied",
        description: "You must be a master admin to access this page.",
        variant: "destructive",
      })
      router.replace("/")
      return
    }
    
    setIsCheckingAuth(false)
    fetchOrganizations()
  }, [router, toast])

  const fetchOrganizations = async () => {
    try {
      setIsLoadingOrgs(true)
      // listOrganizations returns Organization[] directly, not { organizations }
      const list = await masterAdminGetOrganizations()
      setOrganizations(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login")
      } else {
        toast({
          title: "Error",
          description: "Failed to load organizations. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoadingOrgs(false)
    }
  }

  const handleCreateAdmin = async () => {
    if (!selectedOrgId) {
      toast({
        title: "Error",
        description: "Please select an organization",
        variant: "destructive",
      })
      return
    }

    if (!adminFormData.email || !adminFormData.password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingAdmin(true)
      const roleName = (adminFormData.role ?? UserRole.ORG_ADMIN) as 'ORG_ADMIN' | 'CAA' | 'ORG_EMPLOYEE'
      const userData = {
        organizationId: selectedOrgId!,
        name: adminFormData.full_name || adminFormData.email.split('@')[0],
        email: adminFormData.email,
        password: adminFormData.password,
        phone: adminFormData.phone || '',
        roleName,
      }
      await masterAdminCreateUser(userData)
      
      toast({
        title: "Success",
        description: "Organization admin created successfully",
        variant: "success",
      })
      
      // Reset form (default role ORG_ADMIN for next Create Admin)
      setAdminFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: UserRole.ORG_ADMIN,
      })
      setSelectedOrgId(null)
      setCreateAdminDialogOpen(false)
      
      // Refresh organizations list
      fetchOrganizations()
    } catch (error) {
      console.error('Error creating admin:', error)
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.detail || "Failed to create organization admin",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to create organization admin. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsCreatingAdmin(false)
    }
  }

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true')
    } else {
      setSidebarCollapsed(true)
    }
  }, [])

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)
    return () => window.removeEventListener('resize', checkIsDesktop)
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const handleDialogClose = (open: boolean) => {
    setCreateAdminDialogOpen(open)
    if (!open) {
      if (!isCreatingAdmin) {
        setAdminFormData({ email: "", password: "", full_name: "", phone: "", role: UserRole.ORG_ADMIN })
        setSelectedOrgId(null)
      }
    }
  }

  const handleAddOrganization = async () => {
    if (!orgFormData.name) {
      toast({
        title: "Error",
        description: "Organization name is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingOrg(true)
      const createData: CreateOrganizationRequest = {
        name: orgFormData.name,
        slug: orgFormData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'org',
        city: orgFormData.city || '',
        state: orgFormData.state || '',
        country: orgFormData.country || '',
        pincode: orgFormData.pincode || '',
      }
      
      await masterAdminCreateOrganization(createData)
      
      toast({
        title: "Success",
        description: "Organization created successfully",
        variant: "success",
      })
      
      // Reset form
      setOrgFormData({
        name: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
      })
      setAddOrgDialogOpen(false)
      
      // Refresh organizations list
      fetchOrganizations()
    } catch (error) {
      console.error('Error creating organization:', error)
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.detail || "Failed to create organization",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to create organization. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsCreatingOrg(false)
    }
  }

  const handleUpdateOrganization = async () => {
    if (!editingOrg) return

    try {
      setIsUpdatingOrg(true)
      const updateData = {
        name: orgFormData.name || undefined,
        city: orgFormData.city || undefined,
        state: orgFormData.state || undefined,
        country: orgFormData.country || undefined,
        pincode: orgFormData.pincode || undefined,
      }
      
      await masterAdminUpdateOrganization(editingOrg.id, updateData)
      
      toast({
        title: "Success",
        description: "Organization updated successfully",
        variant: "success",
      })
      
      // Reset form
      setOrgFormData({
        name: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
      })
      setEditingOrg(null)
      setEditOrgDialogOpen(false)
      
      // Refresh organizations list
      fetchOrganizations()
    } catch (error) {
      console.error('Error updating organization:', error)
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.detail || "Failed to update organization",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update organization. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsUpdatingOrg(false)
    }
  }

  const handleDeleteOrganization = async (orgId: number) => {
    if (!confirm("Are you sure you want to delete this organization? This action cannot be undone.")) {
      return
    }

    try {
      setIsDeletingOrg(true)
      await masterAdminDeleteOrganization(orgId)
      
      toast({
        title: "Success",
        description: "Organization deleted successfully",
        variant: "success",
      })
      
      // Refresh organizations list
      fetchOrganizations()
    } catch (error) {
      console.error('Error deleting organization:', error)
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.detail || "Failed to delete organization",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete organization. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsDeletingOrg(false)
    }
  }

  const handleEditOrganization = (org: Organization) => {
    setEditingOrg(org)
    setOrgFormData({
      name: org.name,
      city: org.city || "",
      state: org.state || "",
      country: org.country || "",
      pincode: org.pincode || "",
    })
    setEditOrgDialogOpen(true)
  }

  const handleAddOrgDialogClose = (open: boolean) => {
    setAddOrgDialogOpen(open)
    if (!open && !isCreatingOrg) {
      setOrgFormData({
        name: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
      })
    }
  }

  const handleEditOrgDialogClose = (open: boolean) => {
    setEditOrgDialogOpen(open)
    if (!open && !isUpdatingOrg) {
      setOrgFormData({
        name: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
      })
      setEditingOrg(null)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0A0F1E]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
          <p className="text-sm text-[#64748B]">Verifying access…</p>
        </div>
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
        style={{
          marginLeft: isDesktop ? (sidebarCollapsed ? '60px' : '240px') : '0',
          width: isDesktop ? (sidebarCollapsed ? 'calc(100% - 60px)' : 'calc(100% - 240px)') : '100%',
        }}
      >
        <MasterAdminHeader
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        <div className="overflow-auto" style={{ height: "calc(100vh - 56px)", marginTop: "56px" }}>
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Organizations</h1>
                <p className="text-sm text-[#64748B] mt-1">
                  {isLoadingOrgs ? "Loading…" : `${organizations.length} organization${organizations.length !== 1 ? "s" : ""} registered`}
                </p>
              </div>
              <div className="flex gap-2">
                <Dialog open={createAdminDialogOpen} onOpenChange={handleDialogClose}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-[#2563EB]" />
                        Create Organization Admin
                      </DialogTitle>
                      <DialogDescription>
                        Create an admin user for an organization. The admin will have full access to manage their organization.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="org-select">Organization *</Label>
                        <Select
                          value={selectedOrgId?.toString() || ""}
                          onValueChange={(value) => setSelectedOrgId(parseInt(value))}
                        >
                          <SelectTrigger id="org-select">
                            <SelectValue placeholder="Select an organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {(organizations ?? []).map((org) => (
                              <SelectItem key={org.id} value={org.id.toString()}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-email">Email *</Label>
                        <Input
                          id="admin-email"
                          type="email"
                          placeholder="admin@example.com"
                          value={adminFormData.email}
                          onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-password">Password *</Label>
                        <Input
                          id="admin-password"
                          type="password"
                          placeholder="Enter password"
                          value={adminFormData.password}
                          onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-name">Full Name</Label>
                        <Input
                          id="admin-name"
                          type="text"
                          placeholder="John Doe"
                          value={adminFormData.full_name}
                          onChange={(e) => setAdminFormData({ ...adminFormData, full_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-phone">Phone</Label>
                        <Input
                          id="admin-phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={adminFormData.phone}
                          onChange={(e) => setAdminFormData({ ...adminFormData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCreateAdminDialogOpen(false)
                          setAdminFormData({ email: "", password: "", full_name: "", phone: "", role: UserRole.ORG_ADMIN })
                          setSelectedOrgId(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateAdmin}
                        disabled={isCreatingAdmin || !selectedOrgId || !adminFormData.email || !adminFormData.password}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                      >
                        {isCreatingAdmin ? "Creating..." : "Create Admin"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={addOrgDialogOpen} onOpenChange={handleAddOrgDialogClose}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Organization
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#2563EB]" />
                        Add New Organization
                      </DialogTitle>
                      <DialogDescription>
                        Create a new organization. Organization name is required.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="org-name">Organization Name *</Label>
                        <Input
                          id="org-name"
                          type="text"
                          placeholder="ABC Chartered Accountants"
                          value={orgFormData.name}
                          onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            type="text"
                            placeholder="Mumbai"
                            value={orgFormData.city}
                            onChange={(e) => setOrgFormData({ ...orgFormData, city: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            type="text"
                            placeholder="Maharashtra"
                            value={orgFormData.state}
                            onChange={(e) => setOrgFormData({ ...orgFormData, state: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            type="text"
                            placeholder="India"
                            value={orgFormData.country}
                            onChange={(e) => setOrgFormData({ ...orgFormData, country: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pincode">Pincode</Label>
                          <Input
                            id="pincode"
                            type="text"
                            placeholder="400001"
                            value={orgFormData.pincode}
                            onChange={(e) => setOrgFormData({ ...orgFormData, pincode: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => handleAddOrgDialogClose(false)}
                        disabled={isCreatingOrg}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddOrganization}
                        disabled={isCreatingOrg || !orgFormData.name}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                      >
                        {isCreatingOrg ? "Creating..." : "Create Organization"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={editOrgDialogOpen} onOpenChange={handleEditOrgDialogClose}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5 text-[#2563EB]" />
                        Edit Organization
                      </DialogTitle>
                      <DialogDescription>
                        Update organization information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-org-name">Organization Name</Label>
                        <Input
                          id="edit-org-name"
                          type="text"
                          placeholder="ABC Chartered Accountants"
                          value={orgFormData.name}
                          onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-city">City</Label>
                          <Input
                            id="edit-city"
                            type="text"
                            placeholder="Mumbai"
                            value={orgFormData.city}
                            onChange={(e) => setOrgFormData({ ...orgFormData, city: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-state">State</Label>
                          <Input
                            id="edit-state"
                            type="text"
                            placeholder="Maharashtra"
                            value={orgFormData.state}
                            onChange={(e) => setOrgFormData({ ...orgFormData, state: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-country">Country</Label>
                          <Input
                            id="edit-country"
                            type="text"
                            placeholder="India"
                            value={orgFormData.country}
                            onChange={(e) => setOrgFormData({ ...orgFormData, country: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-pincode">Pincode</Label>
                          <Input
                            id="edit-pincode"
                            type="text"
                            placeholder="400001"
                            value={orgFormData.pincode}
                            onChange={(e) => setOrgFormData({ ...orgFormData, pincode: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => handleEditOrgDialogClose(false)}
                        disabled={isUpdatingOrg}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdateOrganization}
                        disabled={isUpdatingOrg}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                      >
                        {isUpdatingOrg ? "Updating..." : "Update Organization"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* ── Organizations Table ── */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">All Organizations</h2>
                <span className="text-xs text-[#94A3B8]">{(organizations ?? []).length} total</span>
              </div>

              {isLoadingOrgs ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
                  <span className="text-sm text-[#94A3B8]">Loading organizations…</span>
                </div>
              ) : (organizations ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Building2 className="h-10 w-10 text-[#CBD5E1]" />
                  <p className="text-sm text-[#94A3B8]">No organizations found</p>
                  <p className="text-xs text-[#CBD5E1]">Create your first organization to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]">
                        <TableHead className="text-[#64748B] dark:text-[#94A3B8] font-semibold text-xs uppercase tracking-wide py-3">#</TableHead>
                        <TableHead className="text-[#64748B] dark:text-[#94A3B8] font-semibold text-xs uppercase tracking-wide">Name</TableHead>
                        <TableHead className="text-[#64748B] dark:text-[#94A3B8] font-semibold text-xs uppercase tracking-wide">City</TableHead>
                        <TableHead className="text-[#64748B] dark:text-[#94A3B8] font-semibold text-xs uppercase tracking-wide">State</TableHead>
                        <TableHead className="text-[#64748B] dark:text-[#94A3B8] font-semibold text-xs uppercase tracking-wide">Country</TableHead>
                        <TableHead className="text-right text-[#64748B] dark:text-[#94A3B8] font-semibold text-xs uppercase tracking-wide">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(organizations ?? []).map((org, idx) => (
                        <TableRow
                          key={org.id}
                          className={`${
                            idx % 2 === 0
                              ? "bg-white dark:bg-[#1E293B]"
                              : "bg-[#F8FAFC] dark:bg-[#162032]"
                          } hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A5F] transition-colors`}
                        >
                          <TableCell className="text-[#94A3B8] text-xs font-mono py-3">{org.id}</TableCell>
                          <TableCell className="font-semibold text-[#0F172A] dark:text-white text-sm">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 bg-[#EFF6FF] dark:bg-[#1E3A5F] rounded-lg flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
                              </div>
                              {org.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-[#64748B] dark:text-[#94A3B8]">{org.city || "—"}</TableCell>
                          <TableCell className="text-sm text-[#64748B] dark:text-[#94A3B8]">{org.state || "—"}</TableCell>
                          <TableCell className="text-sm text-[#64748B] dark:text-[#94A3B8]">{org.country || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrgId(org.id)
                                  setCreateAdminDialogOpen(true)
                                }}
                                className="h-8 px-2.5 text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A5F] transition-colors"
                                disabled={isDeletingOrg}
                              >
                                <UserPlus className="w-3.5 h-3.5 mr-1" />
                                Admin
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="h-8 w-8 hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A5F] hover:text-[#2563EB] transition-colors"
                                onClick={() => handleEditOrganization(org)}
                                disabled={isDeletingOrg}
                                title="Edit organization"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                                onClick={() => handleDeleteOrganization(org.id)}
                                disabled={isDeletingOrg}
                                title="Delete organization"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

