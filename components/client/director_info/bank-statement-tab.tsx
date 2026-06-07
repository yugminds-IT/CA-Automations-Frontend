'use client'

import { Landmark } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BankStatementTabProps {
  clientId: string
  clientName?: string
}

export function BankStatementTab({ clientId, clientName = '' }: BankStatementTabProps) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          Bank Statement
        </CardTitle>
        <CardDescription>
          {clientName
            ? `Bank statements for ${clientName} will be managed here.`
            : 'Upload and review bank statements for this client.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Client ID: {clientId}. This section is ready for bank statement uploads and history.
        </p>
      </CardContent>
    </Card>
  )
}
