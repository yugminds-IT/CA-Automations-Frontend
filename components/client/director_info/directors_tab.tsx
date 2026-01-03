'use client'

import * as React from 'react'
import { Trash2Icon } from 'lucide-react'
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

export interface Director {
  name: string
  email: string
  phone: string
  designation: string
  din: string
  pan: string
  aadhar: string
}

interface DirectorsTabProps {
  directors?: Director[]
  onRemoveDirector?: (index: number) => void
  clientName?: string
}

export function DirectorsTab({ 
  directors = [], 
  onRemoveDirector,
  clientName = ''
}: DirectorsTabProps) {
  const displayDirectors = directors
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Director List</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          {clientName && (
            <p className="text-muted-foreground text-sm sm:text-base">
              Director information for {clientName}
            </p>
          )}
          
          {displayDirectors.length === 0 ? (
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
                      {onRemoveDirector && (
                        <TableHead className="text-right min-w-[80px] sm:min-w-[100px] p-1.5 sm:p-2">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayDirectors.map((director, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium p-1.5 sm:p-2">
                          {index + 1}
                        </TableCell>
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
                        <TableCell className="hidden xl:table-cell p-1.5 sm:p-2">
                          {director.din || '—'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell p-1.5 sm:p-2">
                          {director.pan || '—'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell p-1.5 sm:p-2">
                          {director.aadhar || '—'}
                        </TableCell>
                        {onRemoveDirector && (
                          <TableCell className="text-right p-1.5 sm:p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveDirector(index)}
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2Icon className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
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
  )
}
