"use client"

import { LekvyaLoader } from "@/components/ui/lekvya-loader"
import { EmptyState } from "@/components/ui/empty-state"
import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getUserData, isAuthenticated, ApiError } from "@/lib/api/index"
import {
  getOrgEmailTemplates,
  customizeMasterTemplate,
  createOrgEmailTemplate,
  updateOrgEmailTemplate,
  deleteOrgEmailTemplate,
  EmailTemplateCategory,
  type EmailTemplate,
} from "@/lib/api/index"
import { getTypesByCategory } from "@/lib/api/email-templates"
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units"
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
import { ArrowLeft, Bell, Clock, Copy, Edit, FileText, Lock, Mail, Plus, RefreshCw, Search, Send, Trash2 } from "lucide-react"
import { RichTextarea, type RichTextareaRef } from "@/components/ui/rich-textarea"
import { previewEmailTemplate, renderEmailPreview } from "@/lib/utils/email-template"
import { useTemplateVariables, exampleValues, customValuesFor, usedVariables } from "@/lib/template-variables"
import { CustomVariablesDialog, SaveVariableDialog } from "@/components/email-management/custom-variables-dialog"
import { VarLineInput, VarPickerButton, UnknownVarsNotice, type VarLineInputHandle } from "@/components/email-management/var-tags"
import { getIndustryMailConfig } from "@/lib/industry-config"
import { getOrganizationData } from "@/lib/api/index"
import { getClients } from "@/lib/api/clients"
import { pickerLabel, activeBrands } from "@/lib/unit-structure";
import { clientVariables, orgVariables, transformClient, type ClientItem } from "@/components/email-management/send-mails-utils"

const CATEGORIES: { value: string; label: string; icon: typeof Clock }[] = [
  { value: EmailTemplateCategory.REMINDER,     label: "Reminders",     icon: Clock },
  { value: EmailTemplateCategory.FOLLOW_UP,    label: "Follow-ups",    icon: RefreshCw },
  { value: EmailTemplateCategory.NOTIFICATION, label: "Notifications", icon: Bell },
  { value: EmailTemplateCategory.SERVICE,      label: "Service",       icon: FileText },
  { value: EmailTemplateCategory.LOGIN,        label: "Login details", icon: Mail },
]
const categoryOf = (c: string) => CATEGORIES.find((x) => x.value === c)
const categoryLabel = (c: string) => categoryOf(c)?.label ?? c

const isBuiltIn = (t: EmailTemplate) => t.organizationId == null

type Owner = "all" | "yours" | "builtin"
/** create: new · edit: one of yours · customize: your version of a built-in · copy: a new one from any template */
type EditorMode = "create" | "edit" | "customize" | "copy"
interface Editor { mode: EditorMode; source: EmailTemplate | null; name: string; category: string; type: string; subject: string; body: string; businessUnitId: number | null }

export default function EmailTemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [owner, setOwner] = useState<Owner>("all")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [saving, setSaving] = useState(false)
  const [types, setTypes] = useState<{ value: string; label: string }[]>([])
  const [units, setUnits] = useState<BusinessUnit[]>([])
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  // Units for the "Used by" picker. Failure just hides the picker.
  useEffect(() => {
    listBusinessUnits().then((all) => setUnits(activeBrands(all))).catch(() => setUnits([]))
  }, [])

  // ─── Variables (shared with Send Mails) ─────────────────────────────────
  const industryConfig = useMemo(() => {
    const user = getUserData() as any
    return getIndustryMailConfig(getOrganizationData()?.industry || user?.organization?.industry || "financial_services")
  }, [])
  const { vars, custom, reloadCustom } = useTemplateVariables(industryConfig)
  const [customOpen, setCustomOpen] = useState(false)
  const [saveKey, setSaveKey] = useState<string | null>(null)
  const tagOptions = {
    onCreateVariable: (key: string) => setSaveKey(key),
    onTagClick: (key: string, known: boolean) => { if (!known) setSaveKey(key) },
  }
  const editorRef = useRef<RichTextareaRef | null>(null)
  const subjectRef = useRef<VarLineInputHandle | null>(null)

  // ─── Preview with sample values, or as a real client ────────────────────
  const [previewClients, setPreviewClients] = useState<ClientItem[]>([])
  const [previewAsId, setPreviewAsId] = useState<string>("sample")
  useEffect(() => {
    getClients()
      .then((res: any) => setPreviewClients((Array.isArray(res?.clients) ? res.clients : Array.isArray(res) ? res : []).map(transformClient)))
      .catch(() => {}) // preview falls back to sample values
  }, [])
  const previewValues = useMemo(() => {
    const sample = exampleValues(vars)
    const c = previewClients.find((x) => String(x.id) === previewAsId)
    if (!c) return sample
    const user = getUserData() as any
    return { ...sample, ...orgVariables(user), ...clientVariables(c, industryConfig, user, customValuesFor(custom, c.id)) }
  }, [vars, custom, previewClients, previewAsId, industryConfig])
  const previewAs = (
    <label className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
      Preview as
      <select value={previewAsId} onChange={(e) => setPreviewAsId(e.target.value)}
        className="h-8 max-w-[200px] rounded-md border border-input bg-background px-2 text-sm text-foreground">
        <option value="sample">Sample values</option>
        {previewClients.map((c) => <option key={c.id} value={String(c.id)}>{c.name || c.email}</option>)}
      </select>
    </label>
  )

  // ─── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return }
    if (getUserData()?.role === "client") { router.replace("/uploads"); return }
    setIsCheckingAuth(false)
    fetchTemplates()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await getOrgEmailTemplates({ limit: 1000 })
      const all: EmailTemplate[] = Array.isArray(response) ? response : (response as { templates?: EmailTemplate[] })?.templates ?? []
      setTemplates(all)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) router.replace("/login")
      else toast({ title: "Error", description: "Failed to load email templates.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  /** Your version of a built-in template (same category and type) */
  const yourVersionOf = (t: EmailTemplate) =>
    isBuiltIn(t) ? templates.find((o) => !isBuiltIn(o) && o.type === t.type && o.category === t.category) : undefined

  // ─── Filter ──────────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase()
  const matchesText = (t: EmailTemplate) =>
    !q || [t.name, t.subject, categoryLabel(t.category), t.body.replace(/<[^>]+>/g, " ")].some((s) => (s ?? "").toLowerCase().includes(q))
  const matchesOwner = (t: EmailTemplate) => owner === "all" || (owner === "yours") !== isBuiltIn(t)
  const base = templates.filter((t) => matchesText(t) && matchesOwner(t))
  const shown = base.filter((t) => category === "all" || t.category === category)
  // yours first, then by name
  const groups = CATEGORIES.map((c) => ({
    ...c,
    items: shown.filter((t) => t.category === c.value).sort((a, b) => Number(isBuiltIn(a)) - Number(isBuiltIn(b)) || a.name.localeCompare(b.name)),
  })).filter((g) => g.items.length)
  const other = shown.filter((t) => !categoryOf(t.category))
  if (other.length) groups.push({ value: "other", label: "Other", icon: FileText, items: other })
  // wide screens show the preview beside the list, so nothing picked = the top one
  const selected = templates.find((t) => t.id === selectedId) ?? (wide ? groups[0]?.items[0] ?? null : null)

  // ─── Editor ──────────────────────────────────────────────────────────────
  const open = (mode: EditorMode, t: EmailTemplate | null) => {
    const own = mode === "customize" && t ? yourVersionOf(t) : undefined
    const from = own ?? t
    setEditor({
      mode: own ? "edit" : mode,
      source: own ?? t,
      name: mode === "copy" && from ? `${from.name} (copy)` : from?.name ?? "",
      category: from?.category ?? EmailTemplateCategory.REMINDER,
      type: from?.type ?? "",
      subject: from?.subject ?? "",
      body: from?.body ?? "",
      businessUnitId: from?.businessUnitId ?? null,
    })
  }
  const patch = (p: Partial<Editor>) => setEditor((e) => (e ? { ...e, ...p } : e))

  // The type list follows the category (create only; others keep the source's type)
  useEffect(() => {
    if (editor?.mode !== "create") return
    let active = true
    getTypesByCategory(editor.category as EmailTemplateCategory)
      .then((res: any) => {
        if (!active) return
        const list = Array.isArray(res) ? res : []
        setTypes(list)
        if (list.length) setEditor((e) => (e && !list.some((x: { value: string }) => x.value === e.type) ? { ...e, type: list[0].value } : e))
      })
      .catch(() => {})
    return () => { active = false }
  }, [editor?.mode, editor?.category])

  const editorProblem = !editor ? null
    : !editor.name.trim() && editor.mode !== "customize" ? "Give it a name."
    : !editor.subject.trim() ? "Add a subject."
    : !editor.body.replace(/<[^>]+>/g, "").trim() ? "Write the message."
    : editor.mode === "create" && !editor.type ? "Pick a type."
    : null

  const save = async () => {
    if (!editor || editorProblem) return
    setSaving(true)
    try {
      const { mode, source, name, category, type, subject, body, businessUnitId } = editor
      let saved: EmailTemplate | undefined
      if (mode === "edit" && source) saved = await updateOrgEmailTemplate(source.id, { name, subject, body }) as EmailTemplate
      else if (mode === "customize" && source) saved = await customizeMasterTemplate(source, undefined, { subject, body }) as EmailTemplate
      else saved = await createOrgEmailTemplate({ name, category, type, subject, body, is_default: false, businessUnitId }) as EmailTemplate
      toast({ title: mode === "edit" ? "Template saved" : "Template created", variant: "success" })
      setEditor(null)
      await fetchTemplates()
      if (saved?.id != null) setSelectedId(Number(saved.id))
    } catch (error) {
      toast({ title: "Couldn't save the template", description: error instanceof ApiError ? (error.detail as string) || undefined : undefined, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (t: EmailTemplate) => {
    const builtIn = templates.find((m) => isBuiltIn(m) && m.type === t.type && m.category === t.category)
    const note = builtIn ? `\n\nEmails will use the built-in “${builtIn.name}” again.` : ""
    if (!confirm(`Delete “${t.name}”? This can't be undone.${note}`)) return
    try {
      await deleteOrgEmailTemplate(t.id)
      toast({ title: "Template deleted", variant: "success" })
      setSelectedId(null)
      fetchTemplates()
    } catch (error) {
      toast({ title: "Couldn't delete the template", description: error instanceof ApiError ? (error.detail as string) || undefined : undefined, variant: "destructive" })
    }
  }

  const openInEmail = (t: EmailTemplate) => router.push(`/all-clients-mail-setup?template=${t.id}`)

  if (isCheckingAuth) return <LekvyaLoader className="min-h-screen" />

  const counts = (c: string) => base.filter((t) => c === "all" || t.category === c).length
  const yourCount = templates.filter((t) => !isBuiltIn(t)).length

  return (
    <>
      <div className="flex flex-col gap-4 p-4 sm:p-5 md:h-full">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Email Templates</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Ready-made messages to start an email from. Variables fill in for each client.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setCustomOpen(true)}>
              <span className="mr-1 font-mono text-primary">{"{{}}"}</span>
              Custom variables{custom.length ? ` (${custom.length})` : ""}
            </Button>
            <Button onClick={() => open("create", null)}><Plus className="h-4 w-4" />New template</Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-10 pl-9" placeholder="Search name, subject or text" aria-label="Search templates" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div role="radiogroup" aria-label="Whose templates" className="inline-flex w-fit rounded-lg bg-muted p-1">
            {([["all", "All"], ["yours", `Yours (${yourCount})`], ["builtin", "Built-in"]] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={owner === v} onClick={() => setOwner(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${owner === v ? "bg-background text-foreground shadow-sm dark:bg-primary/20 dark:text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[{ value: "all", label: "All" }, ...CATEGORIES].map((c) => (
            <button key={c.value} type="button" onClick={() => setCategory(c.value)} aria-pressed={category === c.value}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${category === c.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              {c.label} <span className="opacity-70">{counts(c.value)}</span>
            </button>
          ))}
        </div>

        {/* List + preview */}
        {isLoading ? (
          <div className="flex justify-center py-10"><LekvyaLoader /></div>
        ) : !templates.length ? (
          <EmptyState icon={Mail} title="No templates yet" actionLabel="Create your first template" onAction={() => open("create", null)} />
        ) : (
          <div className="grid gap-4 md:min-h-0 md:flex-1 md:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className={`${selected ? "hidden lg:block" : ""} space-y-4 md:min-h-0 md:overflow-y-auto lg:pr-1`}>
              {!groups.length && <EmptyState icon={Search} title="No templates match" description="Try another word or filter." />}
              {groups.map((g) => (
                <section key={g.value} aria-label={g.label}>
                  <h2 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <g.icon className="h-4 w-4" />{g.label}<span className="font-normal">{g.items.length}</span>
                  </h2>
                  <ul className="overflow-hidden rounded-lg border border-border bg-card">
                    {g.items.map((t) => {
                      const on = t.id === selected?.id
                      const replaced = !!yourVersionOf(t)
                      return (
                        <li key={t.id} className="border-b border-border last:border-0">
                          <button type="button" onClick={() => setSelectedId(t.id)} aria-current={on || undefined}
                            className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${on ? "bg-primary/10" : "hover:bg-muted/60"}`}>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-sm font-medium ${replaced ? "text-muted-foreground" : "text-foreground"}`}>{t.name}</p>
                              <p className="truncate text-sm text-muted-foreground">{t.subject}</p>
                            </div>
                            {isBuiltIn(t)
                              ? <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{replaced ? "Replaced by yours" : "Built-in"}</span>
                              : <span className="mt-0.5 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Yours</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>

            <div className={`${selected ? "" : "hidden lg:flex"} flex min-h-[480px] flex-col overflow-hidden rounded-xl border border-border bg-card md:min-h-0 md:overflow-y-auto`}>
              {!selected ? (
                <div className="m-auto p-6 text-center text-sm text-muted-foreground">Pick a template to see it here.</div>
              ) : (
                <TemplatePreview
                  t={selected}
                  yours={yourVersionOf(selected)}
                  vars={vars}
                  values={previewValues}
                  previewAs={previewAs}
                  onBack={() => setSelectedId(null)}
                  onUse={() => openInEmail(selected)}
                  onEdit={() => open(isBuiltIn(selected) ? "customize" : "edit", selected)}
                  onCopy={() => open("copy", selected)}
                  onDelete={() => remove(selected)}
                  onShowYours={(id) => { if (owner === "builtin") setOwner("all"); setSelectedId(id) }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <CustomVariablesDialog open={customOpen} onOpenChange={setCustomOpen} custom={custom} onChanged={reloadCustom} />
      <SaveVariableDialog keyName={saveKey} onClose={() => setSaveKey(null)} onSaved={reloadCustom} />

      {/* ─── Editor: write on the left, see it on the right ───────────────── */}
      <Dialog open={!!editor} onOpenChange={(o) => { if (!o) setEditor(null) }}>
        <DialogContent className="max-h-[95vh] max-w-[95vw] overflow-y-auto sm:max-w-[1200px]" onInteractOutside={(e) => e.preventDefault()}>
          {editor && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {editor.mode === "create" ? "New template" : editor.mode === "copy" ? "Copy template" : editor.mode === "customize" ? `Make your own “${editor.source?.name}”` : `Edit “${editor.source?.name}”`}
                </DialogTitle>
                <DialogDescription>
                  {editor.mode === "customize"
                    ? "Your version replaces the built-in one for your organization. The built-in stays as it is."
                    : "Type @ or use Insert variable to add client details that fill in for each person."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-2 lg:grid-cols-2">
                <div className="space-y-4">
                  {editor.mode !== "customize" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="template-name">Name</Label>
                      <Input id="template-name" className="h-10" value={editor.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. GST return reminder" />
                    </div>
                  )}
                  {editor.mode === "create" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="template-category">Category</Label>
                        <select id="template-category" value={editor.category} onChange={(e) => patch({ category: e.target.value, type: "" })}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="template-type">Used for</Label>
                        <select id="template-type" value={editor.type} onChange={(e) => patch({ type: e.target.value })}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  {editor.mode === "create" && units.length > 1 && (
                    <div className="space-y-1.5">
                      <Label htmlFor="template-unit">Used by</Label>
                      <select id="template-unit" value={editor.businessUnitId == null ? "all" : String(editor.businessUnitId)}
                        onChange={(e) => patch({ businessUnitId: e.target.value === "all" ? null : Number(e.target.value) })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="all">Whole organization</option>
                        {units.map((u) => <option key={u.id} value={u.id}>{pickerLabel(u, units)} only</option>)}
                      </select>
                      <p className="text-xs text-muted-foreground">A unit template is sent from that unit&apos;s sending account.</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="template-subject">Subject</Label>
                      <VarPickerButton vars={vars} onPick={(t) => subjectRef.current?.insert(t)} />
                    </div>
                    <VarLineInput ref={subjectRef} {...tagOptions} id="template-subject" ariaLabel="Subject" vars={vars} value={editor.subject} onChange={(v) => patch({ subject: v })} placeholder="Subject (type @ to add a variable)" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Message</Label>
                      <VarPickerButton vars={vars} label="Insert variable" onPick={(t) => editorRef.current?.insert(t)} />
                    </div>
                    <RichTextarea ref={editorRef} value={editor.body} onChange={(v) => patch({ body: v })}
                      placeholder="Write the email. Type @ to add a variable." minHeight={320} variables={vars} {...tagOptions} />
                    <UnknownVarsNotice text={`${editor.subject} ${editor.body}`} vars={vars} onSave={setSaveKey} />
                  </div>
                </div>

                <div className="flex min-h-[440px] flex-col gap-2 rounded-lg bg-muted/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">Preview</span>
                    {previewAs}
                  </div>
                  <EmailCard subject={renderEmailPreview(editor.subject, "", previewValues).subject} html={previewEmailTemplate(editor.body, editor.subject || "Preview", previewValues)} title="Email preview" />
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
                {editorProblem && <p className="mr-auto text-sm text-muted-foreground">{editorProblem}</p>}
                <Button variant="outline" onClick={() => setEditor(null)}>Cancel</Button>
                <Button onClick={save} disabled={!!editorProblem || saving}>
                  {saving ? "Saving…" : editor.mode === "edit" ? "Save changes" : editor.mode === "customize" ? "Save my version" : "Create template"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** How the email looks in an inbox: always white paper, in either theme, so the colours are fixed on purpose */
function EmailCard({ subject, html, title }: { subject: string; html: string; title: string }) {
  return (
    <div className="flex min-h-[240px] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <p className="truncate border-b border-gray-200 px-4 py-2.5 text-sm text-gray-900" title={subject}>
        <span className="text-gray-500">Subject: </span>{subject || <span className="text-gray-400">No subject yet</span>}
      </p>
      <iframe srcDoc={html} sandbox="" title={title} className="w-full flex-1 border-0 bg-white px-4 py-3" />
    </div>
  )
}

function TemplatePreview({ t, yours, vars, values, previewAs, onBack, onUse, onEdit, onCopy, onDelete, onShowYours }: {
  t: EmailTemplate
  yours: EmailTemplate | undefined
  vars: { key: string; label?: string }[]
  values: Record<string, string>
  previewAs: React.ReactNode
  onBack: () => void
  onUse: () => void
  onEdit: () => void
  onCopy: () => void
  onDelete: () => void
  onShowYours: (id: number) => void
}) {
  const builtIn = isBuiltIn(t)
  const used = usedVariables(`${t.subject} ${t.body}`)
  const labelOf = (k: string) => vars.find((v) => v.key === k)?.label ?? k
  return (
    <>
      <div className="space-y-3 border-b border-border p-4">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden">
          <ArrowLeft className="h-4 w-4" />All templates
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold">{t.name}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              {builtIn && <Lock className="h-3.5 w-3.5" />}
              {categoryLabel(t.category)} · {builtIn ? "Built-in" : "Yours"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onUse}><Send className="h-4 w-4" />Use in email</Button>
            {!(builtIn && yours) && <Button variant="outline" onClick={onEdit}><Edit className="h-4 w-4" />{builtIn ? "Customize" : "Edit"}</Button>}
            <Button variant="outline" onClick={onCopy} aria-label="Copy as a new template" title="Copy as a new template"><Copy className="h-4 w-4" /><span className="sm:hidden xl:inline">Copy</span></Button>
            {!builtIn && <Button variant="outline" onClick={onDelete} aria-label="Delete" title="Delete" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </div>
        {builtIn && yours && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            Your organization uses its own version of this.{" "}
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => onShowYours(yours.id)}>Open your version</button>
          </p>
        )}
        {used.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Fills in:{" "}
            {used.map((k) => <span key={k} className="mr-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">{labelOf(k)}</span>)}
          </p>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 bg-muted/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">Preview</span>
          {previewAs}
        </div>
        <EmailCard subject={renderEmailPreview(t.subject, "", values).subject} html={previewEmailTemplate(t.body, t.subject, values)} title={`${t.name} preview`} />
      </div>
    </>
  )
}
