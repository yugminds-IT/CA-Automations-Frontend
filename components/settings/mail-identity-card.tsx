'use client'

// Settings → Email: where client replies go, and the sign-off added to every email the firm sends.
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { EMAIL_RE } from '@/lib/audience'
import { getMailIdentity, saveMailIdentity, type MailIdentity } from '@/lib/api/organizations'

export function MailIdentityCard({ orgId, canEdit }: { orgId: number; canEdit: boolean }) {
  const { toast } = useToast()
  const [saved, setSaved] = useState<MailIdentity | null>(null)
  const [form, setForm] = useState<MailIdentity>({ replyTo: '', signature: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getMailIdentity(orgId).then((v) => { setSaved(v); setForm(v) }).catch(() => setSaved({ replyTo: '', signature: '' }))
  }, [orgId])

  const badReplyTo = !!form.replyTo.trim() && !EMAIL_RE.test(form.replyTo.trim())
  const changed = !!saved && (saved.replyTo !== form.replyTo || saved.signature !== form.signature)

  const save = async () => {
    setSaving(true)
    try {
      const v = await saveMailIdentity(orgId, { replyTo: form.replyTo.trim(), signature: form.signature.trim() })
      setSaved(v); setForm(v)
      toast({ title: 'Saved', description: 'New emails to clients use these.', variant: 'success' })
    } catch (err) {
      toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  return (
    <section aria-labelledby="mail-identity" className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 id="mail-identity" className="text-base font-semibold">Replies and signature</h3>
        <p className="text-sm text-muted-foreground">Used for every email your firm sends to clients from Send Mails and Scheduled Mails.</p>
      </div>
      {!saved ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <div className="space-y-1.5">
            <label htmlFor="reply-to" className="text-sm font-medium">Replies go to</label>
            <Input id="reply-to" type="email" value={form.replyTo} disabled={!canEdit} placeholder="e.g. accounts@yourfirm.com (leave empty for the sender)"
              onChange={(e) => setForm((f) => ({ ...f, replyTo: e.target.value }))} aria-invalid={badReplyTo} aria-describedby="reply-to-help" />
            <p id="reply-to-help" className={badReplyTo ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
              {badReplyTo ? 'That isn’t an email address.' : 'When a client presses Reply, their email goes here.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="signature" className="text-sm font-medium">Signature</label>
            <Textarea id="signature" rows={4} maxLength={2000} value={form.signature} disabled={!canEdit}
              placeholder={'Regards,\n{{org_name}}\n+91 98765 43210'}
              onChange={(e) => setForm((f) => ({ ...f, signature: e.target.value }))} aria-describedby="signature-help" />
            <p id="signature-help" className="text-sm text-muted-foreground">Added at the end of every email. Variables like {'{{org_name}}'} are filled in.</p>
          </div>
          {canEdit ? (
            <div className="flex justify-end">
              <Button onClick={save} disabled={!changed || badReplyTo || saving}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Save
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Only an organization admin can change these.</p>
          )}
        </>
      )}
    </section>
  )
}
