"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserData, isAuthenticated, ApiError } from "@/lib/api/index"
import {
  getMasterEmailTemplates,
  getOrgEmailTemplates,
  customizeMasterTemplate,
  createOrgEmailTemplate,
  updateOrgEmailTemplate,
  deleteOrgEmailTemplate,
  EmailTemplateCategory,
  EmailTemplateType,
  TEMPLATE_VARIABLES,
  type EmailTemplate,
  type CreateEmailTemplateRequest,
  type CustomizeTemplateRequest,
} from "@/lib/api/index"
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/api/default-email-templates"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Mail, Edit, Trash2, Plus, Eye, EyeOff, Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function EmailTemplatesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [masterTemplates, setMasterTemplates] = useState<EmailTemplate[]>([])
  const [orgTemplates, setOrgTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<EmailTemplateCategory>(EmailTemplateCategory.SERVICE)
  const [activeTab, setActiveTab] = useState<"master" | "custom">("master")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [customizingTemplate, setCustomizingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.GST_FILING,
    subject: "",
    body: "",
  })
  const [customizeData, setCustomizeData] = useState({
    subject: "",
    body: "",
  })
  const [showVariables, setShowVariables] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }
    
    const user = getUserData()
    if (user?.role === 'client') {
      router.replace('/uploads')
      return
    }
    
    setIsCheckingAuth(false)
    fetchTemplates()
  }, [router])

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

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const [masterResponse, orgResponse] = await Promise.all([
        getMasterEmailTemplates({ limit: 1000 }),
        getOrgEmailTemplates({ limit: 1000 }),
      ])
      setMasterTemplates(masterResponse.templates)
      setOrgTemplates(orgResponse.templates)
    } catch (error) {
      console.error('Error fetching templates:', error)
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login")
      } else {
        toast({
          title: "Error",
          description: "Failed to load email templates. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomize = (template: EmailTemplate) => {
    setCustomizingTemplate(template)
    setCustomizeData({
      subject: template.subject,
      body: template.body,
    })
    setCustomizeDialogOpen(true)
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      category: template.category,
      type: template.type,
      subject: template.subject,
      body: template.body,
    })
    setEditDialogOpen(true)
  }

  const handleCreate = () => {
    console.log('handleCreate called')
    setEditingTemplate(null)
    setFormData({
      name: "",
      category: activeCategory,
      type: getDefaultTypeForCategory(activeCategory),
      subject: "",
      body: "",
    })
    setCreateDialogOpen(true)
    console.log('createDialogOpen set to true')
  }

  const handleSaveCustomize = async () => {
    if (!customizingTemplate) return

    try {
      await customizeMasterTemplate(customizingTemplate.id, {
        subject: customizeData.subject,
        body: customizeData.body,
      })
      toast({
        title: "Success",
        description: "Template customized successfully for your organization",
        variant: "success",
      })
      setCustomizeDialogOpen(false)
      fetchTemplates()
    } catch (error) {
      console.error('Error customizing template:', error)
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.detail || "Failed to customize template",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to customize template. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleSave = async () => {
    console.log('handleSave called', { editingTemplate, formData })
    try {
      if (editingTemplate) {
        console.log('Updating template:', editingTemplate.id)
        await updateOrgEmailTemplate(editingTemplate.id, {
          name: formData.name,
          subject: formData.subject,
          body: formData.body,
        })
        toast({
          title: "Success",
          description: "Template updated successfully",
          variant: "success",
        })
      } else {
        console.log('Creating template with data:', {
          name: formData.name,
          category: formData.category,
          type: formData.type,
          subject: formData.subject,
          body: formData.body,
          is_default: false,
        })
        await createOrgEmailTemplate({
          name: formData.name,
          category: formData.category,
          type: formData.type,
          subject: formData.subject,
          body: formData.body,
          is_default: false,
        })
        toast({
          title: "Success",
          description: "Template created successfully",
          variant: "success",
        })
      }
      setEditDialogOpen(false)
      setCreateDialogOpen(false)
      fetchTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.detail || "Failed to save template",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to save template. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleDelete = async (templateId: number) => {
    if (!confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      return
    }

    try {
      await deleteOrgEmailTemplate(templateId)
      toast({
        title: "Success",
        description: "Template deleted successfully",
        variant: "success",
      })
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      if (error instanceof ApiError) {
        toast({
          title: "Error",
          description: error.detail || "Failed to delete template",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete template. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template)
    setPreviewDialogOpen(true)
  }

  const insertVariable = (variable: string, isCustomize: boolean = false) => {
    const textarea = document.getElementById(isCustomize ? 'customize-body' : 'template-body') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = isCustomize ? customizeData.body : formData.body
      const newText = text.substring(0, start) + variable + text.substring(end)
      if (isCustomize) {
        setCustomizeData({ ...customizeData, body: newText })
      } else {
        setFormData({ ...formData, body: newText })
      }
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  const getDefaultTypeForCategory = (category: EmailTemplateCategory): EmailTemplateType => {
    switch (category) {
      case EmailTemplateCategory.SERVICE:
        return EmailTemplateType.GST_FILING
      case EmailTemplateCategory.LOGIN:
        return EmailTemplateType.LOGIN_CREDENTIALS
      case EmailTemplateCategory.NOTIFICATION:
        return EmailTemplateType.CLIENT_ONBOARDED
      case EmailTemplateCategory.FOLLOW_UP:
        return EmailTemplateType.FOLLOW_UP_DOCUMENTS
      case EmailTemplateCategory.REMINDER:
        return EmailTemplateType.REMINDER_DEADLINE
      default:
        return EmailTemplateType.GST_FILING
    }
  }

  const getCategoryTemplates = (category: EmailTemplateCategory, source: "master" | "custom") => {
    const templates = source === "master" ? masterTemplates : orgTemplates
    return templates.filter(t => t.category === category)
  }

  const getCategoryLabel = (category: EmailTemplateCategory) => {
    switch (category) {
      case EmailTemplateCategory.SERVICE:
        return "Service Templates"
      case EmailTemplateCategory.LOGIN:
        return "Login Templates"
      case EmailTemplateCategory.NOTIFICATION:
        return "Notification Templates"
      case EmailTemplateCategory.FOLLOW_UP:
        return "Follow-up Templates"
      case EmailTemplateCategory.REMINDER:
        return "Reminder Templates"
      default:
        return category
    }
  }

  const getTypeLabel = (type: EmailTemplateType) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
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
          marginLeft: isDesktop ? (sidebarCollapsed ? '60px' : '15%') : '0',
          width: isDesktop ? (sidebarCollapsed ? 'calc(100% - 60px)' : 'calc(100% - 15%)') : '100%',
        }}
      >
        <Header 
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        <div 
          className="overflow-y-auto overflow-x-hidden w-full" 
          style={{ 
            height: "calc(100vh - 3vh)", 
            marginTop: "3vh",
          }}
        >
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Email Templates</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage email templates for your organization</p>
              </div>
              {activeTab === "custom" && (
                <Button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Create Template button clicked')
                    handleCreate()
                  }} 
                  className="w-full sm:w-auto"
                  type="button"
                  size="sm"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Create Template</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "master" | "custom")}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="master" className="text-xs sm:text-sm">Master Templates</TabsTrigger>
                <TabsTrigger value="custom" className="text-xs sm:text-sm">My Custom Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="master" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Master Admin Templates</CardTitle>
                    <CardDescription>
                      Templates created by master admin. You can customize these for your organization.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as EmailTemplateCategory)}>
                      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-4">
                        <TabsList className="inline-flex w-max min-w-full lg:grid lg:w-full lg:grid-cols-5 lg:min-w-0">
                          <TabsTrigger value={EmailTemplateCategory.SERVICE} className="text-xs lg:text-sm whitespace-nowrap">Services</TabsTrigger>
                          <TabsTrigger value={EmailTemplateCategory.LOGIN} className="text-xs lg:text-sm whitespace-nowrap">Login</TabsTrigger>
                          <TabsTrigger value={EmailTemplateCategory.NOTIFICATION} className="text-xs lg:text-sm whitespace-nowrap">Notifications</TabsTrigger>
                          <TabsTrigger value={EmailTemplateCategory.FOLLOW_UP} className="text-xs lg:text-sm whitespace-nowrap">Follow-up</TabsTrigger>
                          <TabsTrigger value={EmailTemplateCategory.REMINDER} className="text-xs lg:text-sm whitespace-nowrap">Reminders</TabsTrigger>
                        </TabsList>
                      </div>

                      {Object.values(EmailTemplateCategory).map((category) => (
                        <TabsContent key={category} value={category}>
                          {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="text-muted-foreground">Loading templates...</div>
                            </div>
                          ) : getCategoryTemplates(category, "master").length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">No templates found for this category</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="min-w-[120px]">Name</TableHead>
                                      <TableHead className="hidden sm:table-cell min-w-[100px]">Type</TableHead>
                                      <TableHead className="min-w-[150px]">Subject</TableHead>
                                      <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {getCategoryTemplates(category, "master").map((template) => {
                                      const hasCustomVersion = orgTemplates.some(
                                        ot => ot.type === template.type && ot.category === template.category
                                      )
                                      return (
                                        <TableRow key={template.id}>
                                          <TableCell className="font-medium">
                                            <div className="flex flex-col sm:block">
                                              <span>{template.name}</span>
                                              <span className="text-xs text-muted-foreground sm:hidden mt-1">{getTypeLabel(template.type)}</span>
                                            </div>
                                          </TableCell>
                                          <TableCell className="hidden sm:table-cell">{getTypeLabel(template.type)}</TableCell>
                                          <TableCell className="max-w-[150px] sm:max-w-md truncate">{template.subject}</TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                                              {hasCustomVersion && (
                                                <Badge variant="secondary" className="hidden md:inline-flex mr-2">Customized</Badge>
                                              )}
                                              <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="h-7 w-7 sm:h-8 sm:w-8"
                                                onClick={() => handlePreview(template)}
                                                title="Preview"
                                              >
                                                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="h-7 w-7 sm:h-8 sm:w-8"
                                                onClick={() => handleCustomize(template)}
                                                title="Customize"
                                              >
                                                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="custom" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>My Custom Templates</CardTitle>
                    <CardDescription>
                      Your organization-specific customized templates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as EmailTemplateCategory)}>
                      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-4">
                        <TabsList className="inline-flex w-max min-w-full lg:grid lg:w-full lg:grid-cols-5 lg:min-w-0">
                          <TabsTrigger value={EmailTemplateCategory.SERVICE} className="text-xs lg:text-sm whitespace-nowrap">Services</TabsTrigger>
                          <TabsTrigger value={EmailTemplateCategory.LOGIN} className="text-xs lg:text-sm whitespace-nowrap">Login</TabsTrigger>
                          <TabsTrigger value={EmailTemplateCategory.NOTIFICATION} className="text-xs lg:text-sm whitespace-nowrap">Notifications</TabsTrigger>
                          <TabsTrigger value={EmailTemplateCategory.FOLLOW_UP} className="text-xs lg:text-sm whitespace-nowrap">Follow-up</TabsTrigger>
                          <TabsTrigger value={EmailTemplateCategory.REMINDER} className="text-xs lg:text-sm whitespace-nowrap">Reminders</TabsTrigger>
                        </TabsList>
                      </div>

                      {Object.values(EmailTemplateCategory).map((category) => (
                        <TabsContent key={category} value={category}>
                          {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="text-muted-foreground">Loading templates...</div>
                            </div>
                          ) : getCategoryTemplates(category, "custom").length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">No custom templates found for this category</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="min-w-[120px]">Name</TableHead>
                                      <TableHead className="hidden sm:table-cell min-w-[100px]">Type</TableHead>
                                      <TableHead className="min-w-[150px]">Subject</TableHead>
                                      <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {getCategoryTemplates(category, "custom").map((template) => (
                                      <TableRow key={template.id}>
                                        <TableCell className="font-medium">
                                          <div className="flex flex-col sm:block">
                                            <span>{template.name}</span>
                                            <span className="text-xs text-muted-foreground sm:hidden mt-1">{getTypeLabel(template.type)}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">{getTypeLabel(template.type)}</TableCell>
                                        <TableCell className="max-w-[150px] sm:max-w-md truncate">{template.subject}</TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                                            <Button
                                              variant="ghost"
                                              size="icon-sm"
                                              className="h-7 w-7 sm:h-8 sm:w-8"
                                              onClick={() => handlePreview(template)}
                                              title="Preview"
                                            >
                                              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon-sm"
                                              className="h-7 w-7 sm:h-8 sm:w-8"
                                              onClick={() => handleEdit(template)}
                                              title="Edit"
                                            >
                                              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon-sm"
                                              className="h-7 w-7 sm:h-8 sm:w-8"
                                              onClick={() => handleDelete(template.id)}
                                              title="Delete"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Customize Dialog */}
      <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Template for Your Organization</DialogTitle>
            <DialogDescription>
              Customize this master template for your organization. Changes will only affect your organization.
            </DialogDescription>
          </DialogHeader>
          {customizingTemplate && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">Original Template: {customizingTemplate.name}</p>
                <p className="text-xs text-muted-foreground">Type: {getTypeLabel(customizingTemplate.type)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customize-subject">Subject *</Label>
                <Input
                  id="customize-subject"
                  value={customizeData.subject}
                  onChange={(e) => setCustomizeData({ ...customizeData, subject: e.target.value })}
                  placeholder="Enter email subject"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customize-body">Body *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVariables(!showVariables)}
                  >
                    {showVariables ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showVariables ? "Hide" : "Show"} Variables
                  </Button>
                </div>
                {showVariables && (
                  <div className="p-2 sm:p-3 bg-muted rounded-md mb-2">
                    <p className="text-xs sm:text-sm font-medium mb-2">Available Variables:</p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {Object.values(TEMPLATE_VARIABLES).map((variable) => (
                        <Button
                          key={variable}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(variable, true)}
                          className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                        >
                          {variable}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <Textarea
                  id="customize-body"
                  value={customizeData.body}
                  onChange={(e) => setCustomizeData({ ...customizeData, body: e.target.value })}
                  placeholder="Enter email body"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCustomizeDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustomize}
              disabled={!customizeData.subject || !customizeData.body}
              className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
            >
              Customize Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen || createDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open)
        setCreateDialogOpen(open)
        if (!open) {
          setEditingTemplate(null)
          setFormData({
            name: "",
            category: EmailTemplateCategory.SERVICE,
            type: EmailTemplateType.GST_FILING,
            subject: "",
            body: "",
          })
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Update the email template" : "Create a new email template for your organization"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter template name"
              />
            </div>
            {!editingTemplate && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="template-category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        category: value as EmailTemplateCategory,
                        type: getDefaultTypeForCategory(value as EmailTemplateCategory),
                      })
                    }}
                  >
                    <SelectTrigger id="template-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(EmailTemplateCategory).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {getCategoryLabel(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as EmailTemplateType })}
                  >
                    <SelectTrigger id="template-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(EmailTemplateType)
                        .filter(type => {
                          const defaultTemplate = DEFAULT_EMAIL_TEMPLATES.find(t => t.type === type)
                          return defaultTemplate?.category === formData.category
                        })
                        .map((type) => (
                          <SelectItem key={type} value={type}>
                            {getTypeLabel(type)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="template-subject">Subject *</Label>
              <Input
                id="template-subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter email subject"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="template-body">Body *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVariables(!showVariables)}
                >
                  {showVariables ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showVariables ? "Hide" : "Show"} Variables
                </Button>
              </div>
              {showVariables && (
                <div className="p-2 sm:p-3 bg-muted rounded-md mb-2">
                  <p className="text-xs sm:text-sm font-medium mb-2">Available Variables:</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {Object.values(TEMPLATE_VARIABLES).map((variable) => (
                      <Button
                        key={variable}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(variable, false)}
                        className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                      >
                        {variable}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Textarea
                id="template-body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Enter email body"
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setCreateDialogOpen(false)
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Save button clicked', { formData, editingTemplate })
                handleSave()
              }}
              disabled={!formData.name || !formData.subject || !formData.body}
              className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
              type="button"
            >
              {editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview of the email template
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">Subject:</Label>
                <p className="mt-1 p-2 bg-muted rounded">{previewTemplate.subject}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Body:</Label>
                <div className="mt-1 p-4 bg-muted rounded whitespace-pre-wrap font-mono text-sm">
                  {previewTemplate.body}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

