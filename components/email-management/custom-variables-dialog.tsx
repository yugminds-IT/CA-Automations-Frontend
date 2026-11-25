'use client'

/** Manage the org's own template variables ({{meeting_link}} …): name, label, default value. */
import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  createCustomVariable, deleteCustomVariable, updateCustomVariable, type CustomVariable,
} from '@/lib/api/custom-variables'

/** "Meeting Link" -> "meeting_link" */
const toKey = (label: string) => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'v_$1').slice(0, 60)

export function CustomVariablesDialog({ open, onOpenChange, custom, onChanged }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  custom: CustomVariable[]
  onChanged: () => void
}) {
  const { toast } = useToast()
  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [keyTouched, setKeyTouched] = useState(false)
  const [def, setDef] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const fail = (e: unknown) => toast({ title: 'Could not save', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' })

  const add = async () => {
    setBusy('add')
    try {
      await createCustomVariable({ key: key || toKey(label), label: label.trim(), defaultValue: def })
      setLabel(''); setKey(''); setDef(''); setKeyTouched(false)
      onChanged()
    } catch (e) { fail(e) } finally { setBusy(null) }
  }

  const save = async (v: CustomVariable, patch: { label?: string; defaultValue?: string }) => {
    if ((patch.label ?? v.label) === v.label && (patch.defaultValue ?? v.defaultValue) === v.defaultValue) return
    if (patch.label !== undefined && !patch.label.trim()) return
    setBusy(`save-${v.id}`)
    try { await updateCustomVariable(v.id, patch); onChanged() } catch (e) { fail(e) } finally { setBusy(null) }
  }

  const remove = async (v: CustomVariable) => {
    const n = Object.keys(v.values ?? {}).length
    if (!window.confirm(`Delete {{${v.key}}}${n ? ` and the values saved for ${n} client${n === 1 ? '' : 's'}` : ''}? Templates that use it will send it blank.`)) return
    setBusy(`del-${v.id}`)
    try { await deleteCustomVariable(v.id); onChanged() } catch (e) { fail(e) } finally { setBusy(null) }
  }

  const finalKey = key || toKey(label)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom variables</DialogTitle>
          <DialogDescription>
            Your own variables, like a meeting link or a branch address. Each client can have their own value
            (on the client&apos;s page); otherwise the default is used. Leave the default empty to type it when sending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {custom.length === 0 && <p className="text-sm text-muted-foreground py-2">No custom variables yet.</p>}
          {custom.map((v) => (
            <div key={`${v.id}-${v.label}-${v.defaultValue}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-start rounded-md border border-border p-2">
              <div>
                <Input aria-label={`Label for ${v.key}`} defaultValue={v.label} className="h-8 text-sm"
                  onBlur={(e) => save(v, { label: e.target.value })} />
                <p className="mt-1 text-xs font-mono text-muted-foreground">{`{{${v.key}}}`} · {Object.keys(v.values ?? {}).length} client value(s)</p>
              </div>
              <Input aria-label={`Default for ${v.key}`} defaultValue={v.defaultValue} placeholder="Default (optional)" className="h-8 text-sm"
                onBlur={(e) => save(v, { defaultValue: e.target.value })} />
              <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive" aria-label={`Delete ${v.key}`}
                disabled={busy === `del-${v.id}`} onClick={() => remove(v)}>
                {busy === `del-${v.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>

        <form className="mt-2 space-y-2 rounded-md bg-muted/40 p-3" onSubmit={(e) => { e.preventDefault(); if (label.trim() && finalKey) add() }}>
          <p className="text-sm font-medium">Add a variable</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input aria-label="New variable label" placeholder="Label, e.g. Meeting Link" className="h-8 text-sm" value={label}
              onChange={(e) => { setLabel(e.target.value); if (!keyTouched) setKey('') }} />
            <Input aria-label="New variable name" placeholder="name, e.g. meeting_link" className="h-8 text-sm font-mono" value={key || toKey(label)}
              onChange={(e) => { setKeyTouched(true); setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')) }} />
            <Input aria-label="New variable default" placeholder="Default (optional)" className="h-8 text-sm" value={def} onChange={(e) => setDef(e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Use it as <span className="font-mono">{finalKey ? `{{${finalKey}}}` : '{{name}}'}</span> or pick it from the variable menu.</p>
            <Button type="submit" size="sm" className="gap-1.5" disabled={!label.trim() || !finalKey || busy === 'add'}>
              {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Quick save of one {{key}} met while drafting (from "@" → Create, or a click on an unknown tag). */
export function SaveVariableDialog({ keyName, onClose, onSaved, sendNote }: {
  /** the variable to save; null = closed */
  keyName: string | null
  onClose: () => void
  onSaved: () => void
  /** optional extra line, e.g. "or just fill a value for this send below" */
  sendNote?: string
}) {
  const { toast } = useToast()
  const [label, setLabel] = useState('')
  const [def, setDef] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastKey, setLastKey] = useState<string | null>(null)
  if (keyName !== lastKey) { // reset the form for each new variable
    setLastKey(keyName)
    setLabel(keyName ? keyName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '')
    setDef('')
  }

  const save = async () => {
    if (!keyName) return
    setBusy(true)
    try {
      await createCustomVariable({ key: keyName, label: label.trim(), defaultValue: def })
      toast({ title: 'Variable saved', description: `{{${keyName}}} is now in the variable menu. Set per-client values on each client's page.`, variant: 'success' })
      onSaved()
      onClose()
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={keyName != null} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save <span className="font-mono">{`{{${keyName ?? ''}}}`}</span> as a custom variable?</DialogTitle>
          <DialogDescription>
            Saved variables appear in the variable menu for every template, and each client can have their own value.
            {sendNote ? ` ${sendNote}` : ''}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (label.trim()) save() }}>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Label</span>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-9" autoFocus />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Default value <span className="font-normal text-muted-foreground">(optional, used when a client has none)</span></span>
            <Input value={def} onChange={(e) => setDef(e.target.value)} className="h-9" placeholder="Leave empty to fill it when sending" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Keep as one-off</Button>
            <Button type="submit" size="sm" disabled={!label.trim() || busy}>
              {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save variable
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
