'use client'

/** This client's values for the org's custom email variables ({{meeting_link}} …). */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { listCustomVariables, setClientCustomValues, type CustomVariable } from '@/lib/api/custom-variables'

export function ClientCustomFields({ clientId }: { clientId: string | number }) {
  const { toast } = useToast()
  const [vars, setVars] = useState<CustomVariable[] | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const load = () =>
    listCustomVariables()
      .then((list) => {
        const l = Array.isArray(list) ? list : []
        setVars(l)
        setDraft(Object.fromEntries(l.map((v) => [v.key, v.values?.[String(clientId)] ?? ''])))
      })
      .catch(() => setVars([]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [clientId])

  if (!vars) return null
  const saved = Object.fromEntries(vars.map((v) => [v.key, v.values?.[String(clientId)] ?? '']))
  const changed = Object.fromEntries(Object.entries(draft).filter(([k, val]) => val.trim() !== (saved[k] ?? '')))
  const dirty = Object.keys(changed).length > 0

  const save = async () => {
    setSaving(true)
    try {
      await setClientCustomValues(clientId, changed)
      toast({ title: 'Saved', description: 'Custom fields updated.', variant: 'success' })
      await load()
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="px-4 pt-4 pb-2 sm:px-6">
        <CardTitle className="text-base sm:text-lg">Custom email fields</CardTitle>
        <p className="text-xs text-muted-foreground">
          Values for your own email variables. Empty uses the default.{' '}
          <Link href="/email-templates" className="underline">Manage variables</Link>
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6">
        {vars.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom variables yet. Add them under <Link href="/email-templates" className="underline">Email Templates → Custom variables</Link>.
          </p>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (dirty) save() }}>
            <div className="grid gap-3 sm:grid-cols-2">
              {vars.map((v) => (
                <label key={v.key} className="space-y-1 text-sm">
                  <span className="font-medium">{v.label}</span>{' '}
                  <span className="text-xs font-mono text-muted-foreground">{`{{${v.key}}}`}</span>
                  <Input value={draft[v.key] ?? ''} className="h-9"
                    placeholder={v.defaultValue ? `Default: ${v.defaultValue}` : 'Asked when sending if empty'}
                    onChange={(e) => setDraft((d) => ({ ...d, [v.key]: e.target.value }))} />
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={!dirty || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save fields
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
