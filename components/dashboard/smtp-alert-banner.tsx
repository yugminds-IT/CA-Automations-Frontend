"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Mail,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  X,
  CheckCircle2,
  Sparkles,
  Server,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getMe } from "@/lib/api/index"
import { getSmtpConfig } from "@/lib/api/organizations"
import { SmtpSetupGuideDialog } from "@/components/smtp/smtp-setup-guide-dialog"

interface SmtpAlertBannerProps {
  onGuideOpen?: () => void
}

export function SmtpAlertBanner({ onGuideOpen }: SmtpAlertBannerProps) {
  const router = useRouter()
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [orgId, setOrgId] = useState<number | null>(null)
  const [orgName, setOrgName] = useState<string>("")
  const [canManage, setCanManage] = useState(false)

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem("smtp_alert_dismissed")
    if (dismissed === "true") {
      setIsDismissed(true)
    }

    let isMounted = true
    const checkSmtp = async () => {
      try {
        const me = (await getMe()) as any
        if (!me) return

        const organizationId = me.organizationId ?? me.organization?.id
        const roleName = me.role?.name ?? me.roleName ?? (typeof me.role === "string" ? me.role : "")
        const isMaster = roleName === "MASTER_ADMIN"
        const isOrgAdmin = roleName === "ORG_ADMIN"

        if (isMounted) {
          setCanManage(isMaster || isOrgAdmin)
          setOrgId(organizationId)
          setOrgName(me.organization?.name || "your organization")
        }

        if (organizationId) {
          const config = await getSmtpConfig(organizationId)
          if (isMounted) {
            setIsConfigured(config.configured ?? false)
          }
        } else {
          if (isMounted) {
            setIsConfigured(true) // No org to configure
          }
        }
      } catch (err) {
        // If 403 or error, don't show intrusive banner
        console.warn("Could not check SMTP status:", err)
      }
    }

    checkSmtp()
    return () => {
      isMounted = false
    }
  }, [])

  // If already configured or still checking, don't show banner
  if (isConfigured === true || isConfigured === null) {
    return null
  }

  // If dismissed, show a sleek minimized reminder bar
  if (isDismissed) {
    return (
      <>
        <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-900 dark:text-amber-200 transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium">
              Reminder: Custom SMTP email delivery is not configured for {orgName}.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setGuideOpen(true)
                if (onGuideOpen) onGuideOpen()
              }}
              className="text-amber-700 dark:text-amber-300 hover:underline font-semibold flex items-center gap-1"
            >
              <BookOpen className="h-3 w-3" /> View Guide
            </button>
            <span className="text-amber-500/40">|</span>
            <button
              onClick={() => router.push("/settings?section=email")}
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              Setup <ArrowRight className="h-3 w-3" />
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem("smtp_alert_dismissed")
                setIsDismissed(false)
              }}
              title="Expand alert"
              className="ml-2 text-muted-foreground hover:text-foreground text-[11px] underline"
            >
              Show Banner
            </button>
          </div>
        </div>
        <SmtpSetupGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
      </>
    )
  }

  const handleDismiss = () => {
    sessionStorage.setItem("smtp_alert_dismissed", "true")
    setIsDismissed(true)
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-primary/5 dark:from-amber-950/40 dark:via-background dark:to-background p-4 sm:p-5 shadow-xs transition-all">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 h-full w-1.5 bg-gradient-to-b from-amber-500 to-amber-600" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Content */}
          <div className="flex items-start gap-3.5 max-w-3xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30 shadow-xs">
              <Mail className="h-5 w-5" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[11px] font-semibold gap-1.5 py-0.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Email Setup Required
                </Badge>
                <span className="text-xs font-semibold text-foreground">
                  Custom SMTP is not configured
                </span>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Connect your organization&apos;s email server (Gmail, Microsoft 365, Zoho, or cPanel) so client notifications, tax deadline alerts, and document requests are delivered from your official domain with 100% inbox delivery.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0 justify-start md:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGuideOpen(true)
                if (onGuideOpen) onGuideOpen()
              }}
              className="gap-1.5 text-xs h-9 bg-background/80 hover:bg-background border-border shadow-xs"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>How to Setup (Guide)</span>
            </Button>

            <Button
              size="sm"
              onClick={() => router.push("/settings?section=email")}
              className="gap-1.5 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs font-medium"
            >
              <span>Setup SMTP in Settings</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Dismiss alert for this session"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <SmtpSetupGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  )
}
