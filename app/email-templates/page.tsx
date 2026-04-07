"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { LekvyaLoader } from "@/components/ui/lekvya-loader"
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
  FileText,
  Search,
  Bell,
  Clock,
  RefreshCw,
  ChevronDown,
} from "lucide-react"
import { RichTextarea, type RichTextareaRef } from "@/components/ui/rich-textarea"
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
      { label: 'Org Name',       value: '{{org_name}}' },
      { label: 'Org Admin Name', value: '{{org_admin_name}}' },
      { label: 'Org Email',      value: '{{org_email}}' },
      { label: 'Org Phone',      value: '{{org_phone}}' },
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
  const [masterCollapsed, setMasterCollapsed] = useState(true)
  const [orgCollapsed, setOrgCollapsed] = useState(true)
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
  const [bodyTab, setBodyTab] = useState<'edit' | 'preview'>('edit')
  const [customizeBodyTab, setCustomizeBodyTab] = useState<'edit' | 'preview'>('edit')

  // Editor refs for variable insertion
  const editorRef = useRef<RichTextareaRef | null>(null)
  const customizeEditorRef = useRef<RichTextareaRef | null>(null)
  const subjectRef = useRef<HTMLInputElement | null>(null)
  const customizeSubjectRef = useRef<HTMLInputElement | null>(null)
  const varDropdownRef = useRef<HTMLDivElement | null>(null)
  const customizeVarDropdownRef = useRef<HTMLDivElement | null>(null)
  const subjectVarDropdownRef = useRef<HTMLDivElement | null>(null)
  const customizeSubjectVarDropdownRef = useRef<HTMLDivElement | null>(null)
  const [varDropdownOpen, setVarDropdownOpen] = useState(false)
  const [customizeVarDropdownOpen, setCustomizeVarDropdownOpen] = useState(false)
  const [subjectVarDropdownOpen, setSubjectVarDropdownOpen] = useState(false)
  const [customizeSubjectVarDropdownOpen, setCustomizeSubjectVarDropdownOpen] = useState(false)

  const router = useRouter()
  const { toast } = useToast()


  // ─── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (varDropdownRef.current && !varDropdownRef.current.contains(e.target as Node)) setVarDropdownOpen(false)
      if (customizeVarDropdownRef.current && !customizeVarDropdownRef.current.contains(e.target as Node)) setCustomizeVarDropdownOpen(false)
      if (subjectVarDropdownRef.current && !subjectVarDropdownRef.current.contains(e.target as Node)) setSubjectVarDropdownOpen(false)
      if (customizeSubjectVarDropdownRef.current && !customizeSubjectVarDropdownRef.current.contains(e.target as Node)) setCustomizeSubjectVarDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  // ─── Variable insertion helpers ───────────────────────────────────────────
  const insertAtCursor = (
    el: HTMLTextAreaElement | HTMLInputElement,
    varStr: string,
    currentValue: string,
    setValue: (v: string) => void,
    closeDropdown: () => void,
  ) => {
    const start = el.selectionStart ?? currentValue.length
    const end = el.selectionEnd ?? start
    const newVal = currentValue.substring(0, start) + varStr + currentValue.substring(end)
    setValue(newVal)
    closeDropdown()
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + varStr.length
      el.focus()
    }, 0)
  }

  const insertVar = (varStr: string) => {
    editorRef.current?.insert(varStr)
    setVarDropdownOpen(false)
  }
  const customizeInsertVar = (varStr: string) => {
    customizeEditorRef.current?.insert(varStr)
    setCustomizeVarDropdownOpen(false)
  }
  const insertVarToSubject = (varStr: string) => {
    if (subjectRef.current) insertAtCursor(subjectRef.current, varStr, formData.subject, (v) => setFormData((p) => ({ ...p, subject: v })), () => setSubjectVarDropdownOpen(false))
  }
  const customizeInsertVarToSubject = (varStr: string) => {
    if (customizeSubjectRef.current) insertAtCursor(customizeSubjectRef.current, varStr, customizeData.subject, (v) => setCustomizeData((p) => ({ ...p, subject: v })), () => setCustomizeSubjectVarDropdownOpen(false))
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

  // ─── Reusable variable dropdown ──────────────────────────────────────────
  const VarDropdown = ({
    dropRef, dropOpen, setOpen, onVar, label = 'Insert Variable',
  }: {
    dropRef: React.RefObject<HTMLDivElement | null>
    dropOpen: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    onVar: (v: string) => void
    label?: string
  }) => (
    <div ref={dropRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 h-8 px-3 rounded border border-input bg-background text-xs hover:bg-muted transition-colors font-medium"
      >
        {label}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {dropOpen && (
        <div className="absolute top-full right-0 mt-1 w-56 rounded-lg border border-border bg-popover shadow-lg z-[200] py-1 text-sm" style={{ maxHeight: 260, overflowY: 'auto' }}>
          {TEMPLATE_VAR_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
              {group.vars.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => onVar(v.value)}
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
  )

  const renderVarDropdown = (isCustomize: boolean) => (
    <VarDropdown
      dropRef={isCustomize ? customizeVarDropdownRef : varDropdownRef}
      dropOpen={isCustomize ? customizeVarDropdownOpen : varDropdownOpen}
      setOpen={isCustomize ? setCustomizeVarDropdownOpen : setVarDropdownOpen}
      onVar={isCustomize ? customizeInsertVar : insertVar}
    />
  )
  const renderSubjectVarDropdown = (isCustomize: boolean) => (
    <VarDropdown
      dropRef={isCustomize ? customizeSubjectVarDropdownRef : subjectVarDropdownRef}
      dropOpen={isCustomize ? customizeSubjectVarDropdownOpen : subjectVarDropdownOpen}
      setOpen={isCustomize ? setCustomizeSubjectVarDropdownOpen : setSubjectVarDropdownOpen}
      onVar={isCustomize ? customizeInsertVarToSubject : insertVarToSubject}
      label="Variable"
    />
  )

  if (isCheckingAuth) {
    return <LekvyaLoader className="min-h-screen" />
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
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setMasterCollapsed((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="text-left">
                  <h2 className="text-sm font-semibold">Pre-built Templates <span className="ml-1.5 text-xs font-normal text-muted-foreground">({filteredMasterTemplates.length})</span></h2>
                  {!masterCollapsed && <p className="text-xs text-muted-foreground">Click to customize and use in your organization</p>}
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${masterCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!masterCollapsed && (
                <div className="p-4">
                  {isLoading ? (
                    <div className="flex justify-center py-6"><LekvyaLoader /></div>
                  ) : filteredMasterTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileText className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-sm">No pre-built templates found</p>
                    </div>
                  ) : filteredMasterTemplates.length > 10 ? (
                    /* Compact view for >10 templates */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {filteredMasterTemplates.map((template) => {
                        const Icon = getCategoryIcon(template.category)
                        const hasCustomVersion = orgTemplates.some((ot) => ot.type === template.type && ot.category === template.category)
                        return (
                          <div key={template.id} className="flex flex-col border border-border rounded-lg p-2.5 bg-card hover:shadow-sm transition-all duration-150">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="p-1.5 rounded bg-muted shrink-0"><Icon className="w-3.5 h-3.5 text-muted-foreground" /></div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs text-foreground truncate leading-tight">{template.name}</p>
                                <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0 rounded-full font-medium ${getCategoryBadgeClass(template.category)}`}>{getCategoryLabel(template.category)}</span>
                              </div>
                              {hasCustomVersion && <span className="text-[10px] text-green-600 dark:text-green-400 font-medium shrink-0">✓</span>}
                            </div>
                            <div className="flex items-center gap-1 mt-auto">
                              <Button size="sm" variant="outline" className="flex-1 text-[10px] h-6 px-1" onClick={() => handleCustomize(template)}>Use</Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => handlePreview(template)} title="Preview"><Eye className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    /* Normal view for ≤10 templates */
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
              )}
            </div>

            {/* Your Templates */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOrgCollapsed((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="text-left">
                  <h2 className="text-sm font-semibold">Your Templates <span className="ml-1.5 text-xs font-normal text-muted-foreground">({filteredOrgTemplates.length})</span></h2>
                  {!orgCollapsed && <p className="text-xs text-muted-foreground">Organization-specific customized templates</p>}
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${orgCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!orgCollapsed && (
                <div className="p-4">
                  {isLoading ? (
                    <div className="flex justify-center py-6"><LekvyaLoader /></div>
                  ) : filteredOrgTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-lg text-muted-foreground">
                      <Mail className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-sm">No custom templates yet</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={handleCreate}><Plus className="w-3.5 h-3.5 mr-1.5" />Create your first template</Button>
                    </div>
                  ) : filteredOrgTemplates.length > 10 ? (
                    /* Compact view for >10 templates */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {filteredOrgTemplates.map((template) => (
                        <div key={template.id} className="flex flex-col border border-border rounded-lg p-2.5 bg-card hover:shadow-sm transition-all duration-150">
                          <div className="flex items-start justify-between gap-1.5 mb-1">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-xs text-foreground truncate leading-tight">{template.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{template.subject}</p>
                            </div>
                            <span className={`shrink-0 text-[9px] px-1 py-0 rounded-full font-medium leading-4 ${getCategoryBadgeClass(template.category)}`}>{getCategoryLabel(template.category)}</span>
                          </div>
                          <div className="flex items-center gap-0.5 mt-1.5 border-t border-border pt-1.5">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1 px-0.5" onClick={() => handleEdit(template)}><Edit className="w-2.5 h-2.5 mr-0.5" />Edit</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1 px-0.5" onClick={() => handlePreview(template)}><Eye className="w-2.5 h-2.5 mr-0.5" />View</Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => handleDelete(template.id)} title="Delete"><Trash2 className="w-2.5 h-2.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Normal view for ≤10 templates */
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
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ─── Customize Dialog ──────────────────────────────────────────────── */}
      <Dialog open={customizeDialogOpen} onOpenChange={(open) => { setCustomizeDialogOpen(open); if (!open) setCustomizeBodyTab('edit') }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="customize-subject">Subject *</Label>
                  {renderSubjectVarDropdown(true)}
                </div>
                <Input
                  ref={customizeSubjectRef}
                  id="customize-subject"
                  value={customizeData.subject}
                  onChange={(e) => setCustomizeData({ ...customizeData, subject: e.target.value })}
                  placeholder="Enter email subject"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex rounded-md border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCustomizeBodyTab('edit')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${customizeBodyTab === 'edit' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                    >Edit</button>
                    <button
                      type="button"
                      onClick={() => setCustomizeBodyTab('preview')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border flex items-center gap-1.5 ${customizeBodyTab === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                    ><Eye className="h-3 w-3" />Preview</button>
                  </div>
                  {customizeBodyTab === 'edit' && renderVarDropdown(true)}
                </div>
                {customizeBodyTab === 'edit' ? (
                  <RichTextarea
                    ref={customizeEditorRef}
                    value={customizeData.body}
                    onChange={(v) => setCustomizeData((prev) => ({ ...prev, body: v }))}
                    placeholder="Write your email body here. Use variables like {{client_name}} or click 'Insert Variable'."
                    minHeight={336}
                  />
                ) : (
                  <div className="rounded-md border border-border overflow-hidden" style={{ height: 300 }}>
                    <iframe
                      srcDoc={previewEmailTemplate(customizeData.body, customizeData.subject || 'Preview')}
                      title="Email preview"
                      className="w-full h-full border-0"
                    />
                  </div>
                )}
                {customizeBodyTab === 'edit' && (
                  <p className="text-xs text-muted-foreground">Plain text with line breaks. Use the variable picker to insert dynamic values.</p>
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
          setBodyTab('edit')
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[900px] max-h-[95vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>{editingTemplate ? "Update the email template" : "Create a new email template for your organization"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingTemplate ? (
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
                <Input id="template-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter template name" className="h-9" />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="template-subject">Subject *</Label>
                {renderSubjectVarDropdown(false)}
              </div>
              <Input ref={subjectRef} id="template-subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Enter email subject" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBodyTab('edit')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${bodyTab === 'edit' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                  >Edit</button>
                  <button
                    type="button"
                    onClick={() => setBodyTab('preview')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border flex items-center gap-1.5 ${bodyTab === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                  ><Eye className="h-3 w-3" />Preview</button>
                </div>
                {bodyTab === 'edit' && renderVarDropdown(false)}
              </div>
              {bodyTab === 'edit' ? (
                <RichTextarea
                  ref={editorRef}
                  value={formData.body}
                  onChange={(v) => setFormData((prev) => ({ ...prev, body: v }))}
                  placeholder="Write your email body here. Use variables like {{client_name}} or click 'Insert Variable'."
                  rows={14}
                />
              ) : (
                <div className="rounded-md border border-border overflow-hidden" style={{ height: 300 }}>
                  <iframe
                    srcDoc={previewEmailTemplate(formData.body, formData.subject || 'Preview')}
                    title="Email preview"
                    className="w-full h-full border-0"
                  />
                </div>
              )}
              {bodyTab === 'edit' && (
                <p className="text-xs text-muted-foreground">Plain text with line breaks. Use the variable picker to insert dynamic values.</p>
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
                <div className="border rounded-md bg-card overflow-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
                  <iframe
                    srcDoc={previewEmailTemplate(previewTemplate.body, previewTemplate.subject)}
                    title="Email preview"
                    className="w-full border-0"
                    style={{ minHeight: 300, height: 'calc(90vh - 260px)' }}
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
    </div>
  )
}
