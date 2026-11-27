'use client'

import { useState } from 'react'
import { Loader2, Monitor, Paperclip, Smartphone } from 'lucide-react'
import { Send01, ChevronLeft, ChevronRight } from '@untitled-ui/icons-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { safeHtml } from '@/lib/safe-html'

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

/** Always-visible preview: the email exactly as one recipient gets it, with real values. */
export function LivePreview({
  recipient, index, count, onPrev, onNext, subjectText, bodyHtml, attachments = [], emptyText, className,
}: {
  recipient: { name: string; email: string } | null
  index: number
  count: number
  onPrev: () => void
  onNext: () => void
  subjectText: string
  /** Already HTML-safe (built by renderEmailPreview). */
  bodyHtml: string
  /** File names this recipient gets */
  attachments?: string[]
  emptyText: string
  className?: string
}) {
  // Most clients read on a phone: show the email at phone width too
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const navBtn = 'h-7 w-7 inline-flex items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40'
  return (
    <section aria-label="Preview" className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-sm text-muted-foreground">Recipient</span>
        {recipient && count > 1 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <button type="button" aria-label="Previous recipient" className={navBtn} disabled={index === 0} onClick={onPrev}><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="tabular-nums">{index + 1} of {count.toLocaleString()}</span>
            <button type="button" aria-label="Next recipient" className={navBtn} disabled={index >= count - 1} onClick={onNext}><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div role="group" aria-label="Preview size" className="ml-auto inline-flex rounded-md border border-border p-0.5">
          {([['desktop', Monitor, 'Desktop'], ['mobile', Smartphone, 'Phone']] as const).map(([d, Icon, label]) => (
            <button key={d} type="button" aria-pressed={device === d} aria-label={label} title={label} onClick={() => setDevice(d)}
              className={cn('inline-flex h-6 w-7 items-center justify-center rounded', device === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      {!recipient ? (
        <p className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <>
          <div className="space-y-0.5 border-b border-border px-4 py-2.5 text-sm">
            <p className="truncate"><span className="text-muted-foreground">To </span><span className="font-medium">{recipient.name}</span> <span className="text-muted-foreground">&lt;{recipient.email}&gt;</span></p>
            <p className="font-semibold break-words">{subjectText || <span className="font-normal text-muted-foreground">(no subject)</span>}</p>
            {attachments.length > 0 && (
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Paperclip className="h-3 w-3 shrink-0" />{attachments.join(', ')}</p>
            )}
          </div>
          <div className={cn('min-h-0 flex-1 overflow-y-auto', device === 'mobile' && 'bg-muted/40 px-3 py-4')}>
            <div className={device === 'mobile'
              ? 'mx-auto w-[375px] max-w-full rounded-[24px] border-[6px] border-foreground/80 bg-background px-4 py-4 text-sm leading-relaxed break-words [&_img]:h-auto [&_img]:max-w-full [&_table]:max-w-full'
              : 'mx-auto max-w-3xl px-6 py-5 text-sm leading-relaxed break-words [&_img]:h-auto [&_img]:max-w-full'}>
              <div dangerouslySetInnerHTML={{ __html: safeHtml(bodyHtml) }} />
              <p className="mt-6 border-t border-border/60 pt-3 text-center text-xs text-muted-foreground">
                Email sent via <span className="font-semibold text-primary">Lekvya</span>
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export function SendConfirmDialog({
  open,
  onOpenChange,
  recipientCount,
  cc,
  bcc,
  warnings = [],
  isSending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientCount: number
  cc: string
  bcc: string
  /** e.g. variables that will be blank for some recipients */
  warnings?: string[]
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
                {cc && <span className="block text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">CC: {cc}</span>}
                {bcc && <span className="block text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">BCC: {bcc}</span>}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {warnings.length > 0 && (
          <ul className="p-3 rounded-xl border border-border bg-muted/40 text-xs text-foreground space-y-1 list-disc pl-6">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
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
