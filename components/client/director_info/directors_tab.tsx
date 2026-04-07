'use client'

import * as React from 'react'
import { Trash2Icon, Pencil, Plus, X, AlertCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface Director {
  id?: number
  name: string
  email: string
  phone: string
  designation: string
  din: string
  pan: string
  aadhar: string
}

const EMPTY_DIRECTOR: Director = {
  name: '',
  email: '',
  phone: '',
  designation: '',
  din: '',
  pan: '',
  aadhar: '',
}

type FieldErrors = Partial<Record<keyof Director, string>>

const FIELD_CONFIG: {
  field: keyof Director
  label: string
  required?: boolean
  placeholder: string
  hint: string
  maxLength?: number
}[] = [
  {
    field: 'name',
    label: 'Full Name',
    required: true,
    placeholder: 'e.g. Rajesh Kumar',
    hint: 'Enter the director\'s full legal name',
  },
  {
    field: 'email',
    label: 'Email Address',
    placeholder: 'e.g. rajesh.kumar@company.com',
    hint: 'Official email address of the director',
  },
  {
    field: 'phone',
    label: 'Phone Number',
    placeholder: 'e.g. 9876543210',
    hint: '10-digit mobile or landline number',
    maxLength: 10,
  },
  {
    field: 'designation',
    label: 'Designation',
    placeholder: 'e.g. Managing Director',
    hint: 'Title or role of the director',
  },
  {
    field: 'din',
    label: 'DIN',
    placeholder: 'e.g. 01234567',
    hint: 'Director Identification Number (8 digits)',
    maxLength: 8,
  },
  {
    field: 'pan',
    label: 'PAN Number',
    placeholder: 'e.g. ABCDE1234F',
    hint: 'Format: 5 letters + 4 digits + 1 letter',
    maxLength: 10,
  },
  {
    field: 'aadhar',
    label: 'Aadhar Number',
    placeholder: 'e.g. 1234 5678 9012',
    hint: '12-digit Aadhar card number',
    maxLength: 14,
  },
]

function validate(form: Director): FieldErrors {
  const errors: FieldErrors = {}

  if (!form.name.trim()) {
    errors.name = 'Full name is required'
  } else if (form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
  }

  if (form.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email.trim())) {
      errors.email = 'Enter a valid email address (e.g. name@example.com)'
    }
  }

  if (form.phone.trim()) {
    const digits = form.phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      errors.phone = 'Phone number must be exactly 10 digits'
    }
  }

  if (form.din.trim()) {
    const digits = form.din.replace(/\D/g, '')
    if (digits.length !== 8) {
      errors.din = 'DIN must be exactly 8 digits (e.g. 01234567)'
    }
  }

  if (form.pan.trim()) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    if (!panRegex.test(form.pan.trim().toUpperCase())) {
      errors.pan = 'Invalid PAN format (e.g. ABCDE1234F)'
    }
  }

  if (form.aadhar.trim()) {
    const digits = form.aadhar.replace(/\D/g, '')
    if (digits.length !== 12) {
      errors.aadhar = 'Aadhar must be exactly 12 digits (e.g. 1234 5678 9012)'
    }
  }

  return errors
}

interface DirectorsTabProps {
  directors?: Director[]
  onRemoveDirector?: (index: number) => void
  onAddDirector?: (director: Director) => void
  onEditDirector?: (index: number, director: Director) => void
  clientName?: string
}

export function DirectorsTab({
  directors = [],
  onRemoveDirector,
  onAddDirector,
  onEditDirector,
  clientName = '',
}: DirectorsTabProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editIndex, setEditIndex] = React.useState<number | null>(null)
  const [form, setForm] = React.useState<Director>(EMPTY_DIRECTOR)
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [touched, setTouched] = React.useState<Partial<Record<keyof Director, boolean>>>({})

  function openAdd() {
    setEditIndex(null)
    setForm(EMPTY_DIRECTOR)
    setErrors({})
    setTouched({})
    setDialogOpen(true)
  }

  function openEdit(index: number) {
    setEditIndex(index)
    setForm({ ...directors[index] })
    setErrors({})
    setTouched({})
    setDialogOpen(true)
  }

  function handleSave() {
    const allTouched = Object.fromEntries(
      FIELD_CONFIG.map(({ field }) => [field, true])
    ) as Partial<Record<keyof Director, boolean>>
    setTouched(allTouched)

    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    if (editIndex !== null) {
      onEditDirector?.(editIndex, form)
    } else {
      onAddDirector?.(form)
    }
    setDialogOpen(false)
  }

  function set(field: keyof Director, value: string) {
    // Auto-format phone: digits only
    if (field === 'phone') value = value.replace(/\D/g, '').slice(0, 10)
    // Auto-format DIN: digits only
    if (field === 'din') value = value.replace(/\D/g, '').slice(0, 8)
    // Auto-uppercase PAN
    if (field === 'pan') value = value.toUpperCase().slice(0, 10)
    // Auto-format Aadhar: digits + spaces (XXXX XXXX XXXX)
    if (field === 'aadhar') {
      const digits = value.replace(/\D/g, '').slice(0, 12)
      value = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
    }

    const updated = { ...form, [field]: value }
    setForm(updated)

    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validate(updated)[field] }))
    }
  }

  function blur(field: keyof Director) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validate(form)[field] }))
  }

  return (
    <>
      <Card>
        <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Director List</CardTitle>
          <Button type="button" size="sm" className="h-8 gap-1.5" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Director
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-5">
          <div className="space-y-4">
            {clientName && (
              <p className="text-muted-foreground text-sm sm:text-base">
                Director information for {clientName}
              </p>
            )}

            {directors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                No directors added yet.
              </div>
            ) : (
              <div className="border border-input rounded-lg overflow-x-auto -mx-1 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="min-w-full inline-block">
                  <Table className="min-w-[800px] sm:min-w-0">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[40px] sm:min-w-[50px] p-1.5 sm:p-2">#</TableHead>
                        <TableHead className="min-w-[100px] sm:min-w-[120px] p-1.5 sm:p-2">Name</TableHead>
                        <TableHead className="min-w-[150px] sm:min-w-[180px] p-1.5 sm:p-2">Email</TableHead>
                        <TableHead className="min-w-[110px] sm:min-w-[140px] hidden md:table-cell p-1.5 sm:p-2">Phone</TableHead>
                        <TableHead className="min-w-[120px] sm:min-w-[150px] hidden lg:table-cell p-1.5 sm:p-2">Designation</TableHead>
                        <TableHead className="min-w-[90px] sm:min-w-[120px] hidden xl:table-cell p-1.5 sm:p-2">DIN</TableHead>
                        <TableHead className="min-w-[90px] sm:min-w-[120px] hidden xl:table-cell p-1.5 sm:p-2">PAN</TableHead>
                        <TableHead className="min-w-[110px] sm:min-w-[140px] hidden xl:table-cell p-1.5 sm:p-2">Aadhar</TableHead>
                        <TableHead className="text-right min-w-[90px] sm:min-w-[110px] p-1.5 sm:p-2">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {directors.map((director, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium p-1.5 sm:p-2">{index + 1}</TableCell>
                          <TableCell className="font-medium p-1.5 sm:p-2">
                            <span className="truncate block max-w-[100px] sm:max-w-[120px]" title={director.name || ''}>
                              {director.name || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="p-1.5 sm:p-2">
                            <span className="truncate block max-w-[150px] sm:max-w-[180px]" title={director.email || ''}>
                              {director.email || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell p-1.5 sm:p-2">
                            <span className="truncate block max-w-[110px] sm:max-w-[140px]" title={director.phone || ''}>
                              {director.phone || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell p-1.5 sm:p-2">
                            <span className="truncate block max-w-[120px] sm:max-w-[150px]" title={director.designation || ''}>
                              {director.designation || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell p-1.5 sm:p-2">{director.din || '—'}</TableCell>
                          <TableCell className="hidden xl:table-cell p-1.5 sm:p-2">{director.pan || '—'}</TableCell>
                          <TableCell className="hidden xl:table-cell p-1.5 sm:p-2">{director.aadhar || '—'}</TableCell>
                          <TableCell className="text-right p-1.5 sm:p-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(index)}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {onRemoveDirector && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveDirector(index)}
                                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                >
                                  <Trash2Icon className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDialogOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold">{editIndex !== null ? 'Edit Director' : 'Add Director'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Fields marked <span className="text-destructive">*</span> are required</p>
              </div>
              <button onClick={() => setDialogOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FIELD_CONFIG.map(({ field, label, required, placeholder, hint, maxLength }) => {
                const error = touched[field] ? errors[field] : undefined
                return (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs font-medium">
                      {label}
                      {required && <span className="text-destructive ml-0.5">*</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        value={form[field] as string}
                        onChange={(e) => set(field, e.target.value)}
                        onBlur={() => blur(field)}
                        className={`h-9 text-sm ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        placeholder={placeholder}
                        maxLength={maxLength}
                      />
                      {error && (
                        <AlertCircle className="h-3.5 w-3.5 text-destructive absolute right-2.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    {error ? (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        {error}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">{hint}</p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave}>
                {editIndex !== null ? 'Save Changes' : 'Add Director'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
