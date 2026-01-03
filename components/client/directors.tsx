'use client'

import * as React from 'react'
import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Client } from './client_tab'
import { DirectorsTab, type Director } from './director_info/directors_tab'
import { EmailSetup } from './director_info/email-setup'

interface DirectorsProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
}

export function Directors({ client, isOpen, onClose }: DirectorsProps) {
  const [directors, setDirectors] = useState<Director[]>([])
  
  // TODO: Load directors from API based on client.id
  // useEffect(() => {
  //   if (client?.id) {
  //     fetchDirectors(client.id).then(setDirectors)
  //   }
  // }, [client?.id])

  const handleRemoveDirector = (index: number) => {
    setDirectors(directors.filter((_, i) => i !== index))
    // TODO: Call API to remove director
  }

  if (!client) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] lg:max-w-6xl xl:max-w-[90vw] w-[98vw] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Client Details - {client.name}</span>
            
          </DialogTitle>
          <DialogDescription>
            {client.companyName} - Manage directors, login credentials, and email settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 w-full -mx-4 sm:-mx-6 px-4 sm:px-6">
          <Tabs defaultValue="directors" className="w-full">
            <div className="w-full overflow-x-auto sm:overflow-x-visible" style={{ WebkitOverflowScrolling: 'touch' }}>
              <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-3 sm:min-w-0 h-auto p-0 gap-0 border-b border-border">
                <TabsTrigger value="directors" className="text-[10px] sm:text-sm py-2 px-3 sm:px-4 whitespace-nowrap flex-shrink-0 flex-1 sm:flex-none min-w-0">
                  Directors
                </TabsTrigger>
                <TabsTrigger value="login" className="text-[10px] sm:text-sm py-2 px-3 sm:px-4 whitespace-nowrap flex-shrink-0 flex-1 sm:flex-none min-w-0">
                  Login
                </TabsTrigger>
                <TabsTrigger value="email" className="text-[10px] sm:text-sm py-2 px-3 sm:px-4 whitespace-nowrap flex-shrink-0 flex-1 sm:flex-none min-w-0">
                  Email
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Director List Tab */}
            <TabsContent value="directors" className="mt-4">
              <DirectorsTab 
                directors={directors}
                onRemoveDirector={handleRemoveDirector}
                clientName={client.companyName}
              />
            </TabsContent>

            {/* Client Login Tab */}
            <TabsContent value="login" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Client Login</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Manage login credentials for {client.name}
                    </p>
                    {/* Add login credentials form here */}
                    <div className="text-center py-8 text-muted-foreground">
                      Client login settings will be displayed here
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Setup Tab */}
            <TabsContent value="email" className="mt-4">
              <EmailSetup 
                clientId={client.id}
                clientName={client.companyName}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

