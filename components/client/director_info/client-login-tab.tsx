'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, PlusIcon, Trash2Icon, CheckCircle2, Lock, Mail, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ApiError } from '@/lib/api/client'
import { checkLoginEmailExists } from '@/lib/api/clients'

export interface ClientLogin {
  email: string
  password: string // System-generated password from backend
}

interface ClientLoginTabProps {
  clientName?: string
  initialLogins?: ClientLogin[]
  /** Emails auto-detected from client profile / directors; user can quick-add or add other emails. */
  suggestedEmails?: string[]
  /** Current org ID (client's org) for "email already exists" check. Backend uses current user's org if omitted. */
  organizationId?: number
  onSave?: (logins: ClientLogin[]) => void | Promise<void>
  /** Called when user removes the only login; should delete credentials in DB and refetch. */
  onRemoveLogin?: () => void | Promise<void>
}

export function ClientLoginTab({ 
  clientName = '',
  initialLogins = [],
  suggestedEmails = [],
  organizationId,
  onSave,
  onRemoveLogin,
}: ClientLoginTabProps) {
  const { toast } = useToast()
  const [logins, setLogins] = useState<ClientLogin[]>(initialLogins)
  const [newEmail, setNewEmail] = useState('')
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)

  // Sync logins when initialLogins prop changes (e.g., after loading from API)
  // Use a stringified version to avoid reference equality issues
  const initialLoginsKey = JSON.stringify(initialLogins)
  
  useEffect(() => {
    // Update logins when initialLogins changes
    // This happens when client data is loaded from API
    if (initialLogins.length > 0) {
      // If we have initial logins, update the state
      console.log('ClientLoginTab: Updating logins from initialLogins:', initialLogins.map(l => ({
        email: l.email,
        password: l.password ? `${l.password.substring(0, 3)}***` : 'empty',
        passwordLength: l.password?.length || 0
      })))
      setLogins(initialLogins)
    } else if (initialLogins.length === 0 && logins.length === 0) {
      // Only clear if both are empty (initial load with no credentials)
      setLogins([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoginsKey])

  // Pre-fill "Add email" with first suggested email when no logins yet
  useEffect(() => {
    if (logins.length === 0 && suggestedEmails.length > 0 && !newEmail) {
      const firstValid = suggestedEmails.find(e => e?.trim() && validateEmail(e.trim()))
      if (firstValid) setNewEmail(firstValid.trim())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logins.length, suggestedEmails.join(','), newEmail])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /** Add an email to the list (validation + org check + add). Used by input and suggested chips. */
  const addEmailToLogins = async (emailToAdd: string) => {
    const trimmedEmail = emailToAdd.trim()

    if (!trimmedEmail) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      })
      return
    }

    if (!validateEmail(trimmedEmail)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }

    // Check for duplicate in current list
    const existingIndex = logins.findIndex(login => login.email.toLowerCase() === trimmedEmail.toLowerCase())
    if (existingIndex >= 0) {
      toast({
        title: 'Duplicate Email',
        description: 'This email address is already added. Please use a different email.',
        variant: 'destructive',
      })
      return
    }

    // Check if email already exists in this organization (backend scopes to current org)
    setIsCheckingEmail(true)
    try {
      const { exists } = await checkLoginEmailExists(trimmedEmail, organizationId)
      if (exists) {
        toast({
          title: 'Email already exists',
          description: 'This email is already in use in your organization. Please use a different email.',
          variant: 'destructive',
        })
        return
      }
    } catch (err) {
      console.error('Error checking email:', err)
      toast({
        title: 'Error',
        description: 'Could not verify email. Please try again.',
        variant: 'destructive',
      })
      return
    } finally {
      setIsCheckingEmail(false)
    }

    // Add new login with empty password (will be generated by backend on save)
    setLogins([...logins, { email: trimmedEmail, password: '' }])
    toast({
      title: 'Email Added',
      description: 'Email added. Password will be system-generated when you save.',
      variant: 'success',
    })
    setNewEmail('')
  }

  const handleAddLogin = async () => {
    await addEmailToLogins(newEmail)
  }

  const handleRemoveLogin = async (index: number) => {
    const hadSavedLogin = initialLogins.length > 0
    const nextLogins = logins.filter((_, i) => i !== index)
    setLogins(nextLogins)

    // If we had a saved login and list is now empty, delete in DB
    if (hadSavedLogin && nextLogins.length === 0 && onRemoveLogin) {
      setIsRemoving(true)
      try {
        await onRemoveLogin()
        toast({
          title: 'Login credentials removed',
          description: 'Credentials have been deleted from the server.',
          variant: 'success',
        })
      } catch (error) {
        console.error('Error removing login credentials:', error)
        setLogins(logins) // revert
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to remove login credentials',
          variant: 'destructive',
        })
      } finally {
        setIsRemoving(false)
      }
    } else {
      toast({
        title: 'Removed',
        description: 'Login credentials removed',
      })
    }
  }

  const handleSave = async () => {
    console.log('handleSave called', { logins, onSave: !!onSave })
    
    if (logins.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one email address',
        variant: 'destructive',
      })
      return
    }

    // Validate all email addresses before sending to API
    for (const login of logins) {
      const emailOk = validateEmail(login.email)
      if (!emailOk) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid email address',
          variant: 'destructive',
        })
        return
      }
    }

    if (onSave) {
      setIsGenerating(true)
      try {
        console.log('Calling onSave with logins (passwords will be generated by backend):', logins.map(l => ({ 
          email: l.email
        })))
        await onSave(logins)
        toast({
          title: 'Success',
          description: 'Login credentials saved successfully. Password has been system-generated.',
          variant: 'success',
        })
      } catch (error) {
        console.error('Error saving login credentials:', error)
        let errorTitle = 'Error'
        let errorMessage = 'Failed to save login credentials'
        
        if (error instanceof ApiError) {
          errorMessage = typeof error.detail === 'string' ? error.detail : error.message
          if (error.status === 409) {
            errorTitle = 'Email already in use'
            if (!errorMessage.toLowerCase().includes('different')) {
              errorMessage = `${errorMessage} Please use a different email address or check if this client already has login credentials elsewhere.`
            }
          }
        } else if (error instanceof Error) {
          errorMessage = error.message
        } else if (error && typeof error === 'object') {
          if ('detail' in error) {
            const detail = (error as any).detail
            if (typeof detail === 'string') {
              errorMessage = detail
            } else if (detail && typeof detail === 'object') {
              errorMessage = detail.detail || detail.message || JSON.stringify(detail)
            }
          } else if ('message' in error) {
            errorMessage = String((error as any).message)
          }
        }
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setIsGenerating(false)
      }
    } else {
      console.warn('onSave callback not provided')
      toast({
        title: 'Warning',
        description: 'Save handler not configured',
        variant: 'destructive',
      })
    }
  }

  const togglePasswordVisibility = (index: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
            <Lock className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base font-semibold">Client Login Credentials</CardTitle>
              {logins.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {logins.length}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs leading-relaxed">
              {clientName 
                ? `Manage login credentials for ${clientName}. Passwords are system-generated by the backend.`
                : 'Add email address for client login access. Password will be system-generated automatically.'
              }
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Suggested emails from client / directors */}
        {suggestedEmails.length > 0 && (() => {
          const alreadyAdded = new Set(logins.map(l => l.email.toLowerCase()))
          const suggestedNotAdded = suggestedEmails
            .map(e => e?.trim())
            .filter((e): e is string => !!e && validateEmail(e) && !alreadyAdded.has(e.toLowerCase()))
          if (suggestedNotAdded.length === 0) return null
          return (
            <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/20">
              <Label className="text-xs font-medium text-muted-foreground">Suggested emails (from client profile)</Label>
              <div className="flex flex-wrap gap-2">
                {suggestedNotAdded.map((email) => (
                  <Button
                    key={email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={isCheckingEmail}
                    onClick={() => addEmailToLogins(email)}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    {email}
                  </Button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Add New Login Form */}
        <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <PlusIcon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Add New Login Credentials</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-email" className="text-xs">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-email"
                type="email"
                placeholder="Enter email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newEmail) {
                    e.preventDefault()
                    handleAddLogin()
                  }
                }}
                className="pl-9"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Password will be automatically generated by the system when you save.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleAddLogin}
            className="w-full sm:w-auto"
            disabled={!newEmail || isCheckingEmail}
          >
            {isCheckingEmail ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Email
              </>
            )}
          </Button>
        </div>

        {/* Existing Logins List */}
        {logins.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Saved Login Credentials</Label>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {logins.map((login, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-3 p-3 border border-border rounded-md bg-card hover:bg-muted/50 hover:border-primary/20 transition-all duration-200"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0 grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p className="text-sm font-medium truncate">{login.email}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Password</Label>
                      <div className="flex items-center gap-2">
                        {login.password && login.password.trim() ? (
                          <>
                            <p className="text-sm font-mono truncate">
                              {showPasswords[index] ? login.password : '••••••••'}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePasswordVisibility(index)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {showPasswords[index] ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Badge variant="outline" className="text-[10px] ml-1">
                              System Generated
                            </Badge>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Password will be generated when you save
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveLogin(index)}
                    disabled={isRemoving}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md bg-muted/30">
            <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No login credentials added yet</p>
            <p className="text-xs mt-1">Add an email address to enable client login. Password will be system-generated.</p>
          </div>
        )}

        {/* Save Button */}
        {logins.length > 0 && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} type="button" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Generating Password...</span>
                </>
              ) : (
                'Save & Generate Password'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

