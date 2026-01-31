'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  Trash2Icon, 
  Mail, 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Clock
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
import { 
  getOrgEmailTemplates, 
  getMasterEmailTemplates, 
  getEmailConfig,
  createEmailConfig,
  updateEmailConfig,
  deleteEmailFromConfig,
  deleteEmailConfig,
  type EmailTemplate, 
  EmailTemplateCategory,
  type EmailConfig as EmailConfigType,
  type DateType,
  ApiError,
} from '@/lib/api/index'
import { format } from 'date-fns'

export interface EmailSchedule {
  templateId?: number | null
  templateName?: string
  scheduledDate?: Date | null
  scheduledTime?: string
}

export interface ServiceEmailConfig {
  enabled: boolean
  templateId?: number | null
  templateName?: string
  dateType?: DateType
  scheduledDate?: Date | null
  scheduledDateFrom?: Date | null
  scheduledDateTo?: Date | null
  scheduledDates?: Date[] // Multiple specific dates for date range
  scheduledTimes?: string[] // Multiple time slots
}

export interface EmailTemplateSelection {
  email: string
  selectedTemplates: number[] // Array of template IDs
}

export interface EmailConfig {
  emails: string[]
  emailTemplates: Record<string, EmailTemplateSelection> // Key is email address
  services: Record<string, ServiceEmailConfig>
}

interface EmailSetupProps {
  clientId: string | number
  clientName?: string
  initialEmails?: EmailConfig
  onSave?: (emails: EmailConfig) => void | Promise<void>
}

export function EmailSetup({ 
  clientId,
  clientName = '',
  initialEmails,
  onSave
}: EmailSetupProps) {
  const { toast } = useToast()
  
  // Email configuration state
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(
    initialEmails || {
      emails: [],
      emailTemplates: {},
      services: {},
    }
  )

  // Template state
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  // Track which emails are selected for sending
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())

  // Fetch email templates and config on mount
  useEffect(() => {
    fetchTemplates()
    fetchEmailConfig()
  }, [clientId])

  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true)
      const [orgResponse, masterResponse] = await Promise.all([
        getOrgEmailTemplates({ limit: 1000 }),
        getMasterEmailTemplates({ limit: 1000 })
      ])

      // listTemplates returns array directly; some APIs return { templates: array }
      const orgTemplates = Array.isArray(orgResponse)
        ? orgResponse
        : (Array.isArray(orgResponse?.templates) ? orgResponse.templates : [])
      const masterTemplates = Array.isArray(masterResponse)
        ? masterResponse
        : (Array.isArray(masterResponse?.templates) ? masterResponse.templates : [])

      // Combine org and master templates, prioritizing org templates
      const allTemplates = [
        ...orgTemplates,
        ...masterTemplates.filter(
          mt => !orgTemplates.some(ot => ot.type === mt.type && ot.category === mt.category)
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

  const fetchEmailConfig = async () => {
    if (!clientId) return
    
    try {
      setIsLoadingConfig(true)
      const config = await getEmailConfig(clientId)
      
      if (config) {
        // Transform API response to component format (convert ISO date strings to Date objects)
        // Helper function to safely parse dates and avoid timezone issues
        const parseDate = (dateString: string | null | undefined): Date | null => {
          if (!dateString) return null
          // Parse date string (YYYY-MM-DD format) and create Date in local timezone
          const [year, month, day] = dateString.split('-').map(Number)
          if (isNaN(year) || isNaN(month) || isNaN(day)) return null
          // Create date in local timezone (month is 0-indexed in Date constructor)
          const date = new Date(year, month - 1, day)
          // Validate the date
          if (isNaN(date.getTime())) return null
          return date
        }
        
        const transformedConfig: EmailConfig = {
          emails: config.emails,
          emailTemplates: config.emailTemplates,
          services: Object.fromEntries(
            Object.entries(config.services).map(([key, service]) => {
              // Parse scheduledDates array if it exists
              let scheduledDates: Date[] | undefined = undefined
              if (service.scheduledDates && Array.isArray(service.scheduledDates)) {
                scheduledDates = service.scheduledDates
                  .map((dateStr: string | Date) => {
                    if (dateStr instanceof Date) return dateStr
                    return parseDate(dateStr)
                  })
                  .filter((date): date is Date => date !== null)
              }
              
              return [
                key,
                {
                  ...service,
                  scheduledDate: parseDate(service.scheduledDate),
                  scheduledDateFrom: parseDate(service.scheduledDateFrom),
                  scheduledDateTo: parseDate(service.scheduledDateTo),
                  scheduledDates,
                },
              ]
            })
          ),
        }
        
        // Initialize selected emails - select all by default when loading config
        setSelectedEmails(new Set(config.emails))
        console.log('Loaded email config from API:', {
          services: Object.fromEntries(
            Object.entries(transformedConfig.services).map(([key, service]) => [
              key,
              {
                scheduledDate: service.scheduledDate?.toISOString().split('T')[0],
                scheduledDateFrom: service.scheduledDateFrom?.toISOString().split('T')[0],
                scheduledDateTo: service.scheduledDateTo?.toISOString().split('T')[0],
              }
            ])
          )
        })
        setEmailConfig(transformedConfig)
      }
    } catch (error) {
      console.error('Error fetching email config:', error)
      // Don't show error toast - it's fine if config doesn't exist yet
    } finally {
      setIsLoadingConfig(false)
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

    if (emailConfig.emails.includes(email)) {
        toast({
          title: 'Duplicate Email',
          description: 'This email is already added',
          variant: 'destructive',
        })
      return
    }

    setEmailConfig(prev => ({
      ...prev,
      emails: [...prev.emails, email],
      emailTemplates: {
        ...prev.emailTemplates,
        [email]: {
          email,
          selectedTemplates: [],
        }
      }
    }))
    
    // Auto-select newly added email for sending
    setSelectedEmails(prev => new Set([...prev, email]))
    
    setNewEmail('')
  }

  const handleRemoveEmail = async (index: number) => {
    const emailToRemove = emailConfig.emails[index]
    
    // Update local state first (optimistic update)
    const updatedConfig: EmailConfig = {
      ...emailConfig,
      emails: emailConfig.emails.filter((_, i) => i !== index),
      emailTemplates: (() => {
        const { [emailToRemove]: removed, ...emailTemplates } = emailConfig.emailTemplates
        return emailTemplates
      })(),
    }
    
    setEmailConfig(updatedConfig)
    
    // Remove from selected emails
    setSelectedEmails(prev => {
      const newSet = new Set(prev)
      newSet.delete(emailToRemove)
      return newSet
    })
    
    // Delete email from database using dedicated DELETE endpoint
    if (clientId) {
      try {
        await deleteEmailFromConfig(clientId, emailToRemove)
        toast({
          title: 'Email Removed',
          description: `${emailToRemove} has been removed from the configuration`,
          variant: 'success',
        })
      } catch (error: any) {
        console.error('Error removing email from database:', error)
        // Revert the state change on error
        setEmailConfig(emailConfig)
        
        let errorMessage = 'Failed to remove email from database'
        if (error instanceof ApiError) {
          const detail = error.detail as any
          if (typeof detail === 'string') {
            errorMessage = detail
          } else if (detail && typeof detail === 'object') {
            const detailObj = detail as Record<string, any>
            errorMessage = detailObj.detail || detailObj.message || JSON.stringify(detail)
          }
        } else if (error?.message) {
          errorMessage = error.message
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } else {
      // No clientId - just show success message
      toast({
        title: 'Email Removed',
        description: `${emailToRemove} has been removed`,
        variant: 'success',
      })
    }
  }

  const handleToggleEmailTemplate = (email: string, templateId: number) => {
    setEmailConfig(prev => {
      const emailTemplate = prev.emailTemplates[email] || { email, selectedTemplates: [] }
      const isSelected = emailTemplate.selectedTemplates.includes(templateId)
      const template = templates.find(t => t.id === templateId)
      
      // Update email templates
      const updatedEmailTemplates = {
        ...prev.emailTemplates,
        [email]: {
          ...emailTemplate,
          selectedTemplates: isSelected
            ? emailTemplate.selectedTemplates.filter(id => id !== templateId)
            : [...emailTemplate.selectedTemplates, templateId]
        }
      }
      
      // Update services for scheduling (initialize if not exists)
      const templateIdStr = templateId.toString()
      const existingService = prev.services[templateIdStr]
      
      return {
        ...prev,
        emailTemplates: updatedEmailTemplates,
        services: {
          ...prev.services,
          [templateIdStr]: existingService || {
            enabled: true,
            templateId,
            templateName: template?.name || undefined,
            dateType: 'single',
            scheduledDate: null,
            scheduledTimes: [],
          }
        }
      }
    })
  }

  const handleToggleService = (templateId: number, templateName: string) => {
    const templateIdStr = templateId.toString()
    const isEnabled = emailConfig.services[templateIdStr]?.enabled || false

    setEmailConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [templateIdStr]: {
          enabled: !isEnabled,
          templateId: !isEnabled ? templateId : null,
          templateName: !isEnabled ? templateName : undefined,
          scheduledDate: !isEnabled ? null : prev.services[templateIdStr]?.scheduledDate || null,
          scheduledTimes: !isEnabled ? [] : prev.services[templateIdStr]?.scheduledTimes || [],
        }
      }
    }))
  }

  const handleDateTypeChange = (templateId: number, dateType: DateType) => {
    const templateIdStr = templateId.toString()
    const template = templates.find(t => t.id === templateId)
    setEmailConfig(prev => {
      const existingService = prev.services[templateIdStr]
      return {
        ...prev,
        services: {
          ...prev.services,
          [templateIdStr]: {
            ...(existingService || {
              enabled: true,
              templateId,
              templateName: template?.name || undefined,
              scheduledTimes: [],
            }),
            dateType,
            scheduledDate: null,
            scheduledDateFrom: null,
            scheduledDateTo: null,
            scheduledDates: dateType === 'range_multiple' ? [] : undefined,
          }
        }
      }
    })
  }

  const handleScheduleDateChange = (templateId: number, date: Date | undefined) => {
    const templateIdStr = templateId.toString()
    const template = templates.find(t => t.id === templateId)
    console.log('handleScheduleDateChange called:', {
      templateId,
      date: date ? format(date, 'yyyy-MM-dd') : 'null/undefined',
      dateObject: date
    })
    setEmailConfig(prev => {
      const existingService = prev.services[templateIdStr]
      const newService = {
        ...(existingService || {
          enabled: true,
          templateId,
          templateName: template?.name || undefined,
          dateType: 'single',
          scheduledTimes: [],
        }),
        scheduledDate: date || null,
        // Clear range dates when single date is set
        scheduledDateFrom: null,
        scheduledDateTo: null,
      }
      console.log('Updating service date:', {
        templateId,
        oldDate: existingService?.scheduledDate ? format(existingService.scheduledDate, 'yyyy-MM-dd') : 'none',
        newDate: date ? format(date, 'yyyy-MM-dd') : 'null'
      })
      return {
        ...prev,
        services: {
          ...prev.services,
          [templateIdStr]: newService
        }
      }
    })
  }

  const handleScheduleDateFromChange = (templateId: number, date: Date | undefined) => {
    const templateIdStr = templateId.toString()
    const template = templates.find(t => t.id === templateId)
    console.log('handleScheduleDateFromChange called:', {
      templateId,
      date: date ? format(date, 'yyyy-MM-dd') : 'null/undefined'
    })
    setEmailConfig(prev => {
      const existingService = prev.services[templateIdStr]
      const newService = {
        ...(existingService || {
          enabled: true,
          templateId,
          templateName: template?.name || undefined,
          dateType: 'range',
          scheduledTimes: [],
        }),
        scheduledDateFrom: date || null,
        // Clear single date when range date is set
        scheduledDate: null,
      }
      return {
        ...prev,
        services: {
          ...prev.services,
          [templateIdStr]: newService
        }
      }
    })
  }

  const handleScheduleDateToChange = (templateId: number, date: Date | undefined) => {
    const templateIdStr = templateId.toString()
    const template = templates.find(t => t.id === templateId)
    console.log('handleScheduleDateToChange called:', {
      templateId,
      date: date ? format(date, 'yyyy-MM-dd') : 'null/undefined'
    })
    setEmailConfig(prev => {
      const existingService = prev.services[templateIdStr]
      const newService = {
        ...(existingService || {
          enabled: true,
          templateId,
          templateName: template?.name || undefined,
          dateType: 'range',
          scheduledTimes: [],
        }),
        scheduledDateTo: date || null,
        // Clear single date when range date is set
        scheduledDate: null,
      }
      return {
        ...prev,
        services: {
          ...prev.services,
          [templateIdStr]: newService
        }
      }
    })
  }

  const handleScheduleDatesChange = (templateId: number, dates: Date[] | undefined) => {
    const templateIdStr = templateId.toString()
    const template = templates.find(t => t.id === templateId)
    setEmailConfig(prev => {
      const existingService = prev.services[templateIdStr]
      return {
        ...prev,
        services: {
          ...prev.services,
          [templateIdStr]: {
            ...(existingService || {
              enabled: true,
              templateId,
              templateName: template?.name || undefined,
              dateType: 'range',
              scheduledTimes: [],
            }),
            scheduledDates: dates || [],
            // Clear range dates when multiple dates are set
            scheduledDateFrom: null,
            scheduledDateTo: null,
            scheduledDate: null,
          }
        }
      }
    })
  }

  const handleAddTime = (templateId: number) => {
    const templateIdStr = templateId.toString()
    const template = templates.find(t => t.id === templateId)
    setEmailConfig(prev => {
      const existingService = prev.services[templateIdStr]
      const currentTimes = existingService?.scheduledTimes || []
      return {
        ...prev,
        services: {
          ...prev.services,
          [templateIdStr]: {
            ...(existingService || {
              enabled: true,
              templateId,
              templateName: template?.name || undefined,
              dateType: 'single',
            }),
            scheduledTimes: [...currentTimes, ''],
          }
        }
      }
    })
  }

  const handleTimeChange = (templateId: number, index: number, time: string) => {
    const templateIdStr = templateId.toString()
    setEmailConfig(prev => {
      const existingService = prev.services[templateIdStr]
      const currentTimes = existingService?.scheduledTimes || []
      const updatedTimes = [...currentTimes]
      updatedTimes[index] = time
      return {
        ...prev,
        services: {
          ...prev.services,
          [templateIdStr]: {
            ...existingService,
            scheduledTimes: updatedTimes,
          }
        }
      }
    })
  }

  const handleRemoveTime = (templateId: number, index: number) => {
    const templateIdStr = templateId.toString()
    setEmailConfig(prev => {
      const existingService = prev.services[templateIdStr]
      const currentTimes = existingService?.scheduledTimes || []
      return {
        ...prev,
        services: {
          ...prev.services,
          [templateIdStr]: {
            ...existingService,
            scheduledTimes: currentTimes.filter((_, i) => i !== index),
          }
        }
      }
    })
  }

  const handleDeleteConfig = async () => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'Client ID is required',
        variant: 'destructive',
      })
      return
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete the entire email configuration? This will remove all emails, templates, and scheduled emails. This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteEmailConfig(clientId)
      
      // Clear local state
      setEmailConfig({
        emails: [],
        emailTemplates: {},
        services: {},
      })
      
      toast({
        title: 'Success',
        description: 'Email configuration deleted successfully',
        variant: 'success',
      })
    } catch (error: any) {
      console.error('Error deleting email config:', error)
      
      let errorMessage = 'Failed to delete email configuration'
      if (error instanceof ApiError) {
        const detail: any = error.detail
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (detail && typeof detail === 'object') {
          errorMessage = (detail as Record<string, any>).detail || (detail as Record<string, any>).message || JSON.stringify(detail)
        }
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
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

  const handleSave = async () => {
    if (emailConfig.emails.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one email address',
        variant: 'destructive',
      })
      return
    }

    // Check if at least one email is selected
    if (selectedEmails.size === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one email address to send mail to',
        variant: 'destructive',
      })
      return
    }

    // Validate schedules for enabled services
    for (const [templateId, service] of Object.entries(emailConfig.services)) {
      if (service.enabled) {
        const template = templates.find(t => t.id === parseInt(templateId))
        const dateType = service.dateType || 'single'
        
        // Validate date based on type (skip validation for 'all' dateType)
        if (dateType === 'single' && !service.scheduledDate) {
          toast({
            title: 'Validation Error',
            description: `Please set date for ${template?.name || 'selected service'}`,
            variant: 'destructive',
          })
          return
        }
        
        if (dateType === 'range' && (!service.scheduledDateFrom || !service.scheduledDateTo)) {
          toast({
            title: 'Validation Error',
            description: `Please set both from and to dates for ${template?.name || 'selected service'}`,
            variant: 'destructive',
          })
          return
        }
        
        if (dateType === 'range_multiple' && (!service.scheduledDates || service.scheduledDates.length === 0)) {
          toast({
            title: 'Validation Error',
            description: `Please select at least one date for ${template?.name || 'selected service'}`,
            variant: 'destructive',
          })
          return
        }
        
        // Validate times (skip for 'all' if no times set, but validate if times are set)
        if (dateType !== 'all' && (!service.scheduledTimes || service.scheduledTimes.length === 0 || service.scheduledTimes.some(t => !t))) {
          toast({
            title: 'Validation Error',
            description: `Please add at least one time for ${template?.name || 'selected service'}`,
            variant: 'destructive',
          })
          return
        }
      }
    }

    if (!clientId) {
      toast({
        title: 'Error',
        description: 'Client ID is required',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      // Filter to only include selected emails
      const selectedEmailsArray = Array.from(selectedEmails)
      const filteredEmailTemplates: Record<string, EmailTemplateSelection> = {}
      selectedEmailsArray.forEach(email => {
        if (emailConfig.emailTemplates[email]) {
          filteredEmailTemplates[email] = emailConfig.emailTemplates[email]
        }
      })

      // Get all selected template IDs from selected emails only
      const selectedTemplateIds = new Set<number>()
      Object.values(filteredEmailTemplates).forEach(emailTemplate => {
        emailTemplate.selectedTemplates.forEach(templateId => {
          selectedTemplateIds.add(templateId)
        })
      })
      
      // Helper function to safely format dates
      const formatDate = (date: Date | null | undefined): string | null => {
        if (!date) return null
        // Ensure it's a Date object
        const dateObj = date instanceof Date ? date : new Date(date)
        // Check if date is valid
        if (isNaN(dateObj.getTime())) return null
        // Format as YYYY-MM-DD in local timezone
        return format(dateObj, 'yyyy-MM-dd')
      }
      
      // Only include services for templates that are selected in at least one email
      const filteredServices = Object.fromEntries(
        Object.entries(emailConfig.services)
          .filter(([templateIdStr]) => {
            const templateId = parseInt(templateIdStr)
            return selectedTemplateIds.has(templateId)
          })
          .map(([key, service]) => {
            const formattedService: any = {
              ...service,
              // Only include date fields if they are actually set (not null/undefined)
              scheduledDate: formatDate(service.scheduledDate),
              scheduledDateFrom: formatDate(service.scheduledDateFrom),
              scheduledDateTo: formatDate(service.scheduledDateTo),
            }
            
            // Format scheduledDates array for range_multiple
            if (service.dateType === 'range_multiple' && service.scheduledDates && service.scheduledDates.length > 0) {
              formattedService.scheduledDates = service.scheduledDates
                .map(date => formatDate(date))
                .filter((date): date is string => date !== null)
            }
            
            return [key, formattedService]
          })
      )
      
      // Convert Date objects to ISO date strings for API
      // Ensure we're using the current state values, not stale data
      // Only include selected emails in the configuration
      const apiConfig: EmailConfigType = {
        emails: selectedEmailsArray,
        emailTemplates: filteredEmailTemplates,
        services: filteredServices,
      }
      
      // Log the current state before sending to help debug
      console.log('Current emailConfig state before save:', {
        services: Object.fromEntries(
          Object.entries(emailConfig.services).map(([key, service]) => [
            key,
            {
              scheduledDate: service.scheduledDate,
              scheduledDateFrom: service.scheduledDateFrom,
              scheduledDateTo: service.scheduledDateTo,
              dateType: service.dateType,
            }
          ])
        )
      })

      // Log the config being sent for debugging (remove sensitive data if any)
      console.log('Saving email config for client:', clientId, 'Config:', JSON.stringify(apiConfig, null, 2))

      // Try to update first, if it fails with 404, create new
      let savedConfig: EmailConfigType
      try {
        savedConfig = await updateEmailConfig(clientId, apiConfig)
      } catch (updateError: any) {
        // Extract error information more robustly
        const errorStatus = updateError instanceof ApiError 
          ? updateError.status 
          : updateError?.status || updateError?.response?.status || updateError?.statusCode
        
        const errorDetail = updateError instanceof ApiError
          ? updateError.detail
          : updateError?.detail || updateError?.message || updateError?.error || String(updateError)
        
        // Check if error is 404 - config doesn't exist, create new one
        const is404 = errorStatus === 404
        
        if (is404) {
          // Config doesn't exist, create new one
          console.log('Config not found (404), creating new configuration')
          savedConfig = await createEmailConfig(clientId, apiConfig)
        } else {
          // Log the error details for debugging
          console.error('Update error (not 404):', {
            status: errorStatus,
            detail: errorDetail,
            message: updateError?.message,
            errorType: updateError?.constructor?.name,
            isApiError: updateError instanceof ApiError,
            fullError: updateError,
            // Try to get more info from the error object
            errorKeys: updateError ? Object.keys(updateError) : [],
            errorString: String(updateError),
            errorJSON: updateError ? JSON.stringify(updateError, Object.getOwnPropertyNames(updateError)) : 'N/A'
          })
          throw updateError
        }
      }

      // Convert ISO date strings back to Date objects for component state
      const transformedConfig: EmailConfig = {
        emails: savedConfig.emails,
        emailTemplates: savedConfig.emailTemplates,
        services: Object.fromEntries(
          Object.entries(savedConfig.services).map(([key, service]) => {
            // Parse scheduledDates array if it exists
            let scheduledDates: Date[] | undefined = undefined
            if (service.scheduledDates && Array.isArray(service.scheduledDates)) {
              const parseDate = (dateString: string | null | undefined): Date | null => {
                if (!dateString) return null
                const [year, month, day] = dateString.split('-').map(Number)
                if (isNaN(year) || isNaN(month) || isNaN(day)) return null
                const date = new Date(year, month - 1, day)
                if (isNaN(date.getTime())) return null
                return date
              }
              scheduledDates = service.scheduledDates
                .map((dateStr: string) => parseDate(dateStr))
                .filter((date): date is Date => date !== null)
            }
            
            return [
              key,
              {
                ...service,
                scheduledDate: service.scheduledDate ? new Date(service.scheduledDate) : null,
                scheduledDateFrom: service.scheduledDateFrom ? new Date(service.scheduledDateFrom) : null,
                scheduledDateTo: service.scheduledDateTo ? new Date(service.scheduledDateTo) : null,
                scheduledDates,
              },
            ]
          })
        ),
      }

      // Update local state with saved config
      setEmailConfig(transformedConfig)

      // Reset schedule emails after saving - create config with cleared schedules
      const resetConfig: EmailConfig = {
        ...transformedConfig,
        services: Object.fromEntries(
          Object.entries(transformedConfig.services).map(([key, service]) => [
            key,
            {
              ...service,
              scheduledDate: null,
              scheduledDateFrom: null,
              scheduledDateTo: null,
              scheduledDates: [],
              scheduledTimes: [],
            },
          ])
        ),
      }

      // Save the reset config to backend
      const resetApiConfig: EmailConfigType = {
        emails: resetConfig.emails,
        emailTemplates: resetConfig.emailTemplates,
        services: Object.fromEntries(
          Object.entries(resetConfig.services).map(([key, service]) => [
            key,
            {
              ...service,
              scheduledDate: null,
              scheduledDateFrom: null,
              scheduledDateTo: null,
              scheduledDates: [],
              scheduledTimes: [],
            },
          ])
        ),
      }

      // Update the backend with reset schedules
      try {
        await updateEmailConfig(clientId, resetApiConfig)
        setEmailConfig(resetConfig)
      } catch (error) {
        console.error('Error resetting schedules:', error)
        // Still update local state even if backend update fails
        setEmailConfig(resetConfig)
      }

      // Call optional onSave callback
      if (onSave) {
        await onSave(resetConfig)
      }

      toast({
        title: 'Success',
        description: 'Email configuration saved successfully. Schedule emails have been reset.',
        variant: 'success',
      })
    } catch (error: any) {
      console.error('Error saving email config:', error)
      
      // Extract error message with more detail
      // Handle cases where error.detail might be an object
      let errorMessage = 'Failed to save email configuration'
      
      if (error instanceof ApiError) {
        const detail = error.detail as any // ApiError.detail is typed as string but can be object at runtime
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (detail && typeof detail === 'object') {
          // If detail is an object, try to extract a meaningful message
          const detailObj = detail as Record<string, any>
          if (detailObj.errors && typeof detailObj.errors === 'object') {
            // Handle validation errors object
            const errorMessages = Object.entries(detailObj.errors)
              .map(([key, value]) => {
                if (Array.isArray(value)) {
                  return `${key}: ${value.join(', ')}`
                }
                return `${key}: ${String(value)}`
              })
              .join('; ')
            errorMessage = errorMessages || detailObj.detail || String(detail)
          } else {
            errorMessage = detailObj.detail || detailObj.message || JSON.stringify(detail)
          }
        } else {
          errorMessage = error.message || `Server error (${error.status})`
        }
      } else if (error?.detail) {
        // Handle non-ApiError with detail property
        if (typeof error.detail === 'string') {
          errorMessage = error.detail
        } else if (error.detail.errors && typeof error.detail.errors === 'object') {
          const errorMessages = Object.entries(error.detail.errors)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`
              }
              return `${key}: ${String(value)}`
            })
            .join('; ')
          errorMessage = errorMessages || error.detail.detail || JSON.stringify(error.detail)
        } else {
          errorMessage = error.detail.detail || error.detail.message || String(error.detail)
        }
      } else if (error?.message) {
        errorMessage = typeof error.message === 'string' ? error.message : String(error.message)
      } else if (error?.status) {
        errorMessage = `Server error (${error.status})`
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Group templates by category
  // Filter to show only login templates
  const loginTemplates = templates.filter(template => 
    template.category === EmailTemplateCategory.LOGIN || 
    template.name.toLowerCase().includes('login')
  )
  
  const templatesByCategory = loginTemplates.reduce((acc, template) => {
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

  // Helper function to get today's date at midnight for comparison
  const getTodayAtMidnight = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  // Helper function to check if a date is before today (excluding today)
  const isBeforeToday = (date: Date) => {
    const dateAtMidnight = new Date(date)
    dateAtMidnight.setHours(0, 0, 0, 0)
    return dateAtMidnight < getTodayAtMidnight()
  }

  // Get all selected templates from all emails
  const getAllSelectedTemplates = () => {
    const selectedTemplateIds = new Set<number>()
    Object.values(emailConfig.emailTemplates).forEach(emailTemplate => {
      emailTemplate.selectedTemplates.forEach(templateId => {
        selectedTemplateIds.add(templateId)
      })
    })
    return Array.from(selectedTemplateIds)
  }

  const selectedTemplateIds = getAllSelectedTemplates()

  return (
    <div className="space-y-4 md:space-y-6">
      {clientName && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">Email Configuration</h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Setup automated emails for {clientName}
            </p>
          </div>
          <Badge variant="outline" className="text-xs w-fit">
            {emailConfig.emails.length} email{emailConfig.emails.length !== 1 ? 's' : ''} • {selectedTemplateIds.length} template{selectedTemplateIds.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Step 1: Add Email IDs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">1. Add Email Addresses</CardTitle>
          <CardDescription className="text-xs">
            Add email addresses and select which ones should receive automated emails
          </CardDescription>
      </CardHeader>
        <CardContent className="space-y-4">
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
              }}
              className="flex-1"
            />
          <Button
            type="button"
              onClick={handleAddEmail}
              className="w-full sm:w-auto"
          >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add
          </Button>
        </div>

          {emailConfig.emails.length > 0 ? (
            <div className="space-y-3 max-h-[400px] md:max-h-[600px] overflow-y-auto">
              {emailConfig.emails.map((email, index) => {
                const emailTemplate = emailConfig.emailTemplates[email] || { email, selectedTemplates: [] }
                const selectedTemplates = emailTemplate.selectedTemplates
                
                return (
              <div
                key={index}
                    className="group p-3 md:p-4 border border-border rounded-md bg-card hover:bg-muted/50 transition-all"
              >
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                      {/* Email Address with Selection Checkbox */}
                      <div className="flex items-center justify-between gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Checkbox
                            checked={selectedEmails.has(email)}
                            onCheckedChange={() => handleToggleEmailSelection(email)}
                            className="h-4 w-4 shrink-0"
                          />
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-xs md:text-sm font-medium truncate">{email}</span>
                          {selectedTemplates.length > 0 && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {selectedTemplates.length}
                            </Badge>
                          )}
                        </div>
                        {/* Remove Button - Visible on mobile, hover on desktop */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEmail(index)}
                          className="md:opacity-0 md:group-hover:opacity-100 h-8 w-8 p-0 shrink-0"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Template Selection */}
                      <div className="flex-1 min-w-0 w-full md:w-auto">
                        <div className="flex flex-wrap gap-2 items-center">
                          {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => 
                            categoryTemplates.map((template) => {
                              const isSelected = selectedTemplates.includes(template.id)
                              return (
                                <div
                                  key={template.id}
                                  className="flex items-center gap-1.5 px-2 py-1 md:py-1.5 border rounded-md hover:bg-muted/50 transition-all cursor-pointer"
                                  onClick={() => handleToggleEmailTemplate(email, template.id)}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleToggleEmailTemplate(email, template.id)}
                                    className="h-3.5 w-3.5"
                                  />
                                  <Label className="text-xs cursor-pointer whitespace-nowrap">
                                    {template.name}
                                  </Label>
                                </div>
                              )
                            })
                          )}
                        </div>
                </div>
              </div>
                  </div>
                )
              })}
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

      {/* Step 2: Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">2. Schedule Emails</CardTitle>
          <CardDescription className="text-xs">
            Set the date and time when emails should be sent automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <Mail className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-3 opacity-50" />
              <p className="text-xs md:text-sm font-medium">
                {isLoadingTemplates ? 'Loading templates...' : 'No templates available'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                    <h4 className="text-xs md:text-sm font-semibold">{getCategoryLabel(category)}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {categoryTemplates.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {categoryTemplates.map((template) => {
                      const templateIdStr = template.id.toString()
                      const service = emailConfig.services[templateIdStr] || {
                        enabled: false,
                        templateId: template.id,
                        templateName: template.name,
                        dateType: 'single' as DateType,
                        scheduledDate: null,
                        scheduledDateFrom: null,
                        scheduledDateTo: null,
                        scheduledDates: [],
                        scheduledTimes: [],
                      }

                      const dateType = service.dateType || 'single'
                      const scheduledTimes = service.scheduledTimes || []

  return (
                        <div
                          key={template.id}
                          className="p-3 md:p-4 border rounded-md bg-card hover:bg-muted/50 transition-all"
                        >
                          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
                            {/* Template Name and Date Type - Row on desktop, stacked on mobile */}
                            <div className="flex flex-col md:flex-row md:items-start gap-3 flex-1 min-w-0">
                              {/* Template Name */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs md:text-sm font-medium">{template.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {template.subject}
                                </p>
                              </div>

                              {/* Date Type Selector */}
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

                            {/* Date Picker(s) based on type */}
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
                                          {service.scheduledDateFrom ? (
                                            format(service.scheduledDateFrom, 'MMM dd, yyyy')
                                          ) : (
                                            <span className="text-muted-foreground">From</span>
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={service.scheduledDateFrom || undefined}
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
                                          {service.scheduledDateTo ? (
                                            format(service.scheduledDateTo, 'MMM dd, yyyy')
                                          ) : (
                                            <span className="text-muted-foreground">To</span>
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={service.scheduledDateTo || undefined}
                                          onSelect={(date) => handleScheduleDateToChange(template.id, date)}
                                          disabled={(date) => {
                                            const fromDate = service.scheduledDateFrom
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
                                        {service.scheduledDates && service.scheduledDates.length > 0 ? (
                                          <span>{service.scheduledDates.length} date{service.scheduledDates.length !== 1 ? 's' : ''} selected</span>
                                        ) : (
                                          <span className="text-muted-foreground">Select dates</span>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="multiple"
                                        selected={service.scheduledDates || []}
                                        onSelect={(dates) => handleScheduleDatesChange(template.id, dates)}
                                        disabled={(date) => isBeforeToday(date)}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  {service.scheduledDates && service.scheduledDates.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {service.scheduledDates
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
                                        {service.scheduledDate ? (
                                          format(service.scheduledDate, 'MMM dd, yyyy')
                                        ) : (
                                          <span className="text-muted-foreground">Pick a date</span>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={service.scheduledDate || undefined}
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
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
        </div>
      )}
        </CardContent>
      </Card>

      {/* Save and Delete Buttons */}
      <div className="flex justify-between items-center pt-4 border-t gap-3">
        <Button 
          onClick={handleDeleteConfig} 
          variant="destructive"
          className="w-full md:w-auto"
          disabled={isDeleting || isLoadingConfig || emailConfig.emails.length === 0}
        >
          {isDeleting ? 'Deleting...' : 'Delete Configuration'}
        </Button>
        <Button 
          onClick={handleSave} 
          className="bg-primary w-full md:w-auto md:min-w-[150px]"
          disabled={isSaving || isLoadingConfig}
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  )
}
