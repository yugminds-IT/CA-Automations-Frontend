"use client"

import { MasterAdminSidebar } from "@/components/master-admin-sidebar"
import { MasterAdminHeader } from "@/components/master-admin-header"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getUserData, isAuthenticated, isMasterAdminUser, masterAdminGetOrganizations, masterAdminGetUsers, masterAdminCreateUser, masterAdminUpdateUser, masterAdminDeleteUser, ApiError, type Organization } from "@/lib/api/index"
import { UserRole, type User } from "@/lib/api/types"
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
import { Search, Plus, Edit, Trash2, UserPlus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function MasterAdminUsers() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false)
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const [userFormData, setUserFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: UserRole.EMPLOYEE,
  })
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [isUpdatingUser, setIsUpdatingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
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
    fetchUsers()
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

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true)
      // Backend GET /users only supports organizationId; listUsers returns User[] directly
      const list = await masterAdminGetUsers(selectedOrgId ?? undefined)
      setUsers(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Error fetching users:', error)
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login")
      } else {
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleCreateUser = async () => {
    if (!selectedOrgId) {
      toast({
        title: "Error",
        description: "Please select an organization",
        variant: "destructive",
      })
      return
    }

    if (!userFormData.email || !userFormData.password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingUser(true)
      const userData = {
        organizationId: selectedOrgId,
        name: userFormData.full_name || userFormData.email.split('@')[0],
        email: userFormData.email,
        password: userFormData.password,
        phone: userFormData.phone || '',
        roleName: (userFormData.role === UserRole.ORG_ADMIN ? 'ORG_ADMIN' : userFormData.role === UserRole.CAA ? 'CAA' : 'ORG_EMPLOYEE') as 'ORG_ADMIN' | 'CAA' | 'ORG_EMPLOYEE',
      }
      await masterAdminCreateUser(userData)
      
      toast({
        title: "Success",
        description: "User created successfully",
        variant: "success",
      })
      
      // Reset form
      setUserFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: UserRole.EMPLOYEE,
      })
      setSelectedOrgId(null)
      setAddUserDialogOpen(false)
      
      // Refresh users list
      fetchUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.detail || "Failed to create user",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to create user. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      setIsUpdatingUser(true)
      const updateData = {
        email: userFormData.email,
        full_name: userFormData.full_name || undefined,
        phone: userFormData.phone || undefined,
        org_id: selectedOrgId || undefined,
        role: userFormData.role,
      }
      
      await masterAdminUpdateUser(editingUser.id, updateData)
      
      toast({
        title: "Success",
        description: "User updated successfully",
        variant: "success",
      })
      
      // Reset form
      setUserFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: UserRole.EMPLOYEE,
      })
      setSelectedOrgId(null)
      setEditingUser(null)
      setEditUserDialogOpen(false)
      
      // Refresh users list
      fetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.detail || "Failed to update user",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update user. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsUpdatingUser(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return
    }

    try {
      setIsDeletingUser(true)
      await masterAdminDeleteUser(userId)
      
      toast({
        title: "Success",
        description: "User deleted successfully",
        variant: "success",
      })
      
      // Refresh users list
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.detail || "Failed to delete user",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete user. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsDeletingUser(false)
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    const roleVal = (user as any).role?.name ?? (user as any).roleName ?? user.role
    setUserFormData({
      email: user.email,
      password: "", // Don't show password when editing
      full_name: (user.name ?? (user as any).full_name) || "",
      phone: user.phone || "",
      role: roleVal ?? UserRole.ORG_EMPLOYEE,
    })
    setSelectedOrgId(user.organizationId ?? (user as any).org_id ?? null)
    setEditUserDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setAddUserDialogOpen(open)
    if (!open && !isCreatingUser) {
      setUserFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: UserRole.EMPLOYEE,
      })
      setSelectedOrgId(null)
    }
  }

  const handleEditDialogClose = (open: boolean) => {
    setEditUserDialogOpen(open)
    if (!open && !isUpdatingUser) {
      setUserFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: UserRole.EMPLOYEE,
      })
      setSelectedOrgId(null)
      setEditingUser(null)
    }
  }

  // Refetch when org filter changes; search is applied client-side
  useEffect(() => {
    fetchUsers()
  }, [selectedOrgId])

  // Client-side search (backend GET /users does not support search param)
  const displayUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const q = searchQuery.toLowerCase()
    return users.filter(
      (u) =>
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.name ?? '').toLowerCase().includes(q) ||
        ((u as any).role?.name ?? (u as any).roleName ?? '').toString().toLowerCase().includes(q)
    )
  }, [users, searchQuery])

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

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
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
        style={{ 
          marginLeft: isDesktop ? (sidebarCollapsed ? '60px' : '15%') : '0',
          width: isDesktop ? (sidebarCollapsed ? 'calc(100% - 60px)' : 'calc(100% - 15%)') : '100%',
        }}
      >
        <MasterAdminHeader 
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        <div className="overflow-auto" style={{ height: "calc(100vh - 3vh)", marginTop: "3vh" }}>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">User Management</h1>
                <p className="text-muted-foreground mt-1">Manage all system users</p>
              </div>
              <Dialog open={addUserDialogOpen} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-purple-600" />
                      Create User
                    </DialogTitle>
                    <DialogDescription>
                      Create a new user for an organization. The user will have access based on their assigned role.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-org-select">Organization *</Label>
                      <Select
                        value={selectedOrgId?.toString() || ""}
                        onValueChange={(value) => setSelectedOrgId(parseInt(value))}
                        disabled={isLoadingOrgs}
                      >
                        <SelectTrigger id="user-org-select">
                          <SelectValue placeholder={isLoadingOrgs ? "Loading organizations..." : "Select an organization"} />
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
                      <Label htmlFor="user-email">Email *</Label>
                      <Input
                        id="user-email"
                        type="email"
                        placeholder="user@example.com"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-password">Password *</Label>
                      <Input
                        id="user-password"
                        type="password"
                        placeholder="Enter password"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-role">Role *</Label>
                      <Select
                        value={userFormData.role}
                        onValueChange={(value) => setUserFormData({ ...userFormData, role: value as UserRole })}
                      >
                        <SelectTrigger id="user-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.MASTER_ADMIN}>Master Admin</SelectItem>
                          <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                          <SelectItem value={UserRole.EMPLOYEE}>Employee</SelectItem>
                          <SelectItem value={UserRole.CLIENT}>Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-name">Full Name</Label>
                      <Input
                        id="user-name"
                        type="text"
                        placeholder="John Doe"
                        value={userFormData.full_name}
                        onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-phone">Phone</Label>
                      <Input
                        id="user-phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={userFormData.phone}
                        onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => handleDialogClose(false)}
                      disabled={isCreatingUser}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateUser}
                      disabled={isCreatingUser || !selectedOrgId || !userFormData.email || !userFormData.password}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isCreatingUser ? "Creating..." : "Create User"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={editUserDialogOpen} onOpenChange={handleEditDialogClose}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5 text-purple-600" />
                      Edit User
                    </DialogTitle>
                    <DialogDescription>
                      Update user information. Leave password empty to keep current password.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-user-org-select">Organization *</Label>
                      <Select
                        value={selectedOrgId?.toString() || ""}
                        onValueChange={(value) => setSelectedOrgId(parseInt(value))}
                        disabled={isLoadingOrgs}
                      >
                        <SelectTrigger id="edit-user-org-select">
                          <SelectValue placeholder={isLoadingOrgs ? "Loading organizations..." : "Select an organization"} />
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
                      <Label htmlFor="edit-user-email">Email *</Label>
                      <Input
                        id="edit-user-email"
                        type="email"
                        placeholder="user@example.com"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-user-password">Password</Label>
                      <Input
                        id="edit-user-password"
                        type="password"
                        placeholder="Leave empty to keep current password"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-user-role">Role *</Label>
                      <Select
                        value={userFormData.role}
                        onValueChange={(value) => setUserFormData({ ...userFormData, role: value as UserRole })}
                      >
                        <SelectTrigger id="edit-user-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.MASTER_ADMIN}>Master Admin</SelectItem>
                          <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                          <SelectItem value={UserRole.EMPLOYEE}>Employee</SelectItem>
                          <SelectItem value={UserRole.CLIENT}>Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-user-name">Full Name</Label>
                      <Input
                        id="edit-user-name"
                        type="text"
                        placeholder="John Doe"
                        value={userFormData.full_name}
                        onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-user-phone">Phone</Label>
                      <Input
                        id="edit-user-phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={userFormData.phone}
                        onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => handleEditDialogClose(false)}
                      disabled={isUpdatingUser}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateUser}
                      disabled={isUpdatingUser || !selectedOrgId || !userFormData.email}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isUpdatingUser ? "Updating..." : "Update User"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>All Users</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingUsers ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : displayUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayUsers.map((user) => {
                          const org = (organizations ?? []).find((o) => o.id === (user.organizationId ?? (user as any).org_id))
                          const roleName = (user as any).role?.name ?? (user as any).roleName ?? user.role ?? '-'
                          return (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.id}</TableCell>
                              <TableCell>{(user.name ?? (user as any).full_name) || "-"}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                  {roleName}
                                </span>
                              </TableCell>
                              <TableCell>{(org?.name ?? (user as any).organization?.name) || "-"}</TableCell>
                              <TableCell>
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                  Active
                                </span>
                              </TableCell>
                              <TableCell>-</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon-sm" 
                                    className="h-8 w-8"
                                    onClick={() => handleEditUser(user)}
                                    disabled={isDeletingUser}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon-sm" 
                                    className="h-8 w-8"
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={isDeletingUser}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

