"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, Download, Upload, Search, Filter, MoreVertical, Bell, CheckCircle, AlertCircle, Info } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export function Dashboard() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    status: "",
    description: "",
  })

  // Sample data for tables
  const users = [
    { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "Active", joinDate: "2024-01-15" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User", status: "Active", joinDate: "2024-01-20" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Editor", status: "Inactive", joinDate: "2024-01-10" },
    { id: 4, name: "Alice Williams", email: "alice@example.com", role: "User", status: "Active", joinDate: "2024-02-01" },
    { id: 5, name: "Charlie Brown", email: "charlie@example.com", role: "Admin", status: "Active", joinDate: "2024-02-05" },
  ]

  const projects = [
    { id: 1, name: "Project Alpha", category: "Development", status: "In Progress", progress: 75, deadline: "2024-03-15" },
    { id: 2, name: "Project Beta", category: "Design", status: "Completed", progress: 100, deadline: "2024-02-20" },
    { id: 3, name: "Project Gamma", category: "Marketing", status: "Planning", progress: 25, deadline: "2024-04-01" },
    { id: 4, name: "Project Delta", category: "Development", status: "In Progress", progress: 50, deadline: "2024-03-30" },
    { id: 5, name: "Project Epsilon", category: "Research", status: "On Hold", progress: 10, deadline: "2024-05-15" },
  ]

  const orders = [
    { id: 1, orderNumber: "ORD-001", customer: "Acme Corp", product: "Premium Plan", amount: "$999", status: "Paid", date: "2024-02-10" },
    { id: 2, orderNumber: "ORD-002", customer: "Tech Solutions", product: "Basic Plan", amount: "$299", status: "Pending", date: "2024-02-12" },
    { id: 3, orderNumber: "ORD-003", customer: "Global Inc", product: "Enterprise Plan", amount: "$2499", status: "Paid", date: "2024-02-08" },
    { id: 4, orderNumber: "ORD-004", customer: "StartupXYZ", product: "Basic Plan", amount: "$299", status: "Cancelled", date: "2024-02-05" },
    { id: 5, orderNumber: "ORD-005", customer: "Mega Corp", product: "Premium Plan", amount: "$999", status: "Paid", date: "2024-02-15" },
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    // Reset form
    setFormData({
      name: "",
      email: "",
      role: "",
      status: "",
      description: "",
    })
  }

  return (
    <div className="w-full min-h-full p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Manage your data and settings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
            <Upload className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button size="sm" className="flex-1 sm:flex-initial">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">New Item</span>
          </Button>
        </div>
      </div>

      {/* Glass Notification Demo Section */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Glass Theme Notifications</span>
              <span className="sm:hidden">Notifications</span>
            </h2>
            <p className="text-xs sm:text-[14px] text-muted-foreground mt-1">
              Click buttons below to see glass-themed popup notifications
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            onClick={() => {
              toast({
                title: "Default Notification",
                description: "This is a default glass-themed notification with backdrop blur effect.",
              })
            }}
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm"
          >
            <Bell className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Default Toast</span>
          </Button>
          <Button
            onClick={() => {
              toast({
                title: "Success!",
                description: "Your action was completed successfully.",
                variant: "success",
              })
            }}
            className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm"
            size="sm"
          >
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Success Toast</span>
          </Button>
          <Button
            onClick={() => {
              toast({
                title: "Warning",
                description: "Please review this important information.",
                variant: "warning",
              })
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm"
            size="sm"
          >
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Warning Toast</span>
          </Button>
          <Button
            onClick={() => {
              toast({
                title: "Error Occurred",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
              })
            }}
            variant="destructive"
            size="sm"
            className="text-xs sm:text-sm"
          >
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Error Toast</span>
          </Button>
          <Button
            onClick={() => {
              toast({
                title: "Information",
                description: "Here's some helpful information for you.",
                variant: "info",
              })
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm"
            size="sm"
          >
            <Info className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Info Toast</span>
          </Button>
          <Button
            onClick={() => {
              toast({
                title: "Long Notification",
                description: "This is a longer notification message to demonstrate how the glass theme looks with more content. The backdrop blur effect creates a beautiful frosted glass appearance.",
              })
            }}
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Long Message</span>
            <span className="sm:hidden">Long</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="w-full max-w-md min-w-full sm:min-w-0">
            <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs sm:text-sm">Projects</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm">Orders</TabsTrigger>
            <TabsTrigger value="forms" className="text-xs sm:text-sm">Forms</TabsTrigger>
          </TabsList>
        </div>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">User Management</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
                <Select>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add User</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium hidden sm:table-cell">{user.id}</TableCell>
                      <TableCell className="font-medium sm:font-normal">{user.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.status === "Active"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}>
                          {user.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{user.joinDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8 hidden sm:inline-flex">
                            <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Project Management</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">New Project</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">ID</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="hidden lg:table-cell">Deadline</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium hidden sm:table-cell">{project.id}</TableCell>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{project.category}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          project.status === "Completed"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : project.status === "In Progress"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : project.status === "On Hold"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}>
                          {project.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 sm:w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-xs sm:text-[14px] text-muted-foreground">{project.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{project.deadline}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Order Management</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Input
                  type="date"
                  className="w-full sm:w-40"
                />
                <Select>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="w-full sm:w-auto">
                  <Filter className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                  <span className="sm:hidden">Filter</span>
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead className="hidden md:table-cell">Customer</TableHead>
                    <TableHead className="hidden lg:table-cell">Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell className="hidden md:table-cell">{order.customer}</TableCell>
                      <TableCell className="hidden lg:table-cell">{order.product}</TableCell>
                      <TableCell className="font-semibold">{order.amount}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          order.status === "Paid"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : order.status === "Pending"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}>
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{order.date}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Form Section */}
            <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">Create New Entry</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter description"
                    rows={4}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button type="submit" className="flex-1 w-full sm:w-auto">
                    Submit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 sm:flex-initial w-full sm:w-auto"
                    onClick={() => setFormData({
                      name: "",
                      email: "",
                      role: "",
                      status: "",
                      description: "",
                    })}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </div>

            {/* Additional Form Section */}
            <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">Quick Actions</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search & Filter</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Search..." className="flex-1" />
                    <Button variant="outline" size="icon">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category Selection</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input type="date" />
                    <Input type="date" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Action Buttons</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="default">Primary</Button>
                    <Button size="sm" variant="secondary">Secondary</Button>
                    <Button size="sm" variant="outline">Outline</Button>
                    <Button size="sm" variant="destructive">Delete</Button>
                    <Button size="sm" variant="ghost">Ghost</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>File Upload</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-[14px] text-muted-foreground mb-2">
                      Drag and drop files here or click to browse
                    </p>
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

