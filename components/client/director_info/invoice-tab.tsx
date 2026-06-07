'use client'

import { Receipt } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface InvoiceTabProps {
  clientId: string
  clientName?: string
}

export function InvoiceTab({ clientId, clientName = '' }: InvoiceTabProps) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Invoice
        </CardTitle>
        <CardDescription>
          {clientName
            ? `Invoices for ${clientName} will be managed here.`
            : 'Create and track invoices for this client.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Client ID: {clientId}. This section is ready for invoice listing and generation.
        </p>
      </CardContent>
    </Card>
  )
}
