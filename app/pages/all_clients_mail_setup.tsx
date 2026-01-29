'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { 
  Mail, 
  Send, 
  Calendar as CalendarIcon, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Users,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { 
  getClients,
  getScheduledEmails,
  createEmailConfig,
  updateEmailConfig,
  type Client,
  type ScheduledEmail,
  type GetScheduledEmailsParams,
} from '@/lib/api/index'
import {
  getOrgEmailTemplates,
  getMasterEmailTemplates,
  type EmailTemplate,
  EmailTemplateCategory,
} from '@/lib/api/index'
import { format } from 'date-fns'
import { ApiError } from '@/lib/api/index'

type DateType = 'all' | 'range' | 'range_multiple' | 'single'

export function AllClientsMailSetup() {
  const { toast } = useToast()
  
  // State
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [emails, setEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [showAddEmailInput, setShowAddEmailInput] = useState(false)
  const [emailTemplates, setEmailTemplates] = useState<Record<string, Set<number>>>({})
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Schedule state - per template
  const [templateSchedules, setTemplateSchedules] = useState<Record<string, {
    dateType: DateType
    scheduledDate: Date | null
    scheduledDateFrom: Date | null
    scheduledDateTo: Date | null
    scheduledDates: Date[]
    scheduledTimes: string[]
  }>>({})
  
  // History state
  const [emailHistory, setEmailHistory] = useState<ScheduledEmail[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'pending' | 'sent' | 'failed' | 'cancelled'>('all')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(10)
  
  // Scheduled mails state
  const [scheduledMails, setScheduledMails] = useState<ScheduledEmail[]>([])
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [scheduledMailsPage, setScheduledMailsPage] = useState(1)
  const [scheduledMailsPageSize] = useState(10)
  
  // Fetch clients and templates on mount
  useEffect(() => {
    fetchClients()
    fetchTemplates()
  }, [])
  
  // Refs: dedupe and avoid duplicate/concurrent fetches
  const isFetchingScheduledRef = React.useRef(false)
  
  // Fetch email history only when history filter or client list changes (do not refetch scheduled mails here)
  useEffect(() => {
    if (clients.length > 0) {
      setHistoryPage(1) // Reset to first page when filter changes
      fetchEmailHistory()
    }
  }, [historyStatusFilter, clients.length])
  
  // Fetch scheduled mails once when we have clients, then poll every 60s (not on history filter change)
  useEffect(() => {
    if (clients.length === 0) return
    let isMounted = true
    const doFetch = () => {
      if (!isMounted || isFetchingScheduledRef.current) return
      isFetchingScheduledRef.current = true
      fetchScheduledMails().finally(() => {
        isFetchingScheduledRef.current = false
      })
    }
    doFetch()
    const interval = setInterval(doFetch, 60000) // 60s poll (was 30s)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [clients.length])
  
  // Update current time every second for countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  
  const fetchClients = async () => {
    try {
      setIsLoadingClients(true)
      const response = await getClients({ limit: 1000 })
      setClients(response.clients || [])
      
      // Automatically populate emails with all client email addresses
      const clientEmails = (response.clients || [])
        .map(client => client.email)
        .filter((email): email is string => !!email && email.trim() !== '')
      
      if (clientEmails.length > 0) {
        setEmails(clientEmails)
        // Auto-select all emails
        setSelectedEmails(new Set(clientEmails))
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingClients(false)
    }
  }
  
  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true)
      const [orgResponse, masterResponse] = await Promise.all([
        getOrgEmailTemplates({ limit: 1000 }),
        getMasterEmailTemplates({ limit: 1000 })
      ])
      
      // Combine templates: prefer org templates, fallback to master templates
      const allTemplates = [
        ...orgResponse.templates,
        ...masterResponse.templates.filter(
          mt => !orgResponse.templates.some(ot => ot.type === mt.type && ot.category === mt.category)
        )
      ]
      
      setTemplates(allTemplates)
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load email templates',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingTemplates(false)
    }
  }
  
  const fetchEmailHistory = async () => {
    try {
      setIsLoadingHistory(true)
      const twentyFourHoursAgo = new Date().getTime() - (24 * 60 * 60 * 1000) // 24 hours in milliseconds
      
      // Single batch: fetch scheduled emails for all clients in parallel (one logical request per view)
      const results = await Promise.all(
        clients.map((client) =>
          getScheduledEmails(client.id, { limit: 1000 }).catch(() => ({ scheduled_emails: [] as ScheduledEmail[] }))
        )
      )
      const allScheduledEmails: ScheduledEmail[] = results.flatMap((r) => r.scheduled_emails || [])
      
      // Remove duplicates
      const uniqueEmails = Array.from(
        new Map(allScheduledEmails.map(email => [email.id, email])).values()
      )
      
      // Filter based on status and 24-hour rule
      const historyEmails = uniqueEmails.filter(email => {
        const scheduledTime = new Date(email.scheduled_datetime).getTime()
        const isOldPending = email.status === 'pending' && scheduledTime <= twentyFourHoursAgo
        
        // If filtering by specific status, only show that status (old pending emails are included if filter is 'pending' or 'all')
        if (historyStatusFilter !== 'all') {
          // If filtering by 'pending', include all pending emails (both old and recent)
          if (historyStatusFilter === 'pending') {
            return email.status === 'pending'
          }
          // For other statuses, only show matching status
          return email.status === historyStatusFilter
        }
        
        // If showing all, include everything except recent pending emails (those are in scheduled tab)
        return email.status !== 'pending' || isOldPending
      })
      
      // Sort by scheduled_datetime descending (most recent first)
      historyEmails.sort((a, b) => 
        new Date(b.scheduled_datetime).getTime() - new Date(a.scheduled_datetime).getTime()
      )
      
      setEmailHistory(historyEmails)
    } catch (error) {
      console.error('Error fetching email history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load email history',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }
  
  const fetchScheduledMails = async () => {
    try {
      setIsLoadingScheduled(true)
      const now = new Date()
      const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000) // 24 hours in milliseconds
      const params: GetScheduledEmailsParams = { limit: 1000, status: 'pending' }
      
      // Single batch: fetch pending scheduled emails for all clients in parallel (not N sequential requests)
      const results = await Promise.all(
        clients.map((client) =>
          getScheduledEmails(client.id, params).catch(() => ({ scheduled_emails: [] as ScheduledEmail[] }))
        )
      )
      const allScheduledEmails: ScheduledEmail[] = results.flatMap((r) => r.scheduled_emails || [])
      
      // Filter out emails that are 24+ hours past their scheduled time
      const activeScheduledEmails = allScheduledEmails.filter(email => {
        const scheduledTime = new Date(email.scheduled_datetime).getTime()
        // Keep only emails that are either in the future or less than 24 hours past their scheduled time
        return scheduledTime > twentyFourHoursAgo
      })
      
      // Sort by ID descending (most recently added first)
      activeScheduledEmails.sort((a, b) => 
        b.id - a.id
      )
      
      setScheduledMails(activeScheduledEmails)
    } catch (error) {
      console.error('Error fetching scheduled mails:', error)
      toast({
        title: 'Error',
        description: 'Failed to load scheduled mails',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingScheduled(false)
    }
  }
  
  const getTimeRemaining = (scheduledDatetime: string): string => {
    const scheduled = new Date(scheduledDatetime)
    const now = currentTime
    const diff = scheduled.getTime() - now.getTime()
    
    if (diff <= 0) {
      return 'time out'
    }
    
    const totalSeconds = Math.floor(diff / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    // Format as HH:MM:SS or MM:SS
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    } else {
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
  }
  
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  const handleAddEmail = () => {
    const email = newEmail.trim()
    
    if (!email) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      })
      return
    }

    if (!validateEmail(email)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }

    if (emails.includes(email)) {
      toast({
        title: 'Duplicate Email',
        description: 'This email is already added',
        variant: 'destructive',
      })
      return
    }

    setEmails(prev => [...prev, email])
    setEmailTemplates(prev => ({
      ...prev,
      [email]: new Set<number>()
    }))
    setSelectedEmails(prev => new Set([...prev, email]))
    setNewEmail('')
  }
  
  const handleRemoveEmail = (index: number) => {
    const emailToRemove = emails[index]
    setEmails(prev => prev.filter((_, i) => i !== index))
    setSelectedEmails(prev => {
      const newSet = new Set(prev)
      newSet.delete(emailToRemove)
      return newSet
    })
    const updated = { ...emailTemplates }
    delete updated[emailToRemove]
    setEmailTemplates(updated)
  }
  
  const handleToggleEmailSelection = (email: string) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev)
      if (newSet.has(email)) {
        newSet.delete(email)
      } else {
        newSet.add(email)
      }
      return newSet
    })
  }

  const handleSelectAllEmails = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(new Set(emails))
    } else {
      setSelectedEmails(new Set())
    }
  }

  const handleSelectAllTemplatesForEmail = (email: string, checked: boolean) => {
    setEmailTemplates(prev => {
      const allTemplateIds = templates.map(t => t.id)
      return {
        ...prev,
        [email]: checked ? new Set(allTemplateIds) : new Set<number>()
      }
    })
  }

  const handleSelectTemplateForAllEmails = (templateId: number, checked: boolean) => {
    setEmailTemplates(prev => {
      const updated = { ...prev }
      emails.forEach(email => {
        const current = updated[email] || new Set<number>()
        const updatedSet = new Set(current)
        if (checked) {
          updatedSet.add(templateId)
        } else {
          updatedSet.delete(templateId)
        }
        updated[email] = updatedSet
      })
      return updated
    })
  }
  
  const handleToggleEmailTemplate = (email: string, templateId: number) => {
    setEmailTemplates(prev => {
      const current = prev[email] || new Set<number>()
      const updated = new Set(current)
      const wasSelected = updated.has(templateId)
      
      if (wasSelected) {
        updated.delete(templateId)
      } else {
        updated.add(templateId)
      }
      
      const newEmailTemplates = {
        ...prev,
        [email]: updated
      }
      
      // Check if template is selected in any email after this change
      const isTemplateSelected = Object.values(newEmailTemplates).some(
        templates => templates.has(templateId)
      )
      
      // Update schedules based on template selection
      if (isTemplateSelected && !templateSchedules[templateId.toString()]) {
        // Initialize schedule for this template
        setTemplateSchedules(prevSchedules => ({
          ...prevSchedules,
            [templateId.toString()]: {
              dateType: 'single',
              scheduledDate: null,
              scheduledDateFrom: null,
              scheduledDateTo: null,
              scheduledDates: [],
              scheduledTimes: [''],
            }
        }))
      } else if (!isTemplateSelected && templateSchedules[templateId.toString()]) {
        // Remove schedule if template is no longer selected
        setTemplateSchedules(prevSchedules => {
          const updated = { ...prevSchedules }
          delete updated[templateId.toString()]
          return updated
        })
      }
      
      return newEmailTemplates
    })
  }
  
  // Get all selected templates from all selected emails
  const getAllSelectedTemplates = () => {
    const selectedTemplateIds = new Set<number>()
    selectedEmails.forEach(email => {
      const templates = emailTemplates[email] || new Set<number>()
      templates.forEach(templateId => {
        selectedTemplateIds.add(templateId)
      })
    })
    return Array.from(selectedTemplateIds)
  }
  
  const selectedTemplateIds = getAllSelectedTemplates()
  
  const handleDateTypeChange = (templateId: number, dateType: DateType) => {
    setTemplateSchedules(prev => ({
      ...prev,
      [templateId.toString()]: {
        ...prev[templateId.toString()] || {
          scheduledDate: null,
          scheduledDateFrom: null,
          scheduledDateTo: null,
          scheduledDates: [],
          scheduledTimes: [''],
        },
        dateType,
        scheduledDate: null,
        scheduledDateFrom: null,
        scheduledDateTo: null,
        scheduledDates: dateType === 'range_multiple' ? [] : (prev[templateId.toString()]?.scheduledDates || []),
      }
    }))
  }
  
  const handleScheduleDatesChange = (templateId: number, dates: Date[] | undefined) => {
    setTemplateSchedules(prev => ({
      ...prev,
      [templateId.toString()]: {
        ...prev[templateId.toString()] || {
          dateType: 'range',
          scheduledDate: null,
          scheduledDateFrom: null,
          scheduledDateTo: null,
          scheduledTimes: [''],
        },
        scheduledDates: dates || [],
        scheduledDateFrom: null,
        scheduledDateTo: null,
        scheduledDate: null,
      }
    }))
  }
  
  const handleScheduleDateChange = (templateId: number, date: Date | undefined) => {
    setTemplateSchedules(prev => ({
      ...prev,
      [templateId.toString()]: {
        ...prev[templateId.toString()],
        scheduledDate: date || null,
        scheduledDateFrom: null,
        scheduledDateTo: null,
      }
    }))
  }
  
  const handleScheduleDateFromChange = (templateId: number, date: Date | undefined) => {
    setTemplateSchedules(prev => ({
      ...prev,
      [templateId.toString()]: {
        ...prev[templateId.toString()],
        scheduledDateFrom: date || null,
        scheduledDate: null,
      }
    }))
  }
  
  const handleScheduleDateToChange = (templateId: number, date: Date | undefined) => {
    setTemplateSchedules(prev => ({
      ...prev,
      [templateId.toString()]: {
        ...prev[templateId.toString()],
        scheduledDateTo: date || null,
        scheduledDate: null,
      }
    }))
  }
  
  const handleAddTime = (templateId: number) => {
    setTemplateSchedules(prev => ({
      ...prev,
      [templateId.toString()]: {
        ...prev[templateId.toString()],
        scheduledTimes: [...(prev[templateId.toString()]?.scheduledTimes || []), '']
      }
    }))
  }
  
  const handleTimeChange = (templateId: number, index: number, time: string) => {
    setTemplateSchedules(prev => {
      const schedule = prev[templateId.toString()]
      if (!schedule) return prev
      const updatedTimes = [...schedule.scheduledTimes]
      updatedTimes[index] = time
      return {
        ...prev,
        [templateId.toString()]: {
          ...schedule,
          scheduledTimes: updatedTimes
        }
      }
    })
  }
  
  const handleRemoveTime = (templateId: number, index: number) => {
    setTemplateSchedules(prev => {
      const schedule = prev[templateId.toString()]
      if (!schedule) return prev
      return {
        ...prev,
        [templateId.toString()]: {
          ...schedule,
          scheduledTimes: schedule.scheduledTimes.filter((_, i) => i !== index)
        }
      }
    })
  }
  
  const handleSave = async () => {
    if (selectedEmails.size === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one email address',
        variant: 'destructive',
      })
      return
    }
    
    if (selectedTemplateIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one email template for the selected emails',
        variant: 'destructive',
      })
      return
    }
    
    // Validate schedules for all selected templates
    for (const templateId of selectedTemplateIds) {
      const schedule = templateSchedules[templateId.toString()]
      if (!schedule) continue
      
      const dateType = schedule.dateType || 'single'
      
      if (dateType === 'single' && !schedule.scheduledDate) {
        const template = templates.find(t => t.id === templateId)
        toast({
          title: 'Validation Error',
          description: `Please set date for ${template?.name || 'selected template'}`,
          variant: 'destructive',
        })
        return
      }
      
      if (dateType === 'range' && (!schedule.scheduledDateFrom || !schedule.scheduledDateTo)) {
        const template = templates.find(t => t.id === templateId)
        toast({
          title: 'Validation Error',
          description: `Please set both from and to dates for ${template?.name || 'selected template'}`,
          variant: 'destructive',
        })
        return
      }
      
      if (dateType === 'range_multiple' && (!schedule.scheduledDates || schedule.scheduledDates.length === 0)) {
        const template = templates.find(t => t.id === templateId)
        toast({
          title: 'Validation Error',
          description: `Please select at least one date for ${template?.name || 'selected template'}`,
          variant: 'destructive',
        })
        return
      }
      
      if (dateType !== 'all' && (!schedule.scheduledTimes || schedule.scheduledTimes.length === 0 || schedule.scheduledTimes.some(t => !t))) {
        const template = templates.find(t => t.id === templateId)
        toast({
          title: 'Validation Error',
          description: `Please add at least one time for ${template?.name || 'selected template'}`,
          variant: 'destructive',
        })
        return
      }
    }
    
    setIsSaving(true)
    try {
      const selectedEmailsArray = Array.from(selectedEmails)
      let successCount = 0
      let errorCount = 0
      
      // Find clients by email addresses
      for (const email of selectedEmailsArray) {
        try {
          // Find client with this email
          const client = clients.find(c => c.email === email)
          if (!client) {
            toast({
              title: 'Warning',
              description: `No client found with email ${email}. Skipping.`,
              variant: 'destructive',
            })
            errorCount++
            continue
          }
          
          // Get templates selected for this email
          const emailSelectedTemplates = Array.from(emailTemplates[email] || [])
          if (emailSelectedTemplates.length === 0) continue
          
          // Build email config for this client
          const emailConfig: any = {
            emails: [email],
            emailTemplates: {
              [email]: {
                email,
                selectedTemplates: emailSelectedTemplates,
              }
            },
            services: {}
          }
          
          // Add services for each template selected for this email
          for (const templateId of emailSelectedTemplates) {
            const schedule = templateSchedules[templateId.toString()]
            const template = templates.find(t => t.id === templateId)
            
            if (!schedule || !template) continue
            
            const service: any = {
              enabled: true,
              templateId,
              templateName: template.name,
              dateType: schedule.dateType,
              scheduledTimes: schedule.scheduledTimes.filter(t => t),
            }
            
            if (schedule.dateType === 'single' && schedule.scheduledDate) {
              service.scheduledDate = format(schedule.scheduledDate, 'yyyy-MM-dd')
            } else if (schedule.dateType === 'range') {
              // Include date range (from - to) if set
              if (schedule.scheduledDateFrom) {
                service.scheduledDateFrom = format(schedule.scheduledDateFrom, 'yyyy-MM-dd')
              }
              if (schedule.scheduledDateTo) {
                service.scheduledDateTo = format(schedule.scheduledDateTo, 'yyyy-MM-dd')
              }
            } else if (schedule.dateType === 'range_multiple') {
              // Include multiple specific dates if set
              if (schedule.scheduledDates && schedule.scheduledDates.length > 0) {
                service.scheduledDates = schedule.scheduledDates.map(date => format(date, 'yyyy-MM-dd'))
              }
            }
            
            emailConfig.services[templateId.toString()] = service
          }
          
          // Try to update first, if 404 create new
          try {
            await updateEmailConfig(client.id, emailConfig)
          } catch (error: any) {
            if (error?.status === 404 || (error instanceof ApiError && error.status === 404)) {
              await createEmailConfig(client.id, emailConfig)
            } else {
              throw error
            }
          }
          
          successCount++
        } catch (error) {
          console.error(`Error saving config for email ${email}:`, error)
          errorCount++
        }
      }
      
      toast({
        title: successCount > 0 ? 'Success' : 'Error',
        description: `Email configuration saved for ${successCount} email address(es)${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
        variant: successCount > 0 ? 'success' : 'destructive',
      })
      
      // Refresh history and scheduled mails
      await fetchEmailHistory()
      await fetchScheduledMails()
      
      // Clear selections
      setSelectedEmails(new Set())
      setEmailTemplates({})
      setTemplateSchedules({})
    } catch (error) {
      console.error('Error saving email config:', error)
      toast({
        title: 'Error',
        description: 'Failed to save email configuration',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, EmailTemplate[]>)
  
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      [EmailTemplateCategory.SERVICE]: 'Service Templates',
      [EmailTemplateCategory.LOGIN]: 'Login Templates',
      [EmailTemplateCategory.NOTIFICATION]: 'Notification Templates',
      [EmailTemplateCategory.FOLLOW_UP]: 'Follow-up Templates',
      [EmailTemplateCategory.REMINDER]: 'Reminder Templates',
    }
    return labels[category] || category
  }
  
  const isBeforeToday = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateAtMidnight = new Date(date)
    dateAtMidnight.setHours(0, 0, 0, 0)
    return dateAtMidnight < today
  }
  
  const getStatusBadge = (status: ScheduledEmail['status']) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
      case 'cancelled':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }
  
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId)
    return client?.client_name || `Client #${clientId}`
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mail Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage email templates and schedules for all clients
          </p>
        </div>
        <Badge variant="outline" className="text-xs w-fit">
          {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''} • {selectedTemplateIds.length} template{selectedTemplateIds.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup">
            <Send className="h-4 w-4 mr-2" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Clock className="h-4 w-4 mr-2" />
            Scheduled Mails
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Email History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup" className="space-y-4">
          {/* Step 1: Select Mails and Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm md:text-base">1. Select Mails and Templates</CardTitle>
                  <CardDescription className="text-xs">
                    Select email addresses and templates for automated emails
                  </CardDescription>
                </div>
                {!showAddEmailInput && (
                  <Button
                    type="button"
                    onClick={() => setShowAddEmailInput(true)}
                    variant="outline"
                    size="sm"
                    className="bg-black text-white hover:bg-black/90 border-black"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddEmailInput && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEmail()
                      }
                      if (e.key === 'Escape') {
                        setShowAddEmailInput(false)
                        setNewEmail('')
                      }
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleAddEmail}
                      className="w-full sm:w-auto"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddEmailInput(false)
                        setNewEmail('')
                      }}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {isLoadingClients || isLoadingTemplates ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="inline-flex items-center justify-center w-12 h-12 mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                  <p className="text-sm font-medium">Loading data...</p>
                  <p className="text-xs mt-1">Please wait while we fetch clients and templates</p>
                </div>
              ) : emails.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={emails.length > 0 && emails.every(email => selectedEmails.has(email))}
                            onCheckedChange={(checked) => handleSelectAllEmails(checked as boolean)}
                            className="h-4 w-4"
                          />
                        </TableHead>
                        <TableHead className="min-w-[200px]">Email Address</TableHead>
                        {templates
                          .filter(template => {
                            // Exclude login templates
                            const isLogin = template.name.toLowerCase().includes('login') || 
                                          template.category === EmailTemplateCategory.LOGIN
                            return !isLogin
                          })
                          .map((template) => {
                            const isSelectedForAll = emails.length > 0 && emails.every(email => {
                              const selectedTemplates = emailTemplates[email] || new Set<number>()
                              return selectedTemplates.has(template.id)
                            })
                            return (
                              <TableHead key={template.id} className="min-w-[120px]">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isSelectedForAll}
                                    onCheckedChange={(checked) => handleSelectTemplateForAllEmails(template.id, checked as boolean)}
                                    className="h-4 w-4"
                                  />
                                  <Label className="text-xs font-medium cursor-pointer whitespace-nowrap">
                                    Select
                                  </Label>
                                </div>
                              </TableHead>
                            )
                          })}
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emails.map((email, index) => {
                        const selectedTemplates = emailTemplates[email] || new Set<number>()
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Checkbox
                                checked={selectedEmails.has(email)}
                                onCheckedChange={() => handleToggleEmailSelection(email)}
                                className="h-4 w-4"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span className="text-xs md:text-sm">{email}</span>
                                {selectedTemplates.size > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {selectedTemplates.size}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            {templates
                              .filter(template => {
                                // Exclude login templates
                                const isLogin = template.name.toLowerCase().includes('login') || 
                                              template.category === EmailTemplateCategory.LOGIN
                                return !isLogin
                              })
                              .map((template) => {
                                const isSelected = selectedTemplates.has(template.id)
                                return (
                                  <TableCell key={template.id}>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleEmailTemplate(email, template.id)}
                                        className="h-4 w-4"
                                      />
                                      <span className="text-xs">{template.name}</span>
                                    </div>
                                  </TableCell>
                                )
                              })}
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveEmail(index)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md bg-muted/30">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No emails added yet</p>
                  <p className="text-xs mt-1">Add email addresses to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Step 2: Schedule Emails */}
          {selectedTemplateIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm md:text-base">2. Schedule Emails</CardTitle>
                <CardDescription className="text-xs">
                  Set the date and time when emails should be sent automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => {
                    const relevantTemplates = categoryTemplates.filter(t => selectedTemplateIds.includes(t.id))
                    if (relevantTemplates.length === 0) return null
                    
                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <h4 className="text-xs md:text-sm font-semibold">{getCategoryLabel(category)}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {relevantTemplates.length}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {relevantTemplates.map((template) => {
                            const templateIdStr = template.id.toString()
                            const schedule = templateSchedules[templateIdStr] || {
                              dateType: 'single' as DateType,
                              scheduledDate: null,
                              scheduledDateFrom: null,
                              scheduledDateTo: null,
                              scheduledDates: [],
                              scheduledTimes: [''],
                            }
                            
                            const dateType = schedule.dateType || 'single'
                            const scheduledTimes = schedule.scheduledTimes || []
                            
                            return (
                              <div
                                key={template.id}
                                className="p-3 md:p-4 border rounded-md bg-card hover:bg-muted/50 transition-all"
                              >
                                <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
                                  {/* Template Name and Date Type */}
                                  <div className="flex flex-col md:flex-row md:items-start gap-3 flex-1 min-w-0">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs md:text-sm font-medium">{template.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {template.subject}
                                      </p>
                                    </div>
                                    
                                    <div className="w-full md:w-auto md:min-w-[140px]">
                                      <Select
                                        value={dateType}
                                        onValueChange={(value) => handleDateTypeChange(template.id, value as DateType)}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="all">All Dates</SelectItem>
                                          <SelectItem value="range">Date Range (From - To)</SelectItem>
                                          <SelectItem value="range_multiple">Multiple Specific Dates</SelectItem>
                                          <SelectItem value="single">Single Date</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  
                                  {/* Date Picker(s) */}
                                  <div className="w-full md:flex-1 md:min-w-0">
                                    {dateType === 'all' && (
                                      <div className="flex items-center px-3 py-2 border rounded-md bg-muted/30 text-xs md:text-sm text-muted-foreground">
                                        All dates
                                      </div>
                                    )}
                                    
                                    {dateType === 'range' && (
                                      <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="flex-1 w-full">
                                          <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant="outline"
                                                className="w-full justify-start text-left font-normal h-9 text-xs md:text-sm"
                                              >
                                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                                {schedule.scheduledDateFrom ? (
                                                  format(schedule.scheduledDateFrom, 'MMM dd, yyyy')
                                                ) : (
                                                  <span className="text-muted-foreground">From</span>
                                                )}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                              <Calendar
                                                mode="single"
                                                selected={schedule.scheduledDateFrom || undefined}
                                                onSelect={(date) => handleScheduleDateFromChange(template.id, date)}
                                                disabled={(date) => isBeforeToday(date)}
                                                initialFocus
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                        <div className="flex-1 w-full">
                                          <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant="outline"
                                                className="w-full justify-start text-left font-normal h-9 text-xs md:text-sm"
                                              >
                                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                                {schedule.scheduledDateTo ? (
                                                  format(schedule.scheduledDateTo, 'MMM dd, yyyy')
                                                ) : (
                                                  <span className="text-muted-foreground">To</span>
                                                )}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                              <Calendar
                                                mode="single"
                                                selected={schedule.scheduledDateTo || undefined}
                                                onSelect={(date) => handleScheduleDateToChange(template.id, date)}
                                                disabled={(date) => {
                                                  const fromDate = schedule.scheduledDateFrom
                                                  return isBeforeToday(date) || (fromDate ? date < fromDate : false)
                                                }}
                                                initialFocus
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>
                                    )}

                                    {dateType === 'range_multiple' && (
                                      <div className="w-full space-y-2">
                                        <Label className="text-xs text-muted-foreground mb-1 block">Select Multiple Dates</Label>
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              className="w-full justify-start text-left font-normal h-9 text-xs md:text-sm"
                                            >
                                              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                              {schedule.scheduledDates && schedule.scheduledDates.length > 0 ? (
                                                <span>{schedule.scheduledDates.length} date{schedule.scheduledDates.length !== 1 ? 's' : ''} selected</span>
                                              ) : (
                                                <span className="text-muted-foreground">Select dates</span>
                                              )}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                              mode="multiple"
                                              selected={schedule.scheduledDates || []}
                                              onSelect={(dates) => handleScheduleDatesChange(template.id, dates)}
                                              disabled={(date) => isBeforeToday(date)}
                                              initialFocus
                                            />
                                          </PopoverContent>
                                        </Popover>
                                        {schedule.scheduledDates && schedule.scheduledDates.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {schedule.scheduledDates
                                              .sort((a, b) => a.getTime() - b.getTime())
                                              .map((date, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                  {format(date, 'MMM dd, yyyy')}
                                                </Badge>
                                              ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {dateType === 'single' && (
                                      <div className="w-full">
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              className="w-full justify-start text-left font-normal h-9 text-xs md:text-sm"
                                            >
                                              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                              {schedule.scheduledDate ? (
                                                format(schedule.scheduledDate, 'MMM dd, yyyy')
                                              ) : (
                                                <span className="text-muted-foreground">Pick a date</span>
                                              )}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                              mode="single"
                                              selected={schedule.scheduledDate || undefined}
                                              onSelect={(date) => handleScheduleDateChange(template.id, date)}
                                              disabled={(date) => isBeforeToday(date)}
                                              initialFocus
                                            />
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Time Pickers */}
                                  {dateType !== 'all' && (
                                    <div className="w-full md:flex-1 md:min-w-0">
                                      <Label className="text-xs text-muted-foreground mb-2 block">Times:</Label>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {scheduledTimes.length > 0 ? (
                                          scheduledTimes.map((time, index) => (
                                            <div key={index} className="flex items-center gap-1">
                                              <div className="relative">
                                                <Input
                                                  type="time"
                                                  value={time}
                                                  onChange={(e) => handleTimeChange(template.id, index, e.target.value)}
                                                  className="h-9 w-[110px] md:w-[120px] text-xs"
                                                />
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveTime(template.id, index)}
                                                className="h-9 w-9 p-0 shrink-0"
                                              >
                                                <Trash2Icon className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-xs text-muted-foreground">No times added</p>
                                        )}
                                        <Button 
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleAddTime(template.id)}
                                          className="h-9 px-2 shrink-0"
                                        >
                                          <PlusIcon className="h-3.5 w-3.5 mr-1" />
                                          <span className="text-xs">Add</span>
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Save Button */}
          <div className="flex justify-end items-center pt-4 border-t gap-3">
            <Button 
              onClick={handleSave} 
              className="bg-primary w-full md:w-auto md:min-w-[150px]"
              disabled={isSaving || selectedEmails.size === 0 || selectedTemplateIds.length === 0}
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm md:text-base">Scheduled Mails</CardTitle>
                <CardDescription className="text-xs">
                  View all pending scheduled emails with countdown timers
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingScheduled ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs md:text-sm font-medium">Loading scheduled mails...</p>
                </div>
              ) : scheduledMails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md bg-muted/30">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No scheduled mails found</p>
                  <p className="text-xs mt-1">Pending scheduled emails will appear here</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sno</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead>Scheduled Time</TableHead>
                        <TableHead>Remaining Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                      <TableBody>
                        {scheduledMails
                          .slice((scheduledMailsPage - 1) * scheduledMailsPageSize, scheduledMailsPage * scheduledMailsPageSize)
                          .map((email, index) => {
                            const sno = (scheduledMailsPage - 1) * scheduledMailsPageSize + index + 1
                            const timeRemaining = getTimeRemaining(email.scheduled_datetime)
                            const scheduledDate = new Date(email.scheduled_datetime)
                            
                            return (
                              <TableRow key={email.id}>
                                <TableCell>{sno}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {email.recipient_emails.map((recipient, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs w-fit">
                                        {recipient}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>{email.template_name || `Template #${email.template_id}`}</TableCell>
                                <TableCell>
                                  <div className="text-xs">
                                    {format(new Date(email.scheduled_date), 'MMM dd, yyyy')}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-xs">
                                    {email.scheduled_time}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="secondary"
                                    className="font-mono"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    {timeRemaining}
                                  </Badge>
                                </TableCell>
                                <TableCell>{getStatusBadge(email.status)}</TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  {scheduledMails.length > scheduledMailsPageSize && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-xs text-muted-foreground">
                        Showing {(scheduledMailsPage - 1) * scheduledMailsPageSize + 1} to {Math.min(scheduledMailsPage * scheduledMailsPageSize, scheduledMails.length)} of {scheduledMails.length} scheduled mails
                      </div>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setScheduledMailsPage(prev => Math.max(1, prev - 1))}
                              className={scheduledMailsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          {(() => {
                            const totalPages = Math.ceil(scheduledMails.length / scheduledMailsPageSize)
                            const pages: (number | string)[] = []
                            
                            // Always show first page
                            pages.push(1)
                            
                            // Show ellipsis if needed
                            if (scheduledMailsPage > 3) {
                              pages.push('ellipsis-start')
                            }
                            
                            // Show pages around current page
                            for (let i = Math.max(2, scheduledMailsPage - 1); i <= Math.min(totalPages - 1, scheduledMailsPage + 1); i++) {
                              if (i !== 1 && i !== totalPages) {
                                pages.push(i)
                              }
                            }
                            
                            // Show ellipsis if needed
                            if (scheduledMailsPage < totalPages - 2) {
                              pages.push('ellipsis-end')
                            }
                            
                            // Always show last page if more than 1 page
                            if (totalPages > 1) {
                              pages.push(totalPages)
                            }
                            
                            return pages.map((page, idx) => {
                              if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                                return (
                                  <PaginationItem key={`ellipsis-${idx}`}>
                                    <span className="px-2">...</span>
                                  </PaginationItem>
                                )
                              }
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setScheduledMailsPage(page as number)}
                                    isActive={scheduledMailsPage === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            })
                          })()}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setScheduledMailsPage(prev => Math.min(Math.ceil(scheduledMails.length / scheduledMailsPageSize), prev + 1))}
                              className={scheduledMailsPage >= Math.ceil(scheduledMails.length / scheduledMailsPageSize) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm md:text-base">Email History</CardTitle>
                  <CardDescription className="text-xs">
                    View all sent and scheduled emails across all clients
                  </CardDescription>
                </div>
                <Select
                  value={historyStatusFilter}
                  onValueChange={(value) => setHistoryStatusFilter(value as any)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs md:text-sm font-medium">Loading history...</p>
                </div>
              ) : emailHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md bg-muted/30">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No email history found</p>
                  <p className="text-xs mt-1">Sent and scheduled emails will appear here</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sno</TableHead>
                          <TableHead>Recipients</TableHead>
                          <TableHead>Template</TableHead>
                          <TableHead>Scheduled Date</TableHead>
                          <TableHead>Scheduled Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sent At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailHistory
                          .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                          .map((email, index) => {
                            const sno = (historyPage - 1) * historyPageSize + index + 1
                            
                            return (
                              <TableRow key={email.id}>
                                <TableCell>{sno}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {email.recipient_emails.map((recipient, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs w-fit">
                                        {recipient}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>{email.template_name || `Template #${email.template_id}`}</TableCell>
                                <TableCell>
                                  <div className="text-xs">
                                    {format(new Date(email.scheduled_date), 'MMM dd, yyyy')}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-xs">
                                    {email.scheduled_time}
                                  </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(email.status)}</TableCell>
                                <TableCell>
                                  {email.sent_at ? (
                                    <div className="text-xs">
                                      {format(new Date(email.sent_at), 'MMM dd, yyyy HH:mm')}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  {emailHistory.length > 0 && (
                    <TablePagination
                      totalItems={emailHistory.length}
                      currentPage={historyPage}
                      pageSize={historyPageSize}
                      onPageChange={setHistoryPage}
                      onPageSizeChange={(size) => {
                        setHistoryPageSize(size)
                        setHistoryPage(1) // Reset to first page when page size changes
                      }}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
