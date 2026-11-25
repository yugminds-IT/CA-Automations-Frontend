'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { AlertTriangle, CheckCircle2, CircleAlert, Eye, Loader2, PenLine, Users } from 'lucide-react'
import {
  SearchMd, Mail01,
  Send01, ChevronDown, XClose,
  Calendar, Plus,
} from '@untitled-ui/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/use-toast'
import { getClients } from '@/lib/api/clients'
import { listTemplates } from '@/lib/api/email-templates'
import { createDraft, deleteDraft, listDrafts, updateDraft, type ServerDraft } from '@/lib/api/mail-management'
import { checkSuppressions, deleteSegment, listSegments, saveSegment, scheduleEmail, sendBulkEmail, updateSegment } from '@/lib/api/mail-management'
import { EMAIL_RE, matchesRules, parseAddresses, plainRules, sameRules, toRules, type Rule } from '@/lib/audience'
import { AudienceRules, describeRules, type RuleFieldInfo } from './audience-rules'
import { listServices } from '@/lib/api/services'
import { listBusinessTypes } from '@/lib/api/business-types'
import { getUserData, getOrganizationData } from '@/lib/api/index'
import { getIndustryClientConfig, getIndustryMailConfig } from '@/lib/industry-config'
import type { EmailTemplate, SavedSegment, ScheduleConfig, SegmentSend, Service } from '@/lib/api/types'

import {
  type ClientItem,
  transformClient,
  clientVariables,
  orgVariables,
} from './send-mails-utils'
import { LivePreview, SendConfirmDialog } from './send-mails-parts'
import { ScheduleSheet, type DateRule } from './schedule-sheet'

/** "follow-up in 3 days", for the group's label */
const dateRuleText = (r: DateRule) => r.op === 'yearly'
  ? `onboarding anniversary${r.days ? ` in ${r.days} days` : ''}`
  : `${r.field === 'followUp' ? 'follow-up' : 'onboarding'} ${r.op === 'on' ? (r.days ? `in ${r.days} days` : 'today') : `${r.days} days ago`}`
import { SaveVariableDialog } from './custom-variables-dialog'
import { AttachmentsPanel, NO_ATTACHMENTS, attachmentIssues, filesFor, type AttachmentsState } from './attachments-panel'
import { clearDraft, isEmptyDraft, loadDraft, type SendDraft } from './send-mails-draft'
import { MessageComposer, TemplatePicker, BLANK_BODY, isEdited, toPayload, type ComposedMessage } from './message-composer'
import { customValuesFor, humanize, suggestVariable, systemVariables, usedVariables, useTemplateVariables } from '@/lib/template-variables'
import { renderEmailPreview, withSignature } from '@/lib/utils/email-template'
import { getMailIdentity } from '@/lib/api/organizations'
import { checkEmail } from '@/lib/email-checks'

/** Recipients drawn at a time in the panel list */
const LIST_PAGE = 200

export function SendMails() {
  const { toast } = useToast()

  // Industry
  const [industry, setIndustry] = useState<string>('financial_services')

  /** The firm's sign-off, shown in the preview as clients will see it */
  const [signature, setSignature] = useState('')
  useEffect(() => {
    const user = getUserData()
    const org = getOrganizationData()
    setIndustry(org?.industry || user?.organization?.industry || 'financial_services')
    const orgId = org?.id ?? user?.organizationId
    if (orgId) getMailIdentity(orgId).then((v) => setSignature(v.signature)).catch(() => {})
  }, [])

  const industryConfig = useMemo(() => getIndustryMailConfig(industry), [industry])
  const clientLabels = useMemo(() => getIndustryClientConfig(industry), [industry])

  // One variable list (server catalog + industry fields) for pickers, tags and the "@" menu
  const { vars, custom, reloadCustom } = useTemplateVariables(industryConfig)
  // drafting helpers: "@xyz" -> Create opens the save dialog; clicking a tag jumps to its value box
  const [saveKey, setSaveKey] = useState<string | null>(null)
  const focusValue = (key: string) => {
    const el = document.getElementById(`sv-${key}`) as HTMLInputElement | null
    if (!el) return false
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
    return true
  }
  const tagOptions = {
    onCreateVariable: (key: string) => setSaveKey(key),
    onTagClick: (key: string, known: boolean) => { if (!focusValue(key) && !known) setSaveKey(key) },
  }
  const varLabel = (key: string) => vars.find((v) => v.key === key)?.label ?? humanize(key)

  // Data
  const [clients, setClients] = useState<ClientItem[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const templatesReady = useRef<Promise<EmailTemplate[]>>(Promise.resolve([]))
  const [services, setServices] = useState<Service[]>([])
  const [businessTypes, setBusinessTypes] = useState<{ id: number; name: string }[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())

  // Filters
  const [search, setSearch] = useState('')
  const [rules, setRules] = useState<Rule[]>([])
  // Saved groups ("VIP in Pune"); null = not naming one right now
  const [savedGroups, setSavedGroups] = useState<SavedSegment[]>([])
  const [newGroupName, setNewGroupName] = useState<string | null>(null)
  /** The saved group last picked: its conditions can be updated, or it can be renamed */
  const [pickedGroupId, setPickedGroupId] = useState<number | null>(null)
  const [renaming, setRenaming] = useState(false)
  // Rows drawn in the recipients list; thousands of rows at once make the panel slow
  const [shownFor, setShownFor] = useState({ key: '', n: LIST_PAGE })
  const hasOrg = () => getUserData()?.organizationId != null
  useEffect(() => {
    if (hasOrg()) listSegments().then((l) => setSavedGroups(Array.isArray(l) ? l : [])).catch(() => { /* saved groups are optional */ })
  }, [])
  const activeGroup = savedGroups.find((g) => sameRules(toRules(g.rules), rules)) ?? null
  const pickedGroup = savedGroups.find((g) => g.id === pickedGroupId) ?? null
  const putGroup = (g: SavedSegment) => setSavedGroups((l) => [...l.filter((x) => x.id !== g.id), g].sort((a, b) => a.name.localeCompare(b.name)))
  /** Save the name in the box: renames the active group, or saves the current conditions as a new one */
  const storeGroup = async () => {
    const name = newGroupName?.trim()
    if (!name) return
    try {
      const g = renaming && activeGroup ? await updateSegment(activeGroup.id, { name }) : await saveSegment(name, plainRules(rules))
      putGroup(g)
      setPickedGroupId(g.id)
      setNewGroupName(null)
      setRenaming(false)
      toast({ title: `Saved "${g.name}"`, description: renaming ? undefined : 'Pick it next time to use the same conditions. Who matches is worked out again each time.', variant: 'success' })
    } catch (err) {
      toast({ title: 'Could not save the group', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }
  /** Give the picked group the conditions shown now */
  const updatePickedGroup = async () => {
    if (!pickedGroup) return
    try {
      putGroup(await updateSegment(pickedGroup.id, { rules: plainRules(rules) }))
      toast({ title: `Updated "${pickedGroup.name}"`, variant: 'success' })
    } catch (err) {
      toast({ title: 'Could not update the group', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }
  const removeGroup = async (g: SavedSegment) => {
    if (!window.confirm(`Delete the saved group "${g.name}"? Contacts are not affected.`)) return
    try {
      await deleteSegment(g.id)
      setSavedGroups((l) => l.filter((x) => x.id !== g.id))
      if (pickedGroupId === g.id) setPickedGroupId(null)
    } catch (err) {
      toast({ title: 'Could not delete the group', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  // Compose
  // One message: optionally loaded from a template, always editable
  const [message, setMessage] = useState<ComposedMessage>({ template: null, subject: '', body: BLANK_BODY })
  const { template: selectedTemplate, subject, body } = message
  // the default greeting alone isn't a message yet
  const hasBody = body !== BLANK_BODY && !!body.replace(/<[^>]*>|&nbsp;/g, '').trim()
  const [previewClientIndex, setPreviewClientIndex] = useState(0)
  const [recipientsOpen, setRecipientsOpen] = useState(false)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const [isTesting, setIsTesting] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [testTo, setTestTo] = useState('')
  // Values typed in "Values for this send": required for asked/custom variables, fallbacks for empty client fields
  const [sendValues, setSendValues] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<AttachmentsState>(NO_ATTACHMENTS)
  /** Each recipient with their own files added; shared files go once, in `attachments` */
  const withFiles = <T extends { email: string }>(list: T[]) => list.map((r) => ({ ...r, attachments: filesFor(attachments, r.email) }))
  const [isSending, setIsSending] = useState(false)
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false)

  // Direct recipients, CC, BCC
  const [customRecipients, setCustomRecipients] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [bccInput, setBccInput] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)

  // Schedule drawer
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false)

  const [isScheduling, setIsScheduling] = useState(false)
  const [audience, setAudience] = useState<'all' | 'filtered' | 'pick' | null>(null)
  /** Left out of "All" or "A group" (unticked in the recipients panel) */
  const [excluded, setExcluded] = useState<Set<string | number>>(new Set())
  const chooseAudience = (a: 'all' | 'filtered' | 'pick') => { setAudience(a); setExcluded(new Set()) }

  /** Why it can't be scheduled yet, shown in the sheet */
  const scheduleProblem = () => (blockers[0] ? `${blockers[0].label} first.` : null)

  const handleSchedule = async (schedule: ScheduleConfig, dateRule?: DateRule) => {
    if (scheduleProblem()) return
    setIsScheduling(true)
    try {
      // one request for everyone; each recipient carries their own values (a group is worked out when each one goes out)
      const group = segmentSend()
      // "On a client date": the group narrowed, every day, to clients whose date has come; never extra addresses
      const segment = group && dateRule
        ? { ...group, rules: [...group.rules, dateRule], label: `${group.label ?? 'All clients'} · ${dateRuleText(dateRule)}` }
        : group
      if (dateRule && !segment) throw new Error('This sends to All clients or A group.')
      const recipients = dateRule ? [] : withFiles(segment ? outsideGroup() : finalRecipients())
      await scheduleEmail({
        ...messagePayload(),
        schedule,
        attachments: attachments.shared,
        ...(recipients.length ? { recipients } : {}),
        ...(segment ? { segment } : {}),
        cc: ccInput.trim() || undefined,
        bcc: bccInput.trim() || undefined,
      })
      const totalCount = baseRecipients.length
      toast({
        title: dateRule ? 'Automation turned on' : schedule.type === 'repeat' ? 'Repeating email set up' : 'Scheduled',
        description: `For ${totalCount} recipient${totalCount > 1 ? 's' : ''}. See it in Scheduled Mails.`,
        variant: 'success',
      })
      await finishDraft()
      window.location.reload()
    } catch (err) {
      console.error('Failed to schedule email:', err)
      toast({ title: 'Could not schedule', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setIsScheduling(false)
    }
  }

  // Load data
  useEffect(() => {
    setIsLoadingClients(true)
    getClients()
      .then((res: any) => {
        const list = Array.isArray(res?.clients) ? res.clients : Array.isArray(res) ? res : []
        setClients(list.map(transformClient))
      })
      .catch((err) => {
        console.error('Failed to load clients:', err)
        toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' })
      })
      .finally(() => setIsLoadingClients(false))
  }, [])

  useEffect(() => {
    setIsLoadingTemplates(true)
    const user = getUserData()
    templatesReady.current = listTemplates({ organizationId: user?.organizationId != null ? Number(user.organizationId) : undefined })
      .then((list) => { const l = Array.isArray(list) ? list : []; setTemplates(l); return l })
      .catch((err) => { console.error('Failed to load templates:', err); return [] as EmailTemplate[] })
      .finally(() => setIsLoadingTemplates(false))
  }, [])

  useEffect(() => {
    const user = getUserData()
    const orgId = user?.organizationId != null ? Number(user.organizationId) : undefined
    listServices(orgId)
      .then((list) => setServices(Array.isArray(list) ? list : []))
      .catch((err) => { console.error('Failed to load services:', err) })
    listBusinessTypes(orgId)
      .then((list) => setBusinessTypes(Array.isArray(list) ? list : []))
      .catch((err) => { console.error('Failed to load business types:', err) })
  }, [])

  // All unique categories derived from business types and clients
  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    businessTypes.forEach((bt) => { if (bt.name) cats.add(bt.name) })
    clients.forEach((c) => { if (c.businessType) cats.add(c.businessType) })
    return Array.from(cats).sort()
  }, [businessTypes, clients])

  // Services list for the filter dropdown (fetched from /services)
  const serviceOptions = useMemo(
    () => services.filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name)),
    [services]
  )

  const distinct = (pick: (c: ClientItem) => string | undefined) =>
    [...new Set(clients.map(pick).map((v) => v?.trim()).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))
  const ruleFields: RuleFieldInfo[] = useMemo(() => [
    { field: 'businessType', label: industryConfig.categoryFilterLabel, options: allCategories },
    { field: 'service', label: industryConfig.serviceFilterLabel, options: serviceOptions.map((s) => s.name) },
    { field: 'status', label: 'Status', options: distinct((c) => c.status) },
    { field: 'city', label: 'City', options: distinct((c) => c.city) },
    { field: 'state', label: 'State', options: distinct((c) => c.state) },
    { field: 'tags', label: 'Tags', options: [...new Set(clients.flatMap((c) => c.tags ?? []))].sort((a, b) => a.localeCompare(b)) },
    { field: 'followUp', label: clientLabels.followUpDateLabel },
    { field: 'onboard', label: clientLabels.onboardDateLabel },
    ...custom.map((v) => ({
      field: `custom:${v.key}` as const,
      label: v.label,
      options: [...new Set(Object.values(v.values ?? {}).map((x) => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [allCategories, serviceOptions, clients, industryConfig, clientLabels, custom])

  // Clients matching every condition (the "A group" audience)
  const segmentClients = useMemo(() => {
    // each contact's own custom values (a field's default doesn't count as filled in)
    const customOf = (id: string | number) => Object.fromEntries(custom.map((v) => [v.key, v.values?.[String(id)] ?? '']))
    return clients.filter((c) => matchesRules({ ...c, custom: customOf(c.id) }, rules))
  }, [clients, rules, custom])

  // Recipients panel list: the chosen group (or the whole directory), narrowed by search
  // back to the first page whenever the list itself changes
  const listKey = `${audience}|${search}|${JSON.stringify(plainRules(rules))}`
  const shown = shownFor.key === listKey ? shownFor.n : LIST_PAGE
  const filteredClients = useMemo(() => {
    let list = audience === 'filtered' ? segmentClients : clients
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.companyName.toLowerCase().includes(q)
      )
    }
    return list
  }, [clients, segmentClients, audience, search])

  // "All" and "A group" drive the selection; "Choose one by one" is manual
  useEffect(() => {
    const keep = (list: ClientItem[]) => new Set(list.filter((c) => !excluded.has(c.id)).map((c) => c.id))
    if (audience === 'all') setSelectedIds(keep(clients))
    else if (audience === 'filtered') setSelectedIds(keep(segmentClients))
  }, [audience, clients, segmentClients, excluded])

  const allSelected = filteredClients.length > 0 && filteredClients.every((c) => selectedIds.has(c.id))

  // "Choose one by one" ticks people in; "All" and "A group" tick people out
  const toggleSelectAll = () => {
    const update = (prev: Set<string | number>, add: boolean) => {
      const next = new Set(prev)
      filteredClients.forEach((c) => (add ? next.add(c.id) : next.delete(c.id)))
      return next
    }
    if (audience === 'pick') setSelectedIds((prev) => update(prev, !allSelected))
    else setExcluded((prev) => update(prev, allSelected))
  }

  const toggleClient = (id: string | number) => {
    const flip = (prev: Set<string | number>) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    }
    if (audience === 'pick') setSelectedIds(flip)
    else setExcluded(flip)
  }

  // Build variables for a client (includes sender info + industry-specific fields)
  const buildVars = (client: ClientItem): Record<string, string> => {
    const user = getUserData() as any
    return { ...orgVariables(user), ...clientVariables(client, industryConfig, user, customValuesFor(custom, client.id)) }
  }

  const selectedClients = useMemo(
    () => clients.filter((c) => selectedIds.has(c.id)),
    [clients, selectedIds]
  )

  // Pasted addresses; one that belongs to a saved contact is sent with that contact's details
  const pasted = useMemo(() => parseAddresses(customRecipients), [customRecipients])
  const directEmailsList = pasted.valid
  const clientByEmail = useMemo(() => {
    const m = new Map<string, ClientItem>()
    for (const c of clients) { const e = c.email?.trim().toLowerCase(); if (e && !m.has(e)) m.set(e, c) }
    return m
  }, [clients])

  // Who gets it: chosen contacts then pasted addresses, each address once, skipping ones that can't be sent to
  const candidates = useMemo(() => {
    const seen = new Set<string>()
    const list: { email: string; client?: ClientItem }[] = []
    let noEmail = 0, invalid = 0, repeats = pasted.duplicates
    for (const c of selectedClients) {
      const e = c.email?.trim().toLowerCase()
      if (!e) noEmail++
      else if (!EMAIL_RE.test(e)) invalid++
      else if (seen.has(e)) repeats++
      else { seen.add(e); list.push({ email: c.email.trim(), client: c }) }
    }
    for (const e of pasted.valid) {
      if (seen.has(e)) repeats++
      else { seen.add(e); list.push({ email: e, client: clientByEmail.get(e) }) }
    }
    return { list, noEmail, invalid: invalid + pasted.invalid.length, repeats }
  }, [selectedClients, pasted, clientByEmail])

  // Unsubscribed and bounced addresses (the server skips them too, so this is for showing it)
  const [suppressed, setSuppressed] = useState<Map<string, string>>(new Map())
  const candidateKey = candidates.list.map((r) => r.email.toLowerCase()).join(',')
  useEffect(() => {
    if (!candidateKey) return // nothing to check; an old result can't match an empty list
    const t = setTimeout(() => {
      checkSuppressions(candidateKey.split(','))
        .then((r) => setSuppressed(new Map(r.suppressed.map((s) => [s.email, s.reason]))))
        .catch(() => { /* not shown, still enforced when sending */ })
    }, 400)
    return () => clearTimeout(t)
  }, [candidateKey])

  const sendable = useMemo(() => candidates.list.filter((r) => !suppressed.has(r.email.toLowerCase())), [candidates, suppressed])
  const totalRecipientCount = sendable.length
  const leftOut = [
    { n: candidates.list.length - sendable.length, text: 'unsubscribed or bounced' },
    { n: candidates.noEmail, text: 'without an email address' },
    { n: candidates.invalid, text: 'with an invalid email address' },
    { n: candidates.repeats, text: 'listed more than once' },
  ].filter((x) => x.n > 0)

  const buildBaseVars = (email: string): Record<string, string> => ({
    ...customValuesFor(custom), // defaults only: not a saved client
    ...orgVariables(getUserData()),
    client_name: email.split('@')[0],
    client_email: email,
  })

  // ── Which variables this message uses, and which values are still missing ──
  const msgSubject = subject
  const msgBody = body
  const messagePayload = () => toPayload(message)
  const usedKeys = useMemo(() => usedVariables(`${msgSubject} ${msgBody}`), [msgSubject, msgBody])
  const sourceOf = (key: string) => vars.find((v) => v.key === key)?.source ?? 'unknown'
  // asked when sending: "send" variables (amount, deadline…) and unknown/custom ones. Wait for the list to load.
  const askKeys = vars.length ? usedKeys.filter((k) => ['send', 'unknown'].includes(sourceOf(k))) : []
  const missingAsk = askKeys.filter((k) => !sendValues[k]?.trim())

  const baseRecipients = useMemo(() => [
    ...sendable.map((r) => ({ email: r.email, variables: r.client ? buildVars(r.client) : buildBaseVars(r.email) })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sendable, industryConfig, custom])

  // client fields used in the message that are empty for some recipients
  const emptyFields = usedKeys
    .filter((k) => ['client', 'custom'].includes(sourceOf(k)))
    .map((key) => ({ key, n: baseRecipients.filter((r) => !r.variables[key]?.trim()).length }))
    .filter((f) => f.n > 0)

  /** Fill blanks with the values typed for this send (never overrides a recipient's own value). */
  const withSendValues = (v: Record<string, string>) => {
    const out = { ...v }
    for (const [k, val] of Object.entries(sendValues)) if (val.trim() && !out[k]?.trim()) out[k] = val.trim()
    return out
  }
  const finalRecipients = () => baseRecipients.map((r) => ({ email: r.email, variables: withSendValues(r.variables) }))

  /**
   * "All" or "A group" goes to the server as rules, so whoever matches when it goes out gets it
   * (someone added to the group after scheduling is included). Per-client files keep a fixed list.
   */
  const segmentSend = (): SegmentSend | null => {
    if ((audience !== 'all' && audience !== 'filtered') || attachments.perClient.length > 0 || !hasOrg()) return null
    return {
      rules: audience === 'all' ? [] : plainRules(rules),
      excludeIds: [...excluded].map(Number).filter(Number.isInteger),
      tzOffsetMinutes: -new Date().getTimezoneOffset(),
      fallbacks: Object.fromEntries(Object.entries(sendValues).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()])),
      label: audienceLabel ?? undefined,
    }
  }
  /** Pasted addresses that aren't in the group: sent as they are, next to it */
  const outsideGroup = () => {
    const inGroup = new Set(selectedClients.map((c) => c.email?.trim().toLowerCase()))
    return finalRecipients().filter((r) => !inGroup.has(r.email.toLowerCase()))
  }

  const usesLogin = usedKeys.some((k) => sourceOf(k) === 'login')
  const sendWarnings = [
    ...emptyFields
      .filter((f) => !sendValues[f.key]?.trim())
      .map((f) => `${varLabel(f.key)} is empty for ${f.n} of ${baseRecipients.length} — it will be left blank.`),
    ...(usesLogin ? ["Login details are filled in from each recipient's portal login; recipients without one get blanks."] : []),
  ]

  const previewIndex = Math.min(previewClientIndex, Math.max(0, baseRecipients.length - 1))
  const previewRecipient = baseRecipients[previewIndex] ?? null
  // Same rules as the server: system values, typed values, unknown -> blank. Login values are only known when sent.
  const previewVars = (v: Record<string, string>) => ({
    ...systemVariables(),
    login_email: '[login email — filled in when sent]',
    login_password: '[password — filled in when sent]',
    login_url: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
    ...withSendValues(v),
  })
  const preview = previewRecipient ? renderEmailPreview(msgSubject, withSignature(msgBody, signature), previewVars(previewRecipient.variables)) : null

  const recipientCount = baseRecipients.length

  // ── What still blocks sending (each one knows how to take you there) and what's worth a look ──
  const focusEditable = (id: string) => {
    const el = document.querySelector<HTMLElement>(`#${id} [contenteditable]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.focus()
  }
  const checks = [
    { ok: recipientCount > 0, done: `Sending to ${recipientCount.toLocaleString()} ${recipientCount === 1 ? industryConfig.recipientSingular.toLowerCase() : industryConfig.recipientPlural.toLowerCase()}`, todo: 'Choose who should receive it', fix: () => setRecipientsOpen(true) },
    { ok: !!subject.trim(), done: 'Subject added', todo: 'Add a subject', fix: () => focusEditable('compose-subject') },
    { ok: hasBody, done: 'Message written', todo: 'Write a message', fix: () => focusEditable('compose-body') },
  ]
  const badCc = parseAddresses(ccInput).invalid
  const badBcc = parseAddresses(bccInput).invalid
  const blockers = [
    ...checks.filter((c) => !c.ok).map((c) => ({ label: c.todo, fix: c.fix })),
    ...missingAsk.map((k) => ({ label: `Fill in ${varLabel(k)}`, fix: () => { focusValue(k) } })),
    ...(badCc.length || badBcc.length ? [{
      label: `Fix the ${badCc.length ? 'Cc' : 'Bcc'} address “${(badCc[0] ?? badBcc[0])}”`,
      fix: () => { setShowCcBcc(true); setTimeout(() => document.getElementById(badCc.length ? 'cc' : 'bcc')?.focus(), 0) },
    }] : []),
  ]
  // ponytail: re-checked on every render; fine for a few thousand recipients, memoize if it gets slow
  const warnings = recipientCount > 0
    ? [...sendWarnings, ...checkEmail({ subject, body, recipients: finalRecipients() }), ...attachmentIssues(attachments, baseRecipients.map((r) => r.email))]
    : []
  /** Run the action, or take the user to the first thing that's missing. */
  const whenReady = (action: () => void) => {
    const b = blockers[0]
    if (!b) return action()
    b.fix()
    toast({ title: b.label, description: blockers.length > 1 ? `${blockers.length - 1} more thing${blockers.length > 2 ? 's' : ''} to do before sending.` : undefined, variant: 'destructive' })
  }

  /** One email to the signed-in user, filled in as the client shown in the preview. */
  const sendTest = async () => {
    const me = testTo.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(me)) { toast({ title: 'Enter a valid email address for the test', variant: 'destructive' }); return }
    setTestOpen(false)
    const contentMissing = blockers.find((b) => b.label === 'Add a subject' || b.label === 'Write a message')
    if (contentMissing) { contentMissing.fix(); toast({ title: contentMissing.label, variant: 'destructive' }); return }
    const r = previewRecipient
    setIsTesting(true)
    try {
      await sendBulkEmail({
        ...messagePayload(),
        attachments: attachments.shared,
        recipients: [{ email: me, variables: withSendValues(r ? r.variables : buildBaseVars(me)), attachments: r ? filesFor(attachments, r.email) : [] }],
      })
      toast({ title: 'Test email on its way', description: `Sent to ${me}${r ? ` as ${r.variables.client_name || r.email}` : ''}. It arrives within a minute.`, variant: 'success' })
    } catch (err) {
      toast({ title: 'Could not send the test', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSend = async () => {
    if (baseRecipients.length === 0) {
      toast({ title: 'No recipients', description: 'Please select at least one client or enter a recipient email.', variant: 'destructive' })
      return
    }
    if (!subject.trim()) { toast({ title: 'Missing subject', description: 'Please enter an email subject.', variant: 'destructive' }); return }
    if (!hasBody) { toast({ title: 'Missing message', description: 'Please write a message.', variant: 'destructive' }); return }
    if (missingAsk.length) {
      toast({ title: 'Values needed', description: `Fill in ${missingAsk.map(varLabel).join(', ')} under "Values for this send".`, variant: 'destructive' })
      return
    }

    setIsSending(true)
    try {
      const segment = segmentSend()
      const recipients = segment ? outsideGroup() : finalRecipients()
      const message = messagePayload()
      const res = await sendBulkEmail({
        ...message,
        ...(segment ? { segment } : {}),
        attachments: attachments.shared,
        recipients: withFiles(recipients),
        cc: ccInput.trim() || undefined,
        bcc: bccInput.trim() || undefined,
      })
      const queued = segment ? recipientCount : res.queued
      toast({
        title: `${queued.toLocaleString()} email${queued === 1 ? '' : 's'} queued`,
        description: 'Sending starts within a minute and continues even if you close this tab. Track it in Scheduled Mails.',
        variant: 'success',
      })
      setAudience(null)
      setExcluded(new Set())
      setSelectedIds(new Set())
      setCustomRecipients('')
      setCcInput('')
      setBccInput('')
      setMessage({ template: null, subject: '', body: BLANK_BODY })
      setSendValues({})
      setAttachments(NO_ATTACHMENTS)
      void finishDraft()
    } catch (err) {
      toast({
        title: 'Could not queue the emails',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  // ── Drafts: every email autosaves on the server as its own draft; sending removes only that one ──
  const draftUser = useRef<unknown>(undefined)
  const draftIdRef = useRef<number | null>(null)
  /** Saves run one after another, so an older save never lands after a newer one */
  const saving = useRef<Promise<void>>(Promise.resolve())
  /** Unsent emails other than the one on screen */
  const [otherDrafts, setOtherDrafts] = useState<ServerDraft[]>([])
  const [draftsHidden, setDraftsHidden] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const draftTitle = (d: { subject: string }) =>
    d.subject.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => varLabel(k)).replace(/<[^>]*>/g, '').trim() || 'Untitled email'
  const draftJson = JSON.stringify({
    audience,
    rules,
    pickedIds: audience === 'pick' ? [...selectedIds] : [],
    excludedIds: [...excluded],
    customRecipients,
    cc: ccInput,
    bcc: bccInput,
    templateId: selectedTemplate ? Number(selectedTemplate.id) : null,
    subject,
    body,
    sendValues,
    attachments,
    // a template opened but not changed isn't worth a draft on its own
    untouchedTemplate: !!selectedTemplate && !isEdited(message),
  })

  const applyDraft = (d: SendDraft, tpls: EmailTemplate[] = templates) => {
    setAudience(d.audience)
    setRules(d.rules ?? [
      ...(d.categories?.length ? [{ id: 'c', field: 'businessType' as const, op: 'any' as const, values: d.categories }] : []),
      ...(d.services?.length ? [{ id: 's', field: 'service' as const, op: 'any' as const, values: d.services }] : []),
    ])
    setSelectedIds(new Set(d.audience === 'pick' ? d.pickedIds : []))
    setExcluded(new Set(d.excludedIds ?? []))
    setCustomRecipients(d.customRecipients ?? '')
    setCcInput(d.cc ?? '')
    setBccInput(d.bcc ?? '')
    setShowCcBcc(!!(d.cc || d.bcc))
    setMessage({ template: tpls.find((t) => Number(t.id) === d.templateId) ?? null, subject: d.subject ?? '', body: d.body ?? BLANK_BODY })
    setSendValues(d.sendValues ?? {})
    setAttachments({ ...NO_ATTACHMENTS, ...(d.attachments ?? {}) })
  }

  useEffect(() => {
    draftUser.current = getUserData()?.id
    const wanted = Number(new URLSearchParams(window.location.search).get('draft')) || null
    ;(async () => {
      // A draft the old version kept in this browser: move it to the server, once
      const local = loadDraft(draftUser.current)
      if (local) {
        try {
          if (!isEmptyDraft(local)) await createDraft(draftTitle(local), local)
          clearDraft(draftUser.current)
        } catch { /* stays in this browser; moved on the next visit */ }
      }
      const list = await listDrafts().catch(() => [] as ServerDraft[])
      const open = list.find((d) => d.id === wanted)
      if (open) {
        applyDraft(open.data as SendDraft, await templatesReady.current)
        draftIdRef.current = open.id
        setDraftSavedAt(Date.parse(open.updatedAt))
      } else {
        // "Use in email" on the Templates page
        const tid = Number(new URLSearchParams(window.location.search).get('template'))
        const t = tid ? (await templatesReady.current).find((x) => Number(x.id) === tid) : undefined
        if (t) setMessage({ template: t, subject: t.subject ?? '', body: t.body ?? '' })
      }
      setOtherDrafts(list.filter((d) => d !== open))
      setDraftReady(true)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Save what's on screen as its draft (an empty page deletes it). */
  const persist = (json: string) => {
    saving.current = saving.current.then(async () => {
      const { untouchedTemplate, ...d } = JSON.parse(json)
      const id = draftIdRef.current
      // an opened-but-unchanged template doesn't start a draft (an existing one keeps saving)
      if (!id && untouchedTemplate && isEmptyDraft({ ...d, subject: '', body: '' })) return
      if (isEmptyDraft(d)) {
        if (id) { draftIdRef.current = null; await deleteDraft(id) }
        setDraftSavedAt(null)
        return
      }
      const data: SendDraft = { v: 1, savedAt: Date.now(), ...d }
      const title = draftTitle(data)
      if (id) {
        // deleted somewhere else (another tab): save it again rather than lose it
        await updateDraft(id, { title, data }).catch(async () => { draftIdRef.current = (await createDraft(title, data)).id })
      } else {
        draftIdRef.current = (await createDraft(title, data)).id
      }
      setDraftSavedAt(data.savedAt)
    }).catch(() => { /* not saved; the next change tries again */ })
    return saving.current
  }
  useEffect(() => {
    if (!draftReady) return
    const t = setTimeout(() => { void persist(draftJson) }, 800)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftJson, draftReady])

  /** After a send or schedule: the email is out, so its draft goes (and only that one). */
  const finishDraft = async () => {
    setDraftReady(false)
    await saving.current
    const id = draftIdRef.current
    draftIdRef.current = null
    if (id) await deleteDraft(id).catch(() => { /* an orphan draft is harmless */ })
    setDraftSavedAt(null)
    setDraftReady(true)
  }

  /** Switch to another unsent email; the one on screen stays saved as its own draft. */
  const openDraft = async (sd: ServerDraft) => {
    setDraftReady(false) // no autosave mid-switch
    await persist(draftJson)
    applyDraft(sd.data as SendDraft)
    draftIdRef.current = sd.id
    setDraftSavedAt(Date.parse(sd.updatedAt))
    const list = await listDrafts().catch(() => null)
    setOtherDrafts((l) => (list ?? l).filter((d) => d.id !== sd.id))
    setDraftReady(true)
  }
  const discardDraft = (sd: ServerDraft) => {
    setOtherDrafts((l) => l.filter((d) => d.id !== sd.id))
    deleteDraft(sd.id).catch(() => toast({ title: 'Could not discard the draft', variant: 'destructive' }))
  }
  const timeLabel = (ms: number) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

  const groupName = activeGroup?.name || describeRules(rules, ruleFields) || 'A group'
  const audienceLabel = audience === 'all' ? `All ${industryConfig.recipientPlural.toLowerCase()}` : audience === 'filtered' ? groupName : audience === 'pick' && selectedIds.size ? 'Chosen' : null
  const fileCount = attachments.shared.length + attachments.perClient.length

  return (
    <div className="flex min-h-full flex-col bg-background px-4 pt-4 sm:px-6 xl:h-full">
      {/* Header */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-semibold tracking-tight">New email</h1>
        {draftSavedAt && (
          <span className="text-sm text-muted-foreground">Draft saved {new Date(draftSavedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
        )}
      </div>

      {/* One line however many drafts there are: the latest, and a link to all of them */}
      {otherDrafts.length > 0 && !draftsHidden && (() => {
        const d = otherDrafts[0]
        return (
          <div role="region" aria-label="Unsent emails" className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-primary/30 bg-primary/5 py-1.5 pl-4 pr-1.5">
            <p className="mr-auto min-w-0 truncate text-sm">
              <span className="font-medium">Unsent email:</span> “{d.title}”
              <span className="text-muted-foreground"> · saved {timeLabel(Date.parse(d.updatedAt))}</span>
              {otherDrafts.length > 1 && (
                <>
                  <span className="text-muted-foreground"> · +{otherDrafts.length - 1} more · </span>
                  <a href="/email-management/scheduled-mails?tab=drafts" className="font-medium text-primary hover:underline">See all drafts</a>
                </>
              )}
            </p>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => discardDraft(d)}>Discard</Button>
              <Button type="button" variant="outline" size="sm" disabled={isLoadingTemplates} onClick={() => openDraft(d)}>Continue</Button>
              <button type="button" aria-label="Hide unsent emails" onClick={() => setDraftsHidden(true)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-foreground">
                <XClose className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })()}

      <div className="mb-3 grid items-start gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] xl:items-stretch">
        {/* ── The email, with Write / Preview tabs ── */}
        <section aria-label="Email" className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm xl:min-h-0">
          <div role="tablist" aria-label="Email view" className="flex items-end gap-1 border-b border-border bg-muted px-3 pt-2">
            {([['write', PenLine, 'Write'], ['preview', Eye, 'Preview']] as const).map(([v, Icon, text]) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className={cn('-mb-px inline-flex items-center gap-1.5 rounded-t-md border px-3.5 py-2 text-sm font-medium transition-colors',
                  view === v ? 'border-border border-b-card bg-card text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                <Icon className="h-4 w-4" />{text}
                {v === 'preview' && baseRecipients.length > 0 && <span className="text-xs font-normal text-muted-foreground">as {previewRecipient?.variables.client_name || previewRecipient?.email}</span>}
              </button>
            ))}
          </div>

          {view === 'preview' ? (
            <LivePreview
              className="min-h-[420px] rounded-none border-0 shadow-none xl:min-h-0 xl:flex-1"
              recipient={previewRecipient ? { name: previewRecipient.variables.client_name || previewRecipient.email, email: previewRecipient.email } : null}
              index={previewIndex}
              count={baseRecipients.length}
              onPrev={() => setPreviewClientIndex(previewIndex - 1)}
              onNext={() => setPreviewClientIndex(previewIndex + 1)}
              subjectText={preview?.subject ?? ''}
              bodyHtml={preview?.bodyHtml || '<span class="text-muted-foreground">(no message)</span>'}
              attachments={previewRecipient ? [...attachments.shared, ...filesFor(attachments, previewRecipient.email)].map((a) => a.name) : []}
              emptyText={`Choose ${industryConfig.recipientPlural.toLowerCase()} to see the email exactly as they will get it.`}
            />
          ) : (
          <div className="space-y-3 p-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-medium text-foreground">Template</span>
            <div className="min-w-0 flex-1">
              <TemplatePicker templates={templates} loading={isLoadingTemplates} value={message} onChange={setMessage} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-medium text-foreground">To</span>
            <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-input bg-background">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 px-2 py-1.5">
              {audienceLabel && (
                <button type="button" onClick={() => setRecipientsOpen(true)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary hover:bg-primary/15">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{audienceLabel} · {selectedIds.size.toLocaleString()}</span>
                  {excluded.size > 0 && <span className="shrink-0 font-normal">({excluded.size} left out)</span>}
                </button>
              )}
              {directEmailsList.length > 0 && (
                <button type="button" onClick={() => setRecipientsOpen(true)} className="rounded-md bg-muted px-2 py-0.5 text-sm hover:bg-muted/70">
                  +{directEmailsList.length} other address{directEmailsList.length === 1 ? '' : 'es'}
                </button>
              )}
              <button type="button" onClick={() => setRecipientsOpen(true)}
                className={cn('text-sm font-medium text-primary hover:underline', !audienceLabel && !directEmailsList.length && 'py-0.5')}>
                {audienceLabel || directEmailsList.length ? 'Change' : `Choose ${industryConfig.recipientPlural.toLowerCase()}…`}
              </button>
            </div>
            {/* Its own segment, so it reads as a button and not as part of the recipient list */}
            <button type="button" onClick={() => setShowCcBcc((v) => !v)} aria-expanded={showCcBcc} aria-controls="cc-bcc-fields"
              className={cn('inline-flex shrink-0 items-center gap-1 border-l border-input px-3 text-sm font-medium transition-colors',
                showCcBcc ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'bg-muted text-foreground/80 hover:bg-muted/60 hover:text-foreground')}>
              {showCcBcc ? <XClose className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              Cc / Bcc
            </button>
            </div>
          </div>
          {showCcBcc && (
            <div id="cc-bcc-fields" className="space-y-3">
              <div className="flex items-center gap-3">
                <label htmlFor="cc" className="w-16 shrink-0 text-sm font-medium text-foreground">Cc</label>
                <Input id="cc" value={ccInput} onChange={(e) => setCcInput(e.target.value)} placeholder="name@example.com"
                  aria-invalid={badCc.length > 0} aria-describedby={badCc.length ? 'cc-error' : undefined} />
              </div>
              {badCc.length > 0 && <p id="cc-error" className="pl-[76px] text-sm text-destructive">Not an email address: {badCc.join(', ')}</p>}
              <div className="flex items-center gap-3">
                <label htmlFor="bcc" className="w-16 shrink-0 text-sm font-medium text-foreground">Bcc</label>
                <Input id="bcc" value={bccInput} onChange={(e) => setBccInput(e.target.value)} placeholder="name@example.com"
                  aria-invalid={badBcc.length > 0} aria-describedby={badBcc.length ? 'bcc-error' : undefined} />
              </div>
              {badBcc.length > 0 && <p id="bcc-error" className="pl-[76px] text-sm text-destructive">Not an email address: {badBcc.join(', ')}</p>}
            </div>
          )}

          <MessageComposer
            vars={vars}
            tagOptions={tagOptions}
            value={message}
            onChange={setMessage}
            onTemplateSaved={(t) => setTemplates((list) => [t, ...list.filter((x) => x.id !== t.id)])}
          />

          <AttachmentsPanel value={attachments} onChange={setAttachments} recipientEmails={baseRecipients.map((r) => r.email)} />
          </div>
          )}
        </section>

        {/* ── What's left to do ── */}
        <div className="flex flex-col gap-4 xl:min-h-0">
          <section aria-label="Before you send" className="rounded-xl border border-border bg-card p-4 shadow-sm xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
            <h2 className="mb-3 text-base font-semibold">Before you send</h2>
            <ul className="space-y-1.5 text-sm">
              {checks.map((c) => (
                <li key={c.todo}>
                  {c.ok ? (
                    <span className="flex items-start gap-2 text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{c.done}</span>
                  ) : (
                    <button type="button" onClick={c.fix} className="flex items-start gap-2 text-left font-medium text-destructive hover:underline">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{c.todo}
                    </button>
                  )}
                </li>
              ))}
              {blockers.filter((b) => b.label.startsWith('Fix the')).map((b) => (
                <li key={b.label}>
                  <button type="button" onClick={b.fix} className="flex items-start gap-2 text-left font-medium text-destructive hover:underline">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{b.label}
                  </button>
                </li>
              ))}
              {warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{w}
                </li>
              ))}
            </ul>
            {leftOut.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Left out automatically: {leftOut.map((x) => `${x.n.toLocaleString()} ${x.text}`).join(', ')}.
              </p>
            )}
            {baseRecipients.length > 0 && view === 'write' && (
              <Button type="button" variant="outline" size="sm" className="mt-3 w-full gap-1.5" onClick={() => setView('preview')}>
                <Eye className="h-4 w-4" />See it as {previewRecipient?.variables.client_name || previewRecipient?.email}
              </Button>
            )}
              {/* Values for this send: asked/custom variables (required) + fallbacks for empty client fields */}
              {(askKeys.length > 0 || (emptyFields.length > 0 && baseRecipients.length > 0)) && (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  <div>
                    <p className="text-sm font-medium">Values for this send</p>
                    <p className="text-xs text-muted-foreground">Used for every recipient in this send.</p>
                  </div>
                  {askKeys.map((k) => {
                    const known = sourceOf(k) !== 'unknown'
                    const guess = known ? undefined : suggestVariable(vars, k)
                    return (
                      <div key={k} className="space-y-1">
                        <label htmlFor={`sv-${k}`} className="text-xs font-medium">
                          {varLabel(k)} <span className="text-destructive">*</span>
                          {!known && <span className="ml-1 font-normal text-muted-foreground">(one-off {`{{${k}}}`})</span>}
                          {!known && (
                            <button type="button" className="ml-2 text-xs font-medium text-primary underline" onClick={() => setSaveKey(k)}>
                              Save as custom variable
                            </button>
                          )}
                        </label>
                        <Input id={`sv-${k}`} className="h-9 text-sm" value={sendValues[k] ?? ''}
                          placeholder={vars.find((v) => v.key === k)?.example || `Value for ${varLabel(k)}`}
                          onChange={(e) => setSendValues((s) => ({ ...s, [k]: e.target.value }))} />
                        {guess && (
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            Not a known variable. Did you mean <strong>{guess.label}</strong> ({guess.token})?
                            <button type="button" className="ml-1 underline font-medium"
                              onClick={() => {
                                const re = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g')
                                setMessage((m) => ({ ...m, subject: m.subject.replace(re, guess.token), body: m.body.replace(re, guess.token) }))
                              }}>Replace it</button>
                          </p>
                        )}
                      </div>
                    )
                  })}
                  {baseRecipients.length > 0 && emptyFields.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <label htmlFor={`sv-${f.key}`} className="text-xs font-medium">
                        {varLabel(f.key)}
                        <span className="ml-1 font-normal text-muted-foreground">— empty for {f.n} of {baseRecipients.length}; optional value to use for them</span>
                      </label>
                      <Input id={`sv-${f.key}`} className="h-9 text-sm" value={sendValues[f.key] ?? ''}
                        placeholder="Leave empty to send it blank"
                        onChange={(e) => setSendValues((s) => ({ ...s, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              )}
  
          </section>
        </div>
      </div>

      {/* ── Send bar (always visible) ── */}
      <div className="sticky bottom-0 z-20 shrink-0 -mx-4 sm:-mx-6 mt-auto border-t border-border bg-background/95 backdrop-blur px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="mr-auto min-w-0 truncate text-sm">
            {recipientCount === 0
              ? <span className="text-muted-foreground">No recipients yet</span>
              : <span className="font-semibold">{recipientCount.toLocaleString()} {recipientCount === 1 ? industryConfig.recipientSingular.toLowerCase() : industryConfig.recipientPlural.toLowerCase()}</span>}
            {fileCount > 0 && <span className="text-muted-foreground"> · {fileCount} file{fileCount === 1 ? '' : 's'}</span>}
            {' · '}
            {blockers.length > 0
              ? <span className="text-destructive">{blockers.length} thing{blockers.length === 1 ? '' : 's'} to do</span>
              : warnings.length > 0
              ? <span className="text-amber-700 dark:text-amber-400">{warnings.length} thing{warnings.length === 1 ? '' : 's'} to check</span>
              : <span className="text-emerald-700 dark:text-emerald-400">Ready to send</span>}
          </p>
          <Popover open={testOpen} onOpenChange={(o) => { setTestOpen(o); if (o && !testTo) setTestTo((getUserData() as { email?: string } | null)?.email ?? '') }}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="gap-1.5" disabled={isTesting}>
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail01 className="h-4 w-4" />}
                Send a test
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void sendTest() }}>
                <label htmlFor="test-to" className="block text-sm font-medium">Send one test email to</label>
                <Input id="test-to" type="email" required value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
                <p className="text-xs text-muted-foreground">Filled in as the client shown in the preview.</p>
                <Button type="submit" size="sm" className="w-full" disabled={isTesting}>Send test</Button>
              </form>
            </PopoverContent>
          </Popover>
          <div className="inline-flex">
            <Button type="button" className="gap-1.5 rounded-r-none" disabled={isSending} onClick={() => whenReady(() => setSendConfirmOpen(true))}>
              {isSending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                : <><Send01 className="h-4 w-4" /> {recipientCount > 0 ? `Send to ${recipientCount.toLocaleString()}` : 'Send'}</>}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" aria-label="More send options" className="rounded-l-none border-l border-primary-foreground/30 px-2" disabled={isSending}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => whenReady(() => setScheduleDrawerOpen(true))} className="gap-2">
                  <Calendar className="h-4 w-4" /> Schedule for later…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── Recipients panel ── */}
      <Sheet open={recipientsOpen} onOpenChange={setRecipientsOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Who should receive it?</SheetTitle>
            <SheetDescription>Pick everyone, a group, or people one by one. Untick anyone to leave them out.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <div role="radiogroup" aria-label="Recipients" className="grid gap-2">
              <AudienceOption checked={audience === 'all'} onSelect={() => chooseAudience('all')}
                title={`All ${industryConfig.recipientPlural.toLowerCase()}`}
                detail={isLoadingClients ? 'Loading…' : `${clients.length.toLocaleString()} ${industryConfig.recipientPlural.toLowerCase()}`} />
              <AudienceOption checked={audience === 'filtered'} onSelect={() => chooseAudience('filtered')}
                title="A group" detail={`By ${industryConfig.categoryFilterLabel.toLowerCase()}, ${industryConfig.serviceFilterLabel.toLowerCase()}, status, place or dates`} />
              <AudienceOption checked={audience === 'pick'} onSelect={() => chooseAudience('pick')}
                title="Choose one by one" detail="Search and tick individual names" />
            </div>

          {audience === 'filtered' && (
            <div className="space-y-3 rounded-lg bg-muted/40 p-3">
              <AudienceRules rules={rules} onChange={setRules} fields={ruleFields} />
              <p className="text-sm">
                <span className="font-semibold">{segmentClients.length.toLocaleString()}</span>{' '}
                <span className="text-muted-foreground">of {clients.length.toLocaleString()} {industryConfig.recipientPlural.toLowerCase()} match</span>
                {rules.length > 0 && (
                  <button type="button" onClick={() => setRules([])} className="ml-2 text-primary hover:underline">Clear</button>
                )}
              </p>
              {(savedGroups.length > 0 || (rules.length > 0 && hasOrg())) && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {savedGroups.length > 0 && <span className="text-sm text-muted-foreground">Saved groups:</span>}
                  {savedGroups.map((g) => (
                    <span key={g.id} className={cn('inline-flex items-center rounded-full border text-sm',
                      activeGroup?.id === g.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background')}>
                      <button type="button" className="py-1 pl-3 pr-1" aria-pressed={activeGroup?.id === g.id}
                        onClick={() => { setRules(toRules(g.rules)); setPickedGroupId(g.id); setNewGroupName(null); setRenaming(false) }}>{g.name}</button>
                      <button type="button" aria-label={`Delete saved group ${g.name}`} onClick={() => removeGroup(g)}
                        className="rounded-full py-1 pl-1 pr-2 text-muted-foreground hover:text-destructive">
                        <XClose className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {newGroupName === null && activeGroup && (
                    <button type="button" className="text-sm font-medium text-primary hover:underline"
                      onClick={() => { setRenaming(true); setNewGroupName(activeGroup.name) }}>Rename</button>
                  )}
                  {newGroupName === null && !activeGroup && rules.length > 0 && pickedGroup && (
                    <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={updatePickedGroup}>
                      Update “{pickedGroup.name}”
                    </button>
                  )}
                  {(rules.length > 0 || renaming) && (!activeGroup || renaming) && (newGroupName === null ? (
                    <button type="button" className="text-sm font-medium text-primary hover:underline"
                      onClick={() => setNewGroupName(describeRules(rules, ruleFields).slice(0, 80))}>{pickedGroup ? 'Save as new group' : 'Save this group'}</button>
                  ) : (
                    <form className="flex w-full items-center gap-2" onSubmit={(e) => { e.preventDefault(); storeGroup() }}>
                      <Input autoFocus aria-label="Group name" maxLength={80} value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)} className="h-9" />
                      <Button type="submit" size="sm" disabled={!newGroupName.trim()}>Save</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setNewGroupName(null); setRenaming(false) }}>Cancel</Button>
                    </form>
                  ))}
                </div>
              )}
            </div>
          )}

            {audience && (
              <div className="rounded-lg border border-border">
                <div className="border-b border-border p-2">
                  <div className="relative">
                    <SearchMd className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={industryConfig.searchPlaceholder} className="pl-9" />
                  </div>
                  <label className="mt-2 flex cursor-pointer items-center gap-2 px-1 text-sm text-muted-foreground">
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={allSelected} onChange={toggleSelectAll} />
                    Select all {search.trim() ? 'results' : ''}
                    <span className="ml-auto font-medium text-foreground">{selectedIds.size.toLocaleString()} selected</span>
                  </label>
                </div>
                <div>
                  {isLoadingClients ? (
                    <p className="p-4 text-sm text-muted-foreground">Loading…</p>
                  ) : filteredClients.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No {industryConfig.recipientPlural.toLowerCase()} found.</p>
                  ) : filteredClients.slice(0, shown).map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-3 border-b border-border/60 px-3 py-2 last:border-0 hover:bg-muted/50">
                      <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={selectedIds.has(c.id)} onChange={() => toggleClient(c.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                      </span>
                      {c.businessType && <span className="shrink-0 text-xs text-muted-foreground">{c.businessType}</span>}
                    </label>
                  ))}
                  {filteredClients.length > shown && (
                    <button type="button" onClick={() => setShownFor({ key: listKey, n: shown + LIST_PAGE })}
                      className="w-full px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted/50">
                      Show {Math.min(LIST_PAGE, filteredClients.length - shown).toLocaleString()} more
                      <span className="font-normal text-muted-foreground"> · {(filteredClients.length - shown).toLocaleString()} not shown (all are still included)</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="also-to" className="mb-1.5 block text-sm font-medium">Paste email addresses <span className="font-normal text-muted-foreground">(optional)</span></label>
              <textarea id="also-to" rows={3} value={customRecipients} onChange={(e) => setCustomRecipients(e.target.value)}
                placeholder={'One per line, or separated by commas.\nCopy a column from Excel or a list like: Asha <asha@example.com>'}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              {customRecipients.trim() && (
                <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                  {pasted.valid.length.toLocaleString()} address{pasted.valid.length === 1 ? '' : 'es'}
                  {(() => { const n = pasted.valid.filter((e) => clientByEmail.has(e)).length; return n ? ` · ${n.toLocaleString()} saved ${(n === 1 ? industryConfig.recipientSingular : industryConfig.recipientPlural).toLowerCase()} (sent with their details)` : '' })()}
                  {pasted.duplicates > 0 && ` · ${pasted.duplicates} repeat${pasted.duplicates === 1 ? '' : 's'} removed`}
                  {pasted.invalid.length > 0 && <span className="text-destructive"> · {pasted.invalid.length} not valid: {pasted.invalid.slice(0, 3).join(', ')}{pasted.invalid.length > 3 ? '…' : ''}</span>}
                </p>
              )}
            </div>
            {leftOut.length > 0 && (
              <div role="note" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Left out automatically</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {leftOut.map((x) => <li key={x.text}>{x.n.toLocaleString()} {x.text}</li>)}
                </ul>
              </div>
            )}
          </div>
          <SheetFooter className="border-t border-border">
            <Button type="button" onClick={() => setRecipientsOpen(false)}>
              Done{recipientCount > 0 ? ` · ${recipientCount.toLocaleString()} selected` : ''}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ScheduleSheet
        open={scheduleDrawerOpen}
        onOpenChange={setScheduleDrawerOpen}
        audience={`${baseRecipients.length.toLocaleString()} recipient${baseRecipients.length === 1 ? '' : 's'}`}
        problem={scheduleProblem()}
        busy={isScheduling}
        onSchedule={handleSchedule}
        groupSend={!!segmentSend()}
      />

      <SaveVariableDialog keyName={saveKey} onClose={() => setSaveKey(null)} onSaved={reloadCustom}
        sendNote="Or keep it a one-off and type its value under “Values for this send”." />

      <SendConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        recipientCount={totalRecipientCount}
        cc={ccInput.trim()}
        bcc={bccInput.trim()}
        warnings={warnings}
        isSending={isSending}
        onConfirm={() => { setSendConfirmOpen(false); handleSend() }}
      />
    </div>
  )
}

function AudienceOption({ checked, onSelect, title, detail }: { checked: boolean; onSelect: () => void; title: string; detail: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
        checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
      )}
    >
      <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2', checked ? 'border-primary' : 'border-muted-foreground/40')}>
        {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  )
}
