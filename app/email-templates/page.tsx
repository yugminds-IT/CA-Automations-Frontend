"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getUserData, isAuthenticated, ApiError } from "@/lib/api/index"
import {
  getOrgEmailTemplates,
  customizeMasterTemplate,
  createOrgEmailTemplate,
  updateOrgEmailTemplate,
  deleteOrgEmailTemplate,
  EmailTemplateCategory,
  EmailTemplateType,
  type EmailTemplate,
  type EmailTemplateTypeValue,
} from "@/lib/api/index"
import type { TemplateCategory } from "@/lib/api/index"
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/api/default-email-templates"
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
  Copy,
  Code,
  FileText,
  Search,
  Bell,
  Clock,
  RefreshCw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ChevronDown,
  Palette,
} from "lucide-react"
import { previewEmailTemplate } from "@/lib/utils/email-template"

// ─── Grouped template variables ─────────────────────────────────────────────
const TEMPLATE_VAR_GROUPS = [
  {
    label: 'Client Details',
    vars: [
      { label: 'Client Name',      value: '{{client_name}}' },
      { label: 'Client Email',     value: '{{client_email}}' },
      { label: 'Client Phone',     value: '{{client_phone}}' },
      { label: 'Company Name',     value: '{{company_name}}' },
      { label: 'Login Email',      value: '{{login_email}}' },
      { label: 'Login Password',   value: '{{login_password}}' },
      { label: 'Login URL',        value: '{{login_url}}' },
      { label: 'Additional Notes', value: '{{additional_notes}}' },
    ],
  },
  {
    label: 'Organization Details',
    vars: [
      { label: 'Org Name',  value: '{{org_name}}' },
      { label: 'Org Email', value: '{{org_email}}' },
      { label: 'Org Phone', value: '{{org_phone}}' },
    ],
  },
  {
    label: 'Service & Dates',
    vars: [
      { label: 'Service Name',        value: '{{service_name}}' },
      { label: 'Service Description', value: '{{service_description}}' },
      { label: 'Date',                value: '{{date}}' },
      { label: 'Today',               value: '{{today}}' },
      { label: 'Current Date',        value: '{{current_date}}' },
      { label: 'Deadline Date',       value: '{{deadline_date}}' },
      { label: 'Follow-up Date',      value: '{{follow_up_date}}' },
      { label: 'Amount',              value: '{{amount}}' },
      { label: 'Document Name',       value: '{{document_name}}' },
    ],
  },
]

const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32']
const FONT_FAMILIES = ['Default', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana']

export default function EmailTemplatesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [masterTemplates, setMasterTemplates] = useState<EmailTemplate[]>([])
  const [orgTemplates, setOrgTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [customizingTemplate, setCustomizingTemplate] = useState<EmailTemplate | null>(null)
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
  const [customizeData, setCustomizeData] = useState({ subject: "", body: "" })
  const [bodyViewMode, setBodyViewMode] = useState<"edit" | "preview">("edit")
  const [customizeBodyViewMode, setCustomizeBodyViewMode] = useState<"edit" | "preview">("edit")

  // Rich editor refs
  const editorRef = useRef<HTMLDivElement | null>(null)
  const customizeEditorRef = useRef<HTMLDivElement | null>(null)
  const varDropdownRef = useRef<HTMLDivElement | null>(null)
  const customizeVarDropdownRef = useRef<HTMLDivElement | null>(null)
  const [varDropdownOpen, setVarDropdownOpen] = useState(false)
  const [customizeVarDropdownOpen, setCustomizeVarDropdownOpen] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  // ─── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (varDropdownRef.current && !varDropdownRef.current.contains(e.target as Node)) {
        setVarDropdownOpen(false)
      }
      if (customizeVarDropdownRef.current && !customizeVarDropdownRef.current.contains(e.target as Node)) {
        setCustomizeVarDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Sync editor content when dialogs open ────────────────────────────────
  useEffect(() => {
    if ((editDialogOpen || createDialogOpen) && bodyViewMode === 'edit') {
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = formData.body
      }, 0)
    }
  }, [editDialogOpen, createDialogOpen])

  useEffect(() => {
    if (!editDialogOpen && !createDialogOpen) setBodyViewMode("edit")
  }, [editDialogOpen, createDialogOpen])

  useEffect(() => {
    if (customizeDialogOpen && customizeBodyViewMode === 'edit') {
      setTimeout(() => {
        if (customizeEditorRef.current) customizeEditorRef.current.innerHTML = customizeData.body
      }, 0)
    }
  }, [customizeDialogOpen])

  useEffect(() => {
    if (!customizeDialogOpen) setCustomizeBodyViewMode("edit")
  }, [customizeDialogOpen])

  // ─── Sidebar / auth ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return }
    const user = getUserData()
    if (user?.role === 'client') { router.replace('/uploads'); return }
    setIsCheckingAuth(false)
    fetchTemplates()
  }, [router])

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    setSidebarCollapsed(savedState !== null ? savedState === 'true' : true)
  }, [])

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)
    return () => window.removeEventListener('resize', checkIsDesktop)
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed)

  // ─── Rich editor helpers ──────────────────────────────────────────────────
  const execCmd = (cmd: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
  }

  const customizeExecCmd = (cmd: string, value?: string) => {
    customizeEditorRef.current?.focus()
    document.execCommand(cmd, false, value)
  }

  const insertVar = (varStr: string) => {
    editorRef.current?.focus()
    document.execCommand('insertText', false, varStr)
    setFormData((prev) => ({ ...prev, body: editorRef.current?.innerHTML ?? prev.body }))
    setVarDropdownOpen(false)
  }

  const customizeInsertVar = (varStr: string) => {
    customizeEditorRef.current?.focus()
    document.execCommand('insertText', false, varStr)
    setCustomizeData((prev) => ({ ...prev, body: customizeEditorRef.current?.innerHTML ?? prev.body }))
    setCustomizeVarDropdownOpen(false)
  }

  // ─── API calls ────────────────────────────────────────────────────────────
  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await getOrgEmailTemplates({ limit: 1000 })
      const all = Array.isArray(response) ? response : (response as { templates?: EmailTemplate[] })?.templates ?? []
      setMasterTemplates(all.filter((t: EmailTemplate) => t.organizationId == null))
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

  const handleCustomize = (template: EmailTemplate) => {
    setCustomizingTemplate(template)
    setCustomizeData({ subject: template.subject, body: template.body })
    setCustomizeDialogOpen(true)
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormData({ name: template.name, category: template.category as TemplateCategory, type: template.type, subject: template.subject, body: template.body })
    setEditDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setFormData({ name: "", category: EmailTemplateCategory.SERVICE, type: getDefaultTypeForCategory(EmailTemplateCategory.SERVICE), subject: "", body: "" })
    setCreateDialogOpen(true)
  }

  const handleSaveCustomize = async () => {
    if (!customizingTemplate) return
    try {
      await customizeMasterTemplate(customizingTemplate.id, { subject: customizeData.subject, body: customizeData.body })
      toast({ title: "Success", description: "Template customized successfully", variant: "success" })
      setCustomizeDialogOpen(false)
      fetchTemplates()
    } catch (error) {
      toast({ title: "Error", description: error instanceof ApiError ? (error.detail as string) || "Failed to customize template" : "Failed to customize template", variant: "destructive" })
    }
  }

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await updateOrgEmailTemplate(editingTemplate.id, { name: formData.name, subject: formData.subject, body: formData.body })
        toast({ title: "Success", description: "Template updated successfully", variant: "success" })
      } else {
        await createOrgEmailTemplate({ name: formData.name, category: formData.category, type: formData.type, subject: formData.subject, body: formData.body, is_default: false })
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
      await deleteOrgEmailTemplate(templateId)
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
    type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

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

  const filteredMasterTemplates = filterTemplates(masterTemplates)
  const filteredOrgTemplates = filterTemplates(orgTemplates)

  const categoryFilters = [
    { value: "all",                              label: "All" },
    { value: EmailTemplateCategory.LOGIN,        label: "Login Credentials" },
    { value: EmailTemplateCategory.NOTIFICATION, label: "Notifications" },
    { value: EmailTemplateCategory.FOLLOW_UP,    label: "Follow-ups" },
    { value: EmailTemplateCategory.REMINDER,     label: "Reminders" },
    { value: EmailTemplateCategory.SERVICE,      label: "Service" },
  ]

  // ─── Shared rich-editor toolbar renderer ─────────────────────────────────
  const renderToolbar = (isCustomize: boolean) => {
    const cmd      = isCustomize ? customizeExecCmd       : execCmd
    const dropRef  = isCustomize ? customizeVarDropdownRef : varDropdownRef
    const dropOpen = isCustomize ? customizeVarDropdownOpen : varDropdownOpen
    const setOpen  = isCustomize ? setCustomizeVarDropdownOpen : setVarDropdownOpen
    const onVar    = isCustomize ? customizeInsertVar      : insertVar

    const toolBtn = (title: string, icon: React.ReactNode, action: () => void) => (
      <button
        key={title}
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); action() }}
        className="p-1.5 rounded hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
      >
        {icon}
      </button>
    )

    return (
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 rounded-t-md">
        {toolBtn('Bold',          <Bold className="h-3.5 w-3.5" />,          () => cmd('bold'))}
        {toolBtn('Italic',        <Italic className="h-3.5 w-3.5" />,        () => cmd('italic'))}
        {toolBtn('Underline',     <Underline className="h-3.5 w-3.5" />,     () => cmd('underline'))}
        {toolBtn('Strikethrough', <Strikethrough className="h-3.5 w-3.5" />, () => cmd('strikeThrough'))}

        <span className="w-px h-4 bg-border mx-1" />

        {toolBtn('Align Left',   <AlignLeft className="h-3.5 w-3.5" />,   () => cmd('justifyLeft'))}
        {toolBtn('Align Center', <AlignCenter className="h-3.5 w-3.5" />, () => cmd('justifyCenter'))}
        {toolBtn('Align Right',  <AlignRight className="h-3.5 w-3.5" />,  () => cmd('justifyRight'))}

        <span className="w-px h-4 bg-border mx-1" />

        {toolBtn('Bullet List',   <List className="h-3.5 w-3.5" />,        () => cmd('insertUnorderedList'))}
        {toolBtn('Numbered List', <ListOrdered className="h-3.5 w-3.5" />, () => cmd('insertOrderedList'))}

        <span className="w-px h-4 bg-border mx-1" />

        <select
          title="Font Size"
          defaultValue=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { isCustomize ? customizeEditorRef.current?.focus() : editorRef.current?.focus(); cmd('fontSize', e.target.value) }}
          className="h-7 rounded border border-input bg-background text-xs px-1 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="" disabled>Size</option>
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>

        <select
          title="Font Family"
          defaultValue=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { isCustomize ? customizeEditorRef.current?.focus() : editorRef.current?.focus(); cmd('fontName', e.target.value) }}
          className="h-7 rounded border border-input bg-background text-xs px-1 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="" disabled>Font</option>
          {FONT_FAMILIES.map((f) => <option key={f} value={f === 'Default' ? 'inherit' : f}>{f}</option>)}
        </select>

        <span className="w-px h-4 bg-border mx-1" />

        <label title="Text Color" className="p-1.5 rounded hover:bg-muted transition-colors cursor-pointer text-foreground/70 hover:text-foreground flex items-center">
          <Palette className="h-3.5 w-3.5" />
          <input type="color" className="sr-only" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { isCustomize ? customizeEditorRef.current?.focus() : editorRef.current?.focus(); cmd('foreColor', e.target.value) }} />
        </label>

        <span className="w-px h-4 bg-border mx-1" />

        {/* Variables dropdown */}
        <div ref={dropRef} className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v) }}
            className="flex items-center gap-1 h-7 px-2 rounded border border-input bg-background text-xs hover:bg-muted transition-colors font-medium"
          >
            Variables
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {dropOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 max-h-[240px] overflow-y-auto rounded-lg border border-border bg-popover shadow-lg z-50 py-1 text-sm">
              {TEMPLATE_VAR_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                  {group.vars.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); onVar(v.value) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="text-foreground">{v.label}</span>
                      <span className="text-[10px] font-mono text-primary/70 truncate">{v.value}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
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
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} collapsed={sidebarCollapsed} />
      <div
        className="flex flex-col flex-1 transition-all duration-300 overflow-hidden min-w-0"
        style={{
          marginLeft: isDesktop ? (sidebarCollapsed ? '60px' : '240px') : '0',
          width: isDesktop ? (sidebarCollapsed ? 'calc(100% - 60px)' : 'calc(100% - 240px)') : '100%',
        }}
      >
        <Header onMenuClick={() => setMobileMenuOpen(true)} onSidebarToggle={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        <div className="overflow-y-auto overflow-x-hidden w-full" style={{ height: "calc(100vh - 54px)", marginTop: "54px" }}>
          <div className="p-4 sm:p-6 space-y-5">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Email Templates</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your email templates</p>
              </div>
              <Button onClick={handleCreate} className="w-full sm:w-auto" size="sm">
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

            {/* Pre-built Templates */}
            <div>
              <div className="mb-3">
                <h2 className="text-sm font-semibold">Pre-built Templates</h2>
                <p className="text-xs text-muted-foreground">Click to customize and use in your organization</p>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">Loading templates...</div>
              ) : filteredMasterTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">No pre-built templates found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMasterTemplates.map((template) => {
                    const Icon = getCategoryIcon(template.category)
                    const hasCustomVersion = orgTemplates.some((ot) => ot.type === template.type && ot.category === template.category)
                    return (
                      <div key={template.id} className="flex flex-col border border-border rounded-xl shadow-sm p-4 bg-card hover:shadow-md transition-all duration-150">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 rounded-md bg-muted shrink-0"><Icon className="w-5 h-5 text-muted-foreground" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{template.name}</p>
                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryBadgeClass(template.category)}`}>{getCategoryLabel(template.category)}</span>
                          </div>
                          {hasCustomVersion && <span className="text-xs text-green-600 dark:text-green-400 font-medium shrink-0">Customized</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 flex-1">Click to customize and use</p>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handleCustomize(template)}>Use Template</Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handlePreview(template)} title="Preview"><Eye className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Your Templates */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Your Templates</h2>
                  <p className="text-xs text-muted-foreground">Organization-specific customized templates</p>
                </div>
                {orgTemplates.length > 0 && (
                  <span className="text-sm text-muted-foreground">{filteredOrgTemplates.length} template{filteredOrgTemplates.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">Loading templates...</div>
              ) : filteredOrgTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-lg text-muted-foreground">
                  <Mail className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">No custom templates yet</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={handleCreate}><Plus className="w-3.5 h-3.5 mr-1.5" />Create your first template</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredOrgTemplates.map((template) => (
                    <div key={template.id} className="flex flex-col border border-border rounded-lg shadow-sm p-3 bg-card hover:shadow-md transition-all duration-150">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p className="font-medium text-xs text-foreground truncate">{template.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{template.subject}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getCategoryBadgeClass(template.category)}`}>{getCategoryLabel(template.category)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">{getTypeLabel(template.type)}</p>
                      <div className="border-t border-border pt-2 flex items-center gap-0.5">
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] flex-1 px-1" onClick={() => handleEdit(template)}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] flex-1 px-1" onClick={() => handleCustomize(template)}><Copy className="w-3 h-3 mr-1" />Copy</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] flex-1 px-1" onClick={() => handlePreview(template)}><Eye className="w-3 h-3 mr-1" />Preview</Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(template.id)} title="Delete"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ─── Customize Dialog ──────────────────────────────────────────────── */}
      <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Template for Your Organization</DialogTitle>
            <DialogDescription>Customize this default template. Changes only affect your organization.</DialogDescription>
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
                  <Label>Email Body *</Label>
                  <div className="flex border rounded-md">
                    <Button type="button" variant={customizeBodyViewMode === "edit" ? "default" : "ghost"} size="sm" onClick={() => setCustomizeBodyViewMode("edit")} className="rounded-r-none border-r">
                      <Code className="w-4 h-4 mr-2" />Edit
                    </Button>
                    <Button type="button" variant={customizeBodyViewMode === "preview" ? "default" : "ghost"} size="sm" onClick={() => setCustomizeBodyViewMode("preview")} className="rounded-l-none">
                      <Eye className="w-4 h-4 mr-2" />Preview
                    </Button>
                  </div>
                </div>
                {customizeBodyViewMode === "edit" ? (
                  <div className="rounded-md border border-input overflow-hidden">
                    {renderToolbar(true)}
                    <div
                      ref={customizeEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="min-h-[360px] w-full bg-background px-3 py-3 text-sm focus:outline-none [&_b]:font-bold [&_i]:italic [&_u]:underline [&_s]:line-through"
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      onInput={() => setCustomizeData((prev) => ({ ...prev, body: customizeEditorRef.current?.innerHTML ?? prev.body }))}
                    />
                  </div>
                ) : (
                  <div className="border rounded-md p-4 bg-white min-h-[300px] max-h-[500px] overflow-auto">
                    <div dangerouslySetInnerHTML={{ __html: previewEmailTemplate(customizeData.body, customizeData.subject) }} style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }} />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCustomizeDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSaveCustomize} disabled={!customizeData.subject || !customizeData.body} className="w-full sm:w-auto">Customize Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit / Create Dialog ──────────────────────────────────────────── */}
      <Dialog open={editDialogOpen || createDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open)
        setCreateDialogOpen(open)
        if (!open) {
          setEditingTemplate(null)
          setFormData({ name: "", category: EmailTemplateCategory.SERVICE, type: EmailTemplateType.GST_FILING, subject: "", body: "" })
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[900px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>{editingTemplate ? "Update the email template" : "Create a new email template for your organization"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingTemplate ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input id="template-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter template name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as EmailTemplateCategory, type: getDefaultTypeForCategory(value as EmailTemplateCategory) })}>
                    <SelectTrigger id="template-category"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger id="template-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(EmailTemplateType).filter((type) => {
                        const defaultTemplate = DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === type)
                        return defaultTemplate?.category === formData.category
                      }).map((type) => (
                        <SelectItem key={type} value={type}>{getTypeLabel(type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input id="template-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter template name" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="template-subject">Subject *</Label>
              <Input id="template-subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Enter email subject" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Body *</Label>
                <div className="flex border rounded-md">
                  <Button type="button" variant={bodyViewMode === "edit" ? "default" : "ghost"} size="sm" onClick={() => setBodyViewMode("edit")} className="rounded-r-none border-r">
                    <Code className="w-4 h-4 mr-2" />Edit
                  </Button>
                  <Button type="button" variant={bodyViewMode === "preview" ? "default" : "ghost"} size="sm" onClick={() => setBodyViewMode("preview")} className="rounded-l-none">
                    <Eye className="w-4 h-4 mr-2" />Preview
                  </Button>
                </div>
              </div>
              {bodyViewMode === "edit" ? (
                <div className="rounded-md border border-input overflow-hidden">
                  {renderToolbar(false)}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-[360px] w-full bg-background px-3 py-3 text-sm focus:outline-none [&_b]:font-bold [&_i]:italic [&_u]:underline [&_s]:line-through"
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    onInput={() => setFormData((prev) => ({ ...prev, body: editorRef.current?.innerHTML ?? prev.body }))}
                  />
                </div>
              ) : (
                <div className="border rounded-md p-4 bg-white min-h-[300px] max-h-[500px] overflow-auto">
                  <div dangerouslySetInnerHTML={{ __html: previewEmailTemplate(formData.body, formData.subject) }} style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setCreateDialogOpen(false) }} className="w-full sm:w-auto">Cancel</Button>
            <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave() }} disabled={!formData.name || !formData.subject || !formData.body} className="w-full sm:w-auto">
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
                <p className="mt-1 p-3 bg-muted rounded border">{previewTemplate.subject}</p>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Email Preview:</Label>
                <div className="border rounded-md p-4 bg-white overflow-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
                  <div dangerouslySetInnerHTML={{ __html: previewEmailTemplate(previewTemplate.body, previewTemplate.subject) }} style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)} className="w-full sm:w-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
