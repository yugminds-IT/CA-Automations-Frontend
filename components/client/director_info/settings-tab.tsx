'use client'

import * as React from 'react'
import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { deleteClient } from '@/lib/api/clients'
import { ApiError } from '@/lib/api/client'

interface SettingsTabProps {
  clientId: string
  clientName: string
  onDeleted: () => void
}

export function SettingsTab({ clientId, clientName, onDeleted }: SettingsTabProps) {
  const { toast } = useToast()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteClient(clientId)
      toast({ title: 'Success', description: 'Client deleted successfully', variant: 'success' })
      onDeleted()
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Failed to delete client.'
      toast({ title: 'Error', description: String(msg), variant: 'destructive' })
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="border-destructive/40">
          <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              These actions are irreversible. Please proceed with caution.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-5">
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
              <div>
                <p className="text-sm font-medium">Delete Client</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently delete <span className="font-medium">{clientName}</span> and all associated data.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 shrink-0 ml-4"
              >
                <Trash2 className="h-4 w-4" />
                Delete Client
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={(open) => !isDeleting && setShowDeleteDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{clientName}</strong>? This action cannot be
              undone and will permanently remove all client data including files, logins, and directors.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
