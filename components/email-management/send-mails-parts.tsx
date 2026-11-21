'use client'

import { Loader2 } from 'lucide-react'
import { Mail01, Send01, ArrowLeft, ArrowRight, User01 } from '@untitled-ui/icons-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ClientItem } from './send-mails-utils'

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const letter = name.trim().charAt(0).toUpperCase() || '?'
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
  ]
  const color = colors[letter.charCodeAt(0) % colors.length]
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}>
      {letter}
    </div>
  )
}

function recipientsLabel(count: number) {
  return `${count} recipient${count !== 1 ? 's' : ''}`
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  client,
  clientIndex,
  clientCount,
  onPrev,
  onNext,
  subjectText,
  bodyHtml,
  recipientCount,
  sendDisabled,
  onSendNow,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: ClientItem | null | undefined
  clientIndex: number
  clientCount: number
  onPrev: () => void
  onNext: () => void
  subjectText: string
  /** Already HTML-safe (built with substituteVarsHtml / cleanAndSubstituteVars). */
  bodyHtml: string
  recipientCount: number
  sendDisabled: boolean
  onSendNow: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">Email Preview</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail01 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Email Preview</h2>
              {clientCount > 1 && (
                <p className="text-xs text-muted-foreground">
                  {clientIndex + 1} of {clientCount} recipients
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {clientCount > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous recipient"
                  disabled={clientIndex === 0}
                  onClick={onPrev}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Next recipient"
                  disabled={clientIndex === clientCount - 1}
                  onClick={onNext}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {client && (
          <>
            {/* Email metadata */}
            <div className="px-5 py-3 border-b border-border bg-background space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User01 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{client.name}</span>
                    {client.businessType && (
                      <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 shrink-0">{client.businessType}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{client.email}</span>
                </div>
              </div>
              <div className="pl-11">
                <p className="text-xs text-muted-foreground mb-0.5">Subject</p>
                <p className="text-sm font-medium">{subjectText || '(no subject)'}</p>
              </div>
            </div>

            {/* Email body & footer preview */}
            <div className="px-6 py-5 text-sm min-h-[220px] max-h-[440px] overflow-y-auto bg-background leading-relaxed flex flex-col justify-between">
              <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              <div className="mt-8 pt-4 border-t border-border/60 text-center text-xs text-muted-foreground">
                <a
                  href={typeof window !== 'undefined' ? window.location.origin : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Email sent via</span>
                  <span className="font-semibold text-primary underline">Lekvya</span>
                </a>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{recipientsLabel(recipientCount)}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-lg" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button size="sm" className="text-xs h-8 rounded-lg gap-1.5" disabled={sendDisabled} onClick={onSendNow}>
                  <Send01 className="h-3.5 w-3.5" />
                  Send Now
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function SendConfirmDialog({
  open,
  onOpenChange,
  recipientCount,
  cc,
  bcc,
  isSending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientCount: number
  cc: string
  bcc: string
  isSending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Send01 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Send Emails?</DialogTitle>
              <DialogDescription className="mt-0.5">
                To <strong>{recipientsLabel(recipientCount)}</strong>
                {cc && <span className="block text-[11px] text-muted-foreground mt-0.5 truncate max-w-[260px]">CC: {cc}</span>}
                {bcc && <span className="block text-[11px] text-muted-foreground mt-0.5 truncate max-w-[260px]">BCC: {bcc}</span>}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-400">
          Use <strong>Schedule</strong> to send at a specific time instead.
        </div>
        <div className="flex gap-2 justify-end mt-1">
          <Button variant="outline" size="sm" className="text-xs rounded-lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="text-xs gap-1.5 rounded-lg" disabled={isSending} onClick={onConfirm}>
            {isSending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
              : <><Send01 className="h-3.5 w-3.5" /> Confirm & Send</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
