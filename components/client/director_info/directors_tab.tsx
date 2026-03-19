'use client'

import * as React from 'react'
import { Trash2Icon, Pencil, Plus, X } from 'lucide-react'
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

  function openAdd() {
    setEditIndex(null)
    setForm(EMPTY_DIRECTOR)
    setDialogOpen(true)
  }

  function openEdit(index: number) {
    setEditIndex(index)
    setForm({ ...directors[index] })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) return
    if (editIndex !== null) {
      onEditDirector?.(editIndex, form)
    } else {
      onAddDirector?.(form)
    }
    setDialogOpen(false)
  }

  function set(field: keyof Director, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
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
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">{editIndex !== null ? 'Edit Director' : 'Add Director'}</h2>
              <button onClick={() => setDialogOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ['name', 'Name *'],
                ['email', 'Email'],
                ['phone', 'Phone'],
                ['designation', 'Designation'],
                ['din', 'DIN'],
                ['pan', 'PAN'],
                ['aadhar', 'Aadhar'],
              ] as [keyof Director, string][]).map(([field, label]) => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-xs font-medium">{label}</Label>
                  <Input
                    value={form[field]}
                    onChange={(e) => set(field, e.target.value)}
                    className="h-8 text-sm"
                    placeholder={label.replace(' *', '')}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={!form.name.trim()}>
                {editIndex !== null ? 'Save Changes' : 'Add Director'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
