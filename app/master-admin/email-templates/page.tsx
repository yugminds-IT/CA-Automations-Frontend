"use client"

import { LekvyaLoader } from "@/components/ui/lekvya-loader"
import { EmptyState } from "@/components/ui/empty-state"
import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, isMasterAdminUser, ApiError } from "@/lib/api/index"
import {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  EmailTemplateCategory,
  EmailTemplateType,
  type EmailTemplate,
  type EmailTemplateTypeValue,
} from "@/lib/api/index"
import type { TemplateCategory } from "@/lib/api/index"
import { getTypesByCategory } from "@/lib/api/email-templates"
import { useToast } from "@/components/ui/use-toast"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Mail,
  Edit,
  Trash2,
  Plus,
  Eye,
  FileText,
  Search,
  Bell,
  Clock,
  RefreshCw,
  ChevronDown,
  Building2,
} from "lucide-react"
import { RichTextarea, type RichTextareaRef } from "@/components/ui/rich-textarea"
import { previewEmailTemplate, renderEmailPreview } from "@/lib/utils/email-template"
import { useTemplateVariables, exampleValues } from "@/lib/template-variables"
import { VarLineInput, VarPickerButton, UnknownVarsNotice, type VarLineInputHandle } from "@/components/email-management/var-tags"

export default function MasterAdminEmailTemplates() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [systemTemplates, setSystemTemplates] = useState<EmailTemplate[]>([])
  const [orgTemplates, setOrgTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all")
  const [systemCollapsed, setSystemCollapsed] = useState(true)
  const [orgCollapsed, setOrgCollapsed] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    category: TemplateCategory
    type: string
    subject: string
    body: string
  }>({
    name: "",
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.GST_FILING,
    subject: "",
    body: "",
  })
  const [bodyTab, setBodyTab] = useState<"edit" | "preview">("edit")
  const [availableTypes, setAvailableTypes] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    if (!formData.category) return
    let active = true
    getTypesByCategory(formData.category)
      .then((res: any) => {
        if (!active) return
        const list = Array.isArray(res) ? res : []
        setAvailableTypes(list)
        if (list.length > 0 && (!formData.type || !list.some((item) => item.value === formData.type))) {
          setFormData((prev) => ({ ...prev, type: list[0].value }))
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [formData.category])

  // Refs for variable insertion
  const editorRef = useRef<RichTextareaRef | null>(null)
  const subjectRef = useRef<VarLineInputHandle | null>(null)
  // One variable list (server catalog), shared with Send Mails; previews use sample values
  const { vars } = useTemplateVariables()
  const previewValues = useMemo(() => exampleValues(vars), [vars])

  const router = useRouter()
  const { toast } = useToast()


  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return }
    if (!isMasterAdminUser()) {
      toast({ title: "Access Denied", description: "You must be a master admin to access this page.", variant: "destructive" })
      router.replace("/dashboard")
      return
    }
    setIsCheckingAuth(false)
    fetchTemplates()
  }, [router, toast])

  // ─── API calls ────────────────────────────────────────────────────────────
  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const list = await getEmailTemplates()
      const all = Array.isArray(list) ? list : []
      setSystemTemplates(all.filter((t: EmailTemplate) => t.organizationId == null))
      setOrgTemplates(all.filter((t: EmailTemplate) => t.organizationId != null))
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login")
      } else {
        toast({ title: "Error", description: "Failed to load email templates.", variant: "destructive" })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormData({ name: template.name, category: template.category as TemplateCategory, type: template.type, subject: template.subject, body: template.body })
    setBodyTab("edit")
    setEditDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setFormData({ name: "", category: EmailTemplateCategory.SERVICE, type: getDefaultTypeForCategory(EmailTemplateCategory.SERVICE), subject: "", body: "" })
    setBodyTab("edit")
    setCreateDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await updateEmailTemplate(editingTemplate.id, { name: formData.name, subject: formData.subject, body: formData.body })
        toast({ title: "Success", description: "Template updated successfully", variant: "success" })
      } else {
        await createEmailTemplate({ name: formData.name, category: formData.category, type: formData.type, subject: formData.subject, body: formData.body, is_default: false })
        toast({ title: "Success", description: "Template created successfully", variant: "success" })
      }
      setEditDialogOpen(false)
      setCreateDialogOpen(false)
      fetchTemplates()
    } catch (error) {
      toast({ title: "Error", description: error instanceof ApiError ? (error.detail as string) || "Failed to save template" : "Failed to save template", variant: "destructive" })
    }
  }

  const handleDelete = async (templateId: number) => {
    if (!confirm("Are you sure you want to delete this template? This action cannot be undone.")) return
    try {
      await deleteEmailTemplate(templateId)
      toast({ title: "Success", description: "Template deleted successfully", variant: "success" })
      fetchTemplates()
    } catch (error) {
      toast({ title: "Error", description: error instanceof ApiError ? (error.detail as string) || "Failed to delete template" : "Failed to delete template", variant: "destructive" })
    }
  }

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template)
    setPreviewDialogOpen(true)
  }

  // ─── Label / style helpers ────────────────────────────────────────────────
  const getDefaultTypeForCategory = (category: EmailTemplateCategory): EmailTemplateTypeValue => {
    switch (category) {
      case EmailTemplateCategory.SERVICE:      return EmailTemplateType.GST_FILING
      case EmailTemplateCategory.LOGIN:        return EmailTemplateType.LOGIN_CREDENTIALS
      case EmailTemplateCategory.NOTIFICATION: return EmailTemplateType.CLIENT_ONBOARDED
      case EmailTemplateCategory.FOLLOW_UP:    return EmailTemplateType.FOLLOW_UP_DOCUMENTS
      case EmailTemplateCategory.REMINDER:     return EmailTemplateType.REMINDER_DEADLINE
      default:                                  return EmailTemplateType.GST_FILING
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case EmailTemplateCategory.SERVICE:      return "Service"
      case EmailTemplateCategory.LOGIN:        return "Login Credentials"
      case EmailTemplateCategory.NOTIFICATION: return "Notifications"
      case EmailTemplateCategory.FOLLOW_UP:    return "Follow-ups"
      case EmailTemplateCategory.REMINDER:     return "Reminders"
      default: return category
    }
  }

  const getTypeLabel = (type: string) =>
    type.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case EmailTemplateCategory.LOGIN:        return Mail
      case EmailTemplateCategory.NOTIFICATION: return Bell
      case EmailTemplateCategory.REMINDER:     return Clock
      case EmailTemplateCategory.FOLLOW_UP:    return RefreshCw
      default: return FileText
    }
  }

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case EmailTemplateCategory.SERVICE:      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case EmailTemplateCategory.LOGIN:        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case EmailTemplateCategory.NOTIFICATION: return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      case EmailTemplateCategory.FOLLOW_UP:    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      case EmailTemplateCategory.REMINDER:     return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  const filterTemplates = (templates: EmailTemplate[]) =>
    templates.filter((t) => {
      const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase()) || t.subject.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = activeCategoryFilter === "all" || t.category === activeCategoryFilter
      return matchesSearch && matchesCategory
    })

  const filteredSystemTemplates = filterTemplates(systemTemplates)
  const filteredOrgTemplates = filterTemplates(orgTemplates)

  // Group org templates by organization name
  const orgTemplatesByOrg = filteredOrgTemplates.reduce<Record<string, EmailTemplate[]>>((acc, t) => {
    const orgName = t.organization?.name ?? `Organization ${t.organizationId}`
    if (!acc[orgName]) acc[orgName] = []
    acc[orgName].push(t)
    return acc
  }, {})

  const categoryFilters = [
    { value: "all",                              label: "All" },
    { value: EmailTemplateCategory.LOGIN,        label: "Login Credentials" },
    { value: EmailTemplateCategory.NOTIFICATION, label: "Notifications" },
    { value: EmailTemplateCategory.FOLLOW_UP,    label: "Follow-ups" },
    { value: EmailTemplateCategory.REMINDER,     label: "Reminders" },
    { value: EmailTemplateCategory.SERVICE,      label: "Service" },
  ]

  if (isCheckingAuth) {
    return <LekvyaLoader className="min-h-[60vh]" />
  }

  return (
    <>
        <div>
          <div className="p-4 sm:p-6 space-y-5">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Email Templates</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage system-wide email templates</p>
              </div>
              <Button onClick={handleCreate} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create New Template
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search templates by name or category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {categoryFilters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setActiveCategoryFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    activeCategoryFilter === f.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* System Templates */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setSystemCollapsed((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="text-left">
                  <h2 className="text-sm font-semibold">System Templates <span className="ml-1.5 text-xs font-normal text-muted-foreground">({filteredSystemTemplates.length})</span></h2>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${systemCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!systemCollapsed && (
              <div className="p-4">
              {isLoading ? (
                <div className="flex justify-center py-6"><LekvyaLoader /></div>
              ) : filteredSystemTemplates.length === 0 ? (
                <EmptyState icon={FileText} title="No system templates found" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSystemTemplates.map((template) => {
                    const Icon = getCategoryIcon(template.category)
                    return (
                      <div key={template.id} className="flex flex-col border border-border rounded-xl shadow-sm p-4 bg-card hover:shadow-md transition-all duration-150">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 rounded-md bg-muted shrink-0">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{template.name}</p>
                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryBadgeClass(template.category)}`}>
                              {getCategoryLabel(template.category)}
                            </span>
                          </div>
                          {Boolean((template as any).is_default) && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0">Default</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 flex-1 truncate">{template.subject}</p>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => handleEdit(template)}>
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => handlePreview(template)} title="Preview">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {!template.is_default && (
                            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(template.id)} title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              </div>
              )}
            </div>

            {/* Organization-specific Templates */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOrgCollapsed((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="text-left">
                  <h2 className="text-sm font-semibold">Organization Templates <span className="ml-1.5 text-xs font-normal text-muted-foreground">({filteredOrgTemplates.length})</span></h2>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${orgCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!orgCollapsed && (
              <div className="p-4">
              {isLoading ? (
                <div className="flex justify-center py-6"><LekvyaLoader /></div>
              ) : filteredOrgTemplates.length === 0 ? (
                <EmptyState icon={Mail} title="No organization templates yet" />
              ) : (
                <div className="space-y-6">
                  {Object.entries(orgTemplatesByOrg).map(([orgName, templates]) => (
                    <div key={orgName}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium text-foreground">{orgName}</h3>
                        <span className="text-xs text-muted-foreground">({templates.length} template{templates.length !== 1 ? "s" : ""})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {templates.map((template) => (
                          <div key={template.id} className="flex flex-col border border-border rounded-lg shadow-sm p-3 bg-card hover:shadow-md transition-all duration-150">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="min-w-0">
                                <p className="font-medium text-xs text-foreground truncate">{template.name}</p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{template.subject}</p>
                              </div>
                              <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${getCategoryBadgeClass(template.category)}`}>
                                {getCategoryLabel(template.category)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{getTypeLabel(template.type)}</p>
                            <div className="border-t border-border pt-2 flex items-center gap-0.5">
                              <Button size="sm" variant="ghost" className="h-9 flex-1 px-1" onClick={() => handleEdit(template)}>
                                <Edit className="w-3 h-3 mr-1" />Edit
                              </Button>
                              <Button size="sm" variant="ghost" className="h-9 flex-1 px-1" onClick={() => handlePreview(template)}>
                                <Eye className="w-3 h-3 mr-1" />Preview
                              </Button>
                              <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(template.id)} title="Delete">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
              )}
            </div>

          </div>
        </div>

      {/* ─── Edit / Create Dialog ──────────────────────────────────────────── */}
      <Dialog open={editDialogOpen || createDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open)
        setCreateDialogOpen(open)
        if (!open) {
          setEditingTemplate(null)
          setFormData({ name: "", category: EmailTemplateCategory.SERVICE, type: EmailTemplateType.GST_FILING, subject: "", body: "" })
          setBodyTab("edit")
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[900px] max-h-[95vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>{editingTemplate ? "Update the email template" : "Create a new system-wide email template"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingTemplate ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input id="template-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter template name" className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as EmailTemplateCategory, type: getDefaultTypeForCategory(value as EmailTemplateCategory) })}>
                      <SelectTrigger id="template-category" className="h-9 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.values(EmailTemplateCategory).map((cat) => (
                          <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-type">Type *</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as EmailTemplateTypeValue })}>
                      <SelectTrigger id="template-type" className="h-9 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {availableTypes.length > 0 ? (
                          availableTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value={formData.type || "custom"}>{formData.type || "Default"}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input id="template-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter template name" className="h-9" />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="template-subject">Subject *</Label>
                <VarPickerButton vars={vars} onPick={(t) => subjectRef.current?.insert(t)} />
              </div>
              <VarLineInput ref={subjectRef} id="template-subject" ariaLabel="Subject" vars={vars} value={formData.subject} onChange={(v) => setFormData((p) => ({ ...p, subject: v }))} placeholder="Enter email subject (type @ to add a variable)" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBodyTab("edit")}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${bodyTab === "edit" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  >Edit</button>
                  <button
                    type="button"
                    onClick={() => setBodyTab("preview")}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border flex items-center gap-1.5 ${bodyTab === "preview" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  >
                    <Eye className="h-3 w-3" />Preview
                  </button>
                </div>
                {bodyTab === "edit" && <VarPickerButton vars={vars} label="Insert Variable" onPick={(t) => editorRef.current?.insert(t)} />}
              </div>
              {bodyTab === "edit" ? (
                <RichTextarea
                  ref={editorRef}
                  value={formData.body}
                  onChange={(v) => setFormData((prev) => ({ ...prev, body: v }))}
                  placeholder="Write your email body here. Type @ or click 'Insert Variable' to add a variable.\"
                  minHeight={280}
                  variables={vars}
                />
              ) : (
                <div className="rounded-md border border-border overflow-hidden" style={{ height: 300 }}>
                  <iframe
                    srcDoc={previewEmailTemplate(formData.body, formData.subject || "Preview", previewValues)}
                    title="Email preview"
                    className="w-full h-full border-0"
                  />
                </div>
              )}
              <UnknownVarsNotice text={`${formData.subject} ${formData.body}`} vars={vars} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setCreateDialogOpen(false) }} className="w-full sm:w-auto">Cancel</Button>
            <Button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave() }}
              disabled={!formData.name || !formData.subject || !formData.body}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Preview Dialog ────────────────────────────────────────────────── */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>Preview of the email template</DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <Label className="text-sm font-medium">Subject:</Label>
                <p className="mt-1 p-3 bg-muted rounded border">{renderEmailPreview(previewTemplate.subject, '', previewValues).subject}</p>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Email Preview:</Label>
                <div className="border rounded-md bg-card overflow-auto" style={{ maxHeight: "calc(90vh - 250px)" }}>
                  <iframe
                    srcDoc={previewEmailTemplate(previewTemplate.body, previewTemplate.subject, previewValues)}
                    title="Email preview"
                    className="w-full border-0"
                    style={{ minHeight: 300, height: "calc(90vh - 260px)" }}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)} className="w-full sm:w-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
