'use client'

import * as React from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, PlusIcon, Trash2Icon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { Client } from './client_tab'

const clientOnboardSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val === '' || val.length >= 10,
    'Please enter a valid phone number (at least 10 digits)'
  ),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  panNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === '' || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val),
      'Please enter a valid PAN number (e.g., ABCDE1234F)'
    ),
  gstNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === '' || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
      'Please enter a valid GST number (e.g., 22ABCDE1234F1Z5)'
    ),
  businessType: z.string().min(1, 'Please select a business type'),
  customBusinessType: z.string().optional(),
  status: z.string().optional(),
  addressLine1: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  pincode: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val === '' || /^[0-9]{6}$/.test(val),
    'Pincode must be 6 digits'
  ),
  directories: z.array(z.string()).optional().default([]),
  onboardDate: z.date().optional().nullable(),
  followUpDate: z.date().optional().nullable(),
  notes: z.string().optional(),
  directors: z.array(z.object({
    name: z.string().min(2, 'Director name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    designation: z.string().optional().or(z.literal('')),
    din: z.string().optional().or(z.literal('')),
    pan: z.string().optional().or(z.literal('')),
    aadhar: z.string().optional().or(z.literal('')),
  })).optional().default([]),
})

type ClientOnboardFormValues = z.infer<typeof clientOnboardSchema>

interface ClientOnboardFormProps {
  onSubmit?: (data: Omit<Client, 'id' | 'lastContactedDate'> & {
    panNumber?: string
    gstNumber?: string
    businessType?: string
    address?: string
    city?: string
    state?: string
    country?: string
    pincode?: string
    notes?: string
    directors?: Array<{
      name: string
      email?: string
      phone?: string
      designation?: string
      din?: string
      pan?: string
      aadhar?: string
    }>
  }) => Promise<void> | void
  onCancel?: () => void
  defaultValues?: Partial<ClientOnboardFormValues>
  services?: string[]
  businessTypes?: string[]
  clientStatuses?: string[]
  isEditing?: boolean
}

export function ClientOnboardForm({
  onSubmit,
  onCancel,
  defaultValues,
  services = [],
  businessTypes = [],
  clientStatuses = [],
  isEditing = false,
}: ClientOnboardFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [customServiceInput, setCustomServiceInput] = useState('')
  const [customBusinessTypeInput, setCustomBusinessTypeInput] = useState(
    defaultValues?.customBusinessType || ''
  )
  const [customBusinessTypes, setCustomBusinessTypes] = useState<string[]>([])
  const [customServices, setCustomServices] = useState<string[]>([])
  const [isOtherServiceChecked, setIsOtherServiceChecked] = useState(
    defaultValues?.directories?.some((val: string) => val.startsWith('Other:')) || false
  )
  const { toast } = useToast()

  const form = useForm<ClientOnboardFormValues>({
    resolver: zodResolver(clientOnboardSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      email: defaultValues?.email || '',
      phone: defaultValues?.phone || '',
      companyName: defaultValues?.companyName || '',
      panNumber: defaultValues?.panNumber || '',
      gstNumber: defaultValues?.gstNumber || '',
      businessType: defaultValues?.businessType || '',
      customBusinessType: defaultValues?.customBusinessType || '',
      status: defaultValues?.status || '',
      addressLine1: defaultValues?.addressLine1 || '',
      city: defaultValues?.city || '',
      state: defaultValues?.state || '',
      country: defaultValues?.country || '',
      pincode: defaultValues?.pincode || '',
      directories: defaultValues?.directories || [],
      onboardDate: defaultValues?.onboardDate || null,
      followUpDate: defaultValues?.followUpDate || null,
      notes: defaultValues?.notes || '',
      directors: defaultValues?.directors || [],
    },
  })

  const handleSubmit = async (data: ClientOnboardFormValues) => {
    setIsLoading(true)
    
    // Validate custom business type if "Other" is selected
    if (data.businessType === 'Other' && (!data.customBusinessType || data.customBusinessType.trim().length < 2)) {
      setIsLoading(false)
      toast({
        title: 'Validation Error',
        description: 'Please enter a custom business type (at least 2 characters)',
        variant: 'destructive',
      })
      form.setError('customBusinessType', {
        type: 'manual',
        message: 'Please enter a custom business type (at least 2 characters)',
      })
      return
    }
    try {
      // Include saved directors in the submission (normalize any remaining form directors)
      const allDirectors = [
        ...savedDirectors,
        ...(data.directors || []).map(normalizeDirector)
      ]
      
      // Use custom business type if "Other" is selected, otherwise use the selected type
      const finalBusinessType = data.businessType === 'Other' && data.customBusinessType
        ? data.customBusinessType.trim()
        : data.businessType
      
      // Transform form data to Client format with all fields
      const clientData: Omit<Client, 'id' | 'lastContactedDate'> & {
        panNumber?: string
        gstNumber?: string
        businessType?: string
        address?: string
        city?: string
        state?: string
        country?: string
        pincode?: string
        notes?: string
        directors?: Array<{
          name: string
          email?: string
          phone?: string
          designation?: string
          din?: string
          pan?: string
          aadhar?: string
        }>
      } = {
        name: data.name,
        email: data.email,
        phone: (data.phone && data.phone.trim() !== '') ? data.phone : null,
        companyName: data.companyName,
        directories: data.directories || [],
        followUpDate: data.followUpDate ? format(data.followUpDate, 'yyyy-MM-dd') : null,
        status: (data.status && data.status.trim() !== '') ? data.status : undefined,
        panNumber: (data.panNumber && data.panNumber.trim() !== '') ? data.panNumber : undefined,
        gstNumber: (data.gstNumber && data.gstNumber.trim() !== '') ? data.gstNumber : undefined,
        businessType: finalBusinessType,
        address: (data.addressLine1 && data.addressLine1.trim() !== '') ? data.addressLine1 : undefined,
        city: (data.city && data.city.trim() !== '') ? data.city : undefined,
        state: (data.state && data.state.trim() !== '') ? data.state : undefined,
        country: (data.country && data.country.trim() !== '') ? data.country : undefined,
        pincode: (data.pincode && data.pincode.trim() !== '') ? data.pincode : undefined,
        notes: (data.notes && data.notes.trim() !== '') ? data.notes : undefined,
        directors: allDirectors,
        onboardDate: data.onboardDate ? format(data.onboardDate, 'yyyy-MM-dd') : null,
      }

      if (onSubmit) {
        await onSubmit(clientData)
      } else {
        // Default behavior - just show success
        console.log('Client data:', clientData)
        toast({
          title: 'Success',
          description: 'Client onboarded successfully!',
          variant: 'success',
        })
        form.reset()
        setSavedDirectors([])
      }
    } catch (error: unknown) {
      console.error('Onboard error:', error)
      
      let errorMessage = 'Failed to onboard client. Please try again.'
      if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: 'Onboarding Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const [savedDirectors, setSavedDirectors] = useState<Array<{
    name: string
    email: string
    phone: string
    designation: string
    din: string
    pan: string
    aadhar: string
  }>>([])

  const normalizeDirector = (director: {
    name: string
    email?: string
    phone?: string
    designation?: string
    din?: string
    pan?: string
    aadhar?: string
  }) => ({
    name: director.name,
    email: director.email || '',
    phone: director.phone || '',
    designation: director.designation || '',
    din: director.din || '',
    pan: director.pan || '',
    aadhar: director.aadhar || '',
  })
  
  const directors = form.watch('directors') || []

  const addDirector = () => {
    const currentDirectors = form.getValues('directors') || []
    form.setValue('directors', [
      ...currentDirectors,
      { name: '', email: '', phone: '', designation: '', din: '', pan: '', aadhar: '' }
    ])
  }

  const saveDirector = (index: number) => {
    const currentDirectors = form.getValues('directors') || []
    const directorToSave = currentDirectors[index]
    
    // Validate required field
    if (!directorToSave.name || directorToSave.name.trim().length < 2) {
      toast({
        title: 'Validation Error',
        description: 'Director name is required and must be at least 2 characters',
        variant: 'destructive',
      })
      return
    }

    // Validate email if provided
    if (directorToSave.email && directorToSave.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(directorToSave.email)) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid email address',
          variant: 'destructive',
        })
        return
      }
    }

    // Save to saved directors (normalize the data)
    setSavedDirectors([...savedDirectors, normalizeDirector(directorToSave)])
    
    // Remove from form array
    form.setValue('directors', currentDirectors.filter((_, i) => i !== index))
    
    toast({
      title: 'Success',
      description: 'Director saved successfully',
      variant: 'success',
    })
  }

  const removeDirector = (index: number) => {
    const currentDirectors = form.getValues('directors') || []
    form.setValue('directors', currentDirectors.filter((_, i) => i !== index))
  }

  const removeSavedDirector = (index: number) => {
    setSavedDirectors(savedDirectors.filter((_, i) => i !== index))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 overflow-x-hidden max-w-full">
        <Tabs defaultValue="client-info" className="w-full overflow-x-hidden max-w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1">
            <TabsTrigger value="client-info" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              <span className="truncate">Client Info</span>
            </TabsTrigger>
            <TabsTrigger value="directors" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              <span className="truncate">Directors</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="client-info" className="space-y-6 mt-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+91 9876543210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value)
                          // Clear custom business type if not "Other"
                          if (value !== 'Other') {
                            form.setValue('customBusinessType', '')
                            setCustomBusinessTypeInput('')
                          }
                        }} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {businessTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                          {customBusinessTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Custom Business Type Field - Shows when "Other" is selected */}
              {form.watch('businessType') === 'Other' && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Enter custom business type"
                      value={customBusinessTypeInput}
                      onChange={(e) => setCustomBusinessTypeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customBusinessTypeInput.trim()) {
                          e.preventDefault()
                          const newBusinessType = customBusinessTypeInput.trim()
                          // Add to custom business types list if not already present
                          if (!customBusinessTypes.includes(newBusinessType)) {
                            setCustomBusinessTypes([...customBusinessTypes, newBusinessType])
                          }
                          // Set as selected business type
                          form.setValue('businessType', newBusinessType)
                          form.setValue('customBusinessType', newBusinessType)
                          setCustomBusinessTypeInput('')
                        }
                      }}
                      className="w-48 h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (customBusinessTypeInput.trim()) {
                          const newBusinessType = customBusinessTypeInput.trim()
                          // Add to custom business types list if not already present
                          if (!customBusinessTypes.includes(newBusinessType)) {
                            setCustomBusinessTypes([...customBusinessTypes, newBusinessType])
                          }
                          // Set as selected business type
                          form.setValue('businessType', newBusinessType)
                          form.setValue('customBusinessType', newBusinessType)
                          setCustomBusinessTypeInput('')
                        }
                      }}
                      disabled={!customBusinessTypeInput.trim()}
                      className="shrink-0 h-8 px-2"
                    >
                      <PlusIcon className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Add</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        form.setValue('businessType', '')
                        form.setValue('customBusinessType', '')
                        setCustomBusinessTypeInput('')
                      }}
                      className="shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Close Other option"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Display custom business type with remove button */}
                  {form.watch('customBusinessType') && (
                    <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/50">
                      <span className="flex-1 text-sm">
                        {form.watch('customBusinessType')}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          form.setValue('customBusinessType', '')
                          form.setValue('businessType', '')
                          setCustomBusinessTypeInput('')
                        }}
                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Remove custom business type"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="customBusinessType"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Tax & Business Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Tax & Business Information</h3>
              
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <FormField
                  control={form.control}
                  name="panNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PAN Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ABCDE1234F" 
                          maxLength={10}
                          className="uppercase"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Format: ABCDE1234F
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="22ABCDE1234F1Z5" 
                          maxLength={15}
                          className="uppercase"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Format: 22ABCDE1234F1Z5
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value || ''}
                        disabled={clientStatuses.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={clientStatuses.length === 0 ? "No status options available" : "Select status"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientStatuses.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                              No status options available
                            </div>
                          ) : (
                            clientStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription className="invisible">
                        Placeholder for alignment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Address</h3>
              
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-5">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address, Building name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Mumbai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="Maharashtra" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="India" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="400001" 
                          maxLength={6}
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            field.onChange(value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Services Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Services</h3>
              
              <FormField
                control={form.control}
                name="directories"
                render={() => (
                  <FormItem>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {services.map((directory) => (
                        <FormField
                          key={directory}
                          control={form.control}
                          name="directories"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={directory}
                                className="flex flex-row items-center space-x-3 space-y-0 border border-black dark:border-gray-600 rounded-md p-3 hover:bg-accent/50 transition-colors"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(directory)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, directory])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== directory
                                            )
                                          )
                                    }}
                                    className="border-black dark:border-gray-400 data-[state=checked]:bg-black data-[state=checked]:border-black dark:data-[state=checked]:bg-gray-400 dark:data-[state=checked]:border-gray-400"
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer flex-1">
                                  {directory}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                      
                      {/* Custom Services as regular checkboxes */}
                      {customServices.map((customService) => (
                        <FormField
                          key={customService}
                          control={form.control}
                          name="directories"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={customService}
                                className="flex flex-row items-center space-x-3 space-y-0 border border-black dark:border-gray-600 rounded-md p-3 hover:bg-accent/50 transition-colors"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(customService)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, customService])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== customService
                                            )
                                          )
                                    }}
                                    className="border-black dark:border-gray-400 data-[state=checked]:bg-black data-[state=checked]:border-black dark:data-[state=checked]:bg-gray-400 dark:data-[state=checked]:border-gray-400"
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer flex-1">
                                  {customService}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                      
                      {/* Other checkbox */}
                      <FormField
                        control={form.control}
                        name="directories"
                        render={({ field }) => {
                          return (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 border border-black dark:border-gray-600 rounded-md p-3 hover:bg-accent/50 transition-colors">
                              <FormControl>
                                <Checkbox
                                  checked={isOtherServiceChecked}
                                  onCheckedChange={(checked) => {
                                    setIsOtherServiceChecked(checked as boolean)
                                    if (!checked) {
                                      setCustomServiceInput('')
                                    }
                                  }}
                                  className="border-black dark:border-gray-400 data-[state=checked]:bg-black data-[state=checked]:border-black dark:data-[state=checked]:bg-gray-400 dark:data-[state=checked]:border-gray-400"
                                />
                              </FormControl>
                              <FormLabel 
                                className="font-normal cursor-pointer flex-1"
                                onClick={() => {
                                  if (!isOtherServiceChecked) {
                                    setIsOtherServiceChecked(true)
                                  }
                                }}
                              >
                                Other
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    </div>

                    {/* Custom Services Input - Shows when "Other" is checked */}
                    {isOtherServiceChecked && (
                      <div className="mt-4 space-y-3">
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="Enter custom service"
                            value={customServiceInput}
                            onChange={(e) => setCustomServiceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customServiceInput.trim()) {
                                e.preventDefault()
                                const newService = customServiceInput.trim()
                                const currentDirectories = form.getValues('directories') || []
                                // Add to custom services list if not already present
                                if (!customServices.includes(newService)) {
                                  setCustomServices([...customServices, newService])
                                }
                                // Add as regular service (not with "Other:" prefix)
                                if (!currentDirectories.includes(newService)) {
                                  form.setValue('directories', [...currentDirectories, newService])
                                }
                                setCustomServiceInput('')
                                setIsOtherServiceChecked(false)
                              }
                            }}
                            className="w-48 h-8 text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (customServiceInput.trim()) {
                                const newService = customServiceInput.trim()
                                const currentDirectories = form.getValues('directories') || []
                                // Add to custom services list if not already present
                                if (!customServices.includes(newService)) {
                                  setCustomServices([...customServices, newService])
                                }
                                // Add as regular service (not with "Other:" prefix)
                                if (!currentDirectories.includes(newService)) {
                                  form.setValue('directories', [...currentDirectories, newService])
                                  setCustomServiceInput('')
                                  setIsOtherServiceChecked(false)
                                } else {
                                  toast({
                                    title: 'Service already added',
                                    description: 'This service is already in the list',
                                    variant: 'destructive',
                                  })
                                }
                              }
                            }}
                            disabled={!customServiceInput.trim()}
                            className="shrink-0 h-8 px-2"
                          >
                            <PlusIcon className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Add</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setIsOtherServiceChecked(false)
                              setCustomServiceInput('')
                            }}
                            className="shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Close Other option"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                      </div>
                    )}

                    <FormMessage />
                    <FormDescription>
                      Select all services this client requires
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            {/* Dates Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Important Dates</h3>
              
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <FormField
                  control={form.control}
                  name="onboardDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col sm:col-span-1 md:col-span-1 lg:col-span-2 xl:col-span-2">
                      <FormLabel>Onboard Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date (optional)</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col sm:col-span-1 md:col-span-1 lg:col-span-2 xl:col-span-2">
                      <FormLabel>Follow-up Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date (optional)</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date('1900-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Set a reminder date for follow-up
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes Section */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about the client..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add any relevant notes or comments about this client
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

          </TabsContent>

          <TabsContent value="directors" className="space-y-6 mt-6 overflow-x-hidden max-w-full">
            <div className="space-y-4 overflow-x-hidden max-w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Company Directors</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDirector}
                  className="w-full sm:w-auto"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Director
                </Button>
              </div>

              {directors.length === 0 && savedDirectors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                  No directors added. Click "Add Director" to add director details.
                </div>
              ) : directors.length > 0 ? (
                <div className="space-y-6">
                  {directors.map((director, index) => (
                    <div key={index} className="border border-input rounded-lg p-3 sm:p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <h4 className="text-sm font-medium">Director {savedDirectors.length + index + 1}</h4>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => saveDirector(index)}
                            className="flex-1 sm:flex-initial"
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDirector(index)}
                            className="text-destructive hover:text-destructive flex-1 sm:flex-initial"
                          >
                            <Trash2Icon className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Remove</span>
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        <FormField
                          control={form.control}
                          name={`directors.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Director Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`directors.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Enter email address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`directors.${index}.phone`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+91 9876543210" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`directors.${index}.designation`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Designation</FormLabel>
                              <FormControl>
                                <Input placeholder="Managing Director" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`directors.${index}.din`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>DIN</FormLabel>
                              <FormControl>
                                <Input placeholder="Director Identification Number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`directors.${index}.pan`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PAN</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="ABCDE1234F" 
                                  maxLength={10}
                                  className="uppercase"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                />
                              </FormControl>
                              <FormDescription className="invisible">
                                Placeholder for alignment
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`directors.${index}.aadhar`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Aadhar Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="1234 5678 9012" 
                                  maxLength={14}
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '')
                                    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ')
                                    field.onChange(formatted.trim())
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Format: 1234 5678 9012
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Directors Table - Shows saved directors */}
              {savedDirectors.length > 0 && (
                <div className="space-y-4 overflow-x-hidden max-w-full">
                  <h3 className="text-sm font-semibold">Saved Directors</h3>
                  
                  {/* Mobile Card Layout */}
                  <div className="block md:hidden space-y-3">
                    {savedDirectors.map((director, index) => (
                      <div
                        key={index}
                        className="border border-input rounded-lg p-4 space-y-2 bg-card"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                              <h3 className="font-semibold text-base">{director.name || '—'}</h3>
                            </div>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Email:</span>
                                <span className="flex-1 break-all">{director.email || '—'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Phone:</span>
                                <span className="flex-1">{director.phone || '—'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Designation:</span>
                                <span className="flex-1">{director.designation || '—'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">DIN:</span>
                                <span className="flex-1">{director.din || '—'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">PAN:</span>
                                <span className="flex-1">{director.pan || '—'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Aadhar:</span>
                                <span className="flex-1">{director.aadhar || '—'}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSavedDirector(index)}
                            className="text-destructive hover:text-destructive ml-2"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table Layout */}
                  <div className="hidden md:block border border-input rounded-lg overflow-hidden w-full max-w-full">
                    <div className="overflow-x-auto overflow-y-auto max-h-[400px] w-full max-w-full">
                      <Table className="min-w-[1000px]">
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="min-w-[50px] bg-background whitespace-nowrap">#</TableHead>
                            <TableHead className="min-w-[120px] bg-background whitespace-nowrap">Name</TableHead>
                            <TableHead className="min-w-[180px] bg-background whitespace-nowrap">Email</TableHead>
                            <TableHead className="min-w-[140px] bg-background whitespace-nowrap">Phone</TableHead>
                            <TableHead className="min-w-[150px] bg-background whitespace-nowrap">Designation</TableHead>
                            <TableHead className="min-w-[120px] bg-background whitespace-nowrap">DIN</TableHead>
                            <TableHead className="min-w-[120px] bg-background whitespace-nowrap">PAN</TableHead>
                            <TableHead className="min-w-[140px] bg-background whitespace-nowrap">Aadhar</TableHead>
                            <TableHead className="text-right min-w-[100px] bg-background whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {savedDirectors.map((director, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {index + 1}
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap">
                                <span className="truncate block max-w-[120px]" title={director.name || ''}>
                                  {director.name || '—'}
                                </span>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <span className="truncate block max-w-[180px]" title={director.email || ''}>
                                  {director.email || '—'}
                                </span>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {director.phone || '—'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <span className="truncate block max-w-[150px]" title={director.designation || ''}>
                                  {director.designation || '—'}
                                </span>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {director.din || '—'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {director.pan || '—'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {director.aadhar || '—'}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSavedDirector(index)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2Icon className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading 
              ? (isEditing ? 'Updating...' : 'Onboarding...') 
              : (isEditing ? 'Update Client' : 'Onboard Client')
            }
          </Button>
        </div>
      </form>
    </Form>
  )
}

