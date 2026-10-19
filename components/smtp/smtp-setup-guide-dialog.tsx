"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  Mail,
  Server,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Globe,
} from "lucide-react"

export interface SmtpPreset {
  id: string
  name: string
  host: string
  port: number
  secure: boolean
  description: string
}

export const SMTP_PRESETS: Record<string, SmtpPreset> = {
  gmail: {
    id: "gmail",
    name: "Gmail / Google Workspace",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    description: "Recommended with Google App Passwords",
  },
  outlook: {
    id: "outlook",
    name: "Microsoft 365 / Outlook",
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    description: "Office 365 & Outlook.com mailboxes",
  },
  zoho_global: {
    id: "zoho_global",
    name: "Zoho Mail (Global)",
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    description: "For .com domains and global accounts",
  },
  zoho_in: {
    id: "zoho_in",
    name: "Zoho Mail (India .in)",
    host: "smtp.zoho.in",
    port: 465,
    secure: true,
    description: "For Indian .in accounts",
  },
  hostinger: {
    id: "hostinger",
    name: "Hostinger Webmail",
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    description: "Hostinger hPanel & Titan Business Email",
  },
  godaddy: {
    id: "godaddy",
    name: "GoDaddy Webmail",
    host: "smtpout.secureserver.net",
    port: 465,
    secure: true,
    description: "GoDaddy Workspace & cPanel Email",
  },
  custom: {
    id: "custom",
    name: "Custom / cPanel Webmail",
    host: "mail.yourdomain.com",
    port: 465,
    secure: true,
    description: "Self-hosted, Hostinger, GoDaddy, cPanel",
  },
}

interface SmtpSetupGuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPreset?: (preset: SmtpPreset) => void
}

export function SmtpSetupGuideDialog({
  open,
  onOpenChange,
  onSelectPreset,
}: SmtpSetupGuideDialogProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"gmail" | "outlook" | "hostinger" | "godaddy" | "zoho" | "custom">("gmail")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleApplyPreset = (presetId: string) => {
    const preset = SMTP_PRESETS[presetId]
    if (onSelectPreset && preset) {
      onSelectPreset(preset)
      onOpenChange(false)
      return
    }
    // Navigate to settings page with query params
    onOpenChange(false)
    router.push(`/settings?section=email&preset=${presetId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border bg-card">
        {/* Modal Header */}
        <div className="relative p-6 pb-5 bg-gradient-to-br from-primary/10 via-background to-muted/40 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Mail className="h-4 w-4" />
            </span>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs font-medium">
              Setup Guide & Instructions
            </Badge>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            How to Set Up Your SMTP Email Delivery
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1 max-w-xl">
            Configure Lekvya to send client notifications, tax alerts, and reminders directly from your own business email address.
          </DialogDescription>
        </div>

        {/* Provider Tabs */}
        <div className="flex border-b border-border bg-muted/30 px-6 overflow-x-auto gap-2 py-2">
          {[
            { id: "gmail", label: "Gmail / Google", icon: Sparkles, badge: "Most Popular" },
            { id: "outlook", label: "Microsoft 365", icon: Server },
            { id: "hostinger", label: "Hostinger", icon: Server, badge: "Popular" },
            { id: "godaddy", label: "GoDaddy", icon: Globe },
            { id: "zoho", label: "Zoho Mail", icon: ShieldCheck },
            { id: "custom", label: "cPanel / Custom", icon: Mail },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {tab.label}
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-6">
          {/* GMAIL TAB */}
          {activeTab === "gmail" && (
            <div className="space-y-6">
              {/* Important security callout */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      Google requires an &quot;App Password&quot; (NOT your normal Google login password)
                    </p>
                    <p className="mt-1 opacity-90 leading-relaxed">
                      For your account security, Google blocks third-party applications from using regular passwords. You must generate a free 16-character <strong>App Password</strong> in your Google Account security settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step by step */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" /> Step-by-Step Instructions:
                </h4>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Turn ON 2-Step Verification</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ensure 2-Step Verification is turned on in your Google Account.
                      </p>
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1.5"
                      >
                        Open Google Security Settings <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Generate an App Password</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Click the direct link below. Name the app e.g. <code className="px-1 py-0.5 bg-muted rounded font-mono text-foreground font-semibold">Lekvya</code> and click <strong>Create</strong>.
                      </p>
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1.5"
                      >
                        Go directly to Google App Passwords Generator <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      3
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Copy the 16-Character Code</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Google gives you a yellow box with 16 letters (e.g., <code className="px-1 py-0.5 bg-muted rounded font-mono text-foreground font-semibold">abcd efgh ijkl mnop</code>). Copy this and paste it as the <strong>SMTP Password</strong> in Settings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameters Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Gmail Connection Parameters
                  </span>
                  <Badge variant="secondary" className="text-[11px]">Port 587 (TLS Recommended)</Badge>
                </div>
                <div className="divide-y divide-border text-xs sm:text-sm">
                  {[
                    { label: "SMTP Host", value: "smtp.gmail.com", key: "gmail-host" },
                    { label: "Port", value: "587", key: "gmail-port" },
                    { label: "SSL/TLS (Secure)", value: "OFF (Disable toggle for 587)", key: "gmail-secure", raw: false },
                    { label: "Username", value: "Your full Gmail or Google Workspace email address", key: "gmail-user", raw: null },
                    { label: "Password", value: "16-character Google App Password (without spaces)", key: "gmail-pass", raw: null },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-card">
                      <span className="font-medium text-muted-foreground">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground font-medium">{row.value}</span>
                        {row.raw !== null && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(String(row.raw ?? row.value), row.key)}
                          >
                            {copiedKey === row.key ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Ready to connect? Apply this preset to fill host and port automatically.
                </p>
                <Button
                  onClick={() => handleApplyPreset("gmail")}
                  className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Use Gmail Preset & Open Settings <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* OUTLOOK / MICROSOFT TAB */}
          {activeTab === "outlook" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-950 dark:text-blue-200">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-300">
                      For Microsoft 365 / Office 365 Work Accounts
                    </p>
                    <p className="mt-1 opacity-90 leading-relaxed">
                      Ensure <strong>Authenticated SMTP</strong> is enabled for your user in the Microsoft 365 Admin Center (Admin Center &gt; Active Users &gt; Mail &gt; Manage email apps &gt; Authenticated SMTP).
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" /> Setup Steps:
                </h4>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Check 2FA &amp; App Passwords</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        If two-factor authentication is required by your organization, generate an App Password in your Microsoft Account Security dashboard.
                      </p>
                      <a
                        href="https://account.live.com/proofs/manage/additional"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1.5"
                      >
                        Microsoft Security &amp; App Passwords <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Fill SMTP Credentials</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Use <code className="px-1 py-0.5 bg-muted rounded font-mono text-foreground font-semibold">smtp.office365.com</code> with port 587 and your full email address.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameters Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Microsoft 365 Connection Parameters
                  </span>
                  <Badge variant="secondary" className="text-[11px]">Port 587 (STARTTLS)</Badge>
                </div>
                <div className="divide-y divide-border text-xs sm:text-sm">
                  {[
                    { label: "SMTP Host", value: "smtp.office365.com", key: "m365-host" },
                    { label: "Port", value: "587", key: "m365-port" },
                    { label: "SSL/TLS (Secure)", value: "OFF (Disable toggle for 587)", key: "m365-secure", raw: false },
                    { label: "Username", value: "Your full Outlook or Office 365 email", key: "m365-user", raw: null },
                    { label: "Password", value: "Your Microsoft password or App Password", key: "m365-pass", raw: null },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-card">
                      <span className="font-medium text-muted-foreground">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground font-medium">{row.value}</span>
                        {row.raw !== null && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(String(row.raw ?? row.value), row.key)}
                          >
                            {copiedKey === row.key ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Apply preset to fill Microsoft 365 host and port in Settings.
                </p>
                <Button
                  onClick={() => handleApplyPreset("outlook")}
                  className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Use Microsoft 365 Preset & Open Settings <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* HOSTINGER TAB */}
          {activeTab === "hostinger" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-xs text-purple-950 dark:text-purple-200">
                <div className="flex items-start gap-2.5">
                  <Server className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-900 dark:text-purple-300">
                      Hostinger Business Email &amp; Titan Mail
                    </p>
                    <p className="mt-1 opacity-90 leading-relaxed">
                      Hostinger uses dedicated SMTP host <code className="px-1 py-0.5 bg-muted rounded font-mono font-semibold">smtp.hostinger.com</code> with SSL encryption on Port <strong>465</strong>. Use your regular Hostinger webmail password.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" /> How to find details in Hostinger:
                </h4>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Log in to Hostinger hPanel</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Open your Hostinger dashboard and navigate to <strong>Emails</strong>.
                      </p>
                      <a
                        href="https://hpanel.hostinger.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1.5"
                      >
                        Open Hostinger hPanel <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Locate Email Account Settings</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select your domain name, click <strong>Manage</strong>, and view <strong>Connect Apps &amp; Devices</strong> or manual configuration.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameters Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Hostinger Connection Parameters
                  </span>
                  <Badge variant="secondary" className="text-[11px]">Port 465 (SSL Encrypted)</Badge>
                </div>
                <div className="divide-y divide-border text-xs sm:text-sm">
                  {[
                    { label: "SMTP Host", value: "smtp.hostinger.com", key: "hostinger-host" },
                    { label: "Port", value: "465", key: "hostinger-port" },
                    { label: "SSL/TLS (Secure)", value: "ON (Enable toggle for 465)", key: "hostinger-secure", raw: true },
                    { label: "Username", value: "Your complete Hostinger email (e.g. info@yourfirm.com)", key: "hostinger-user", raw: null },
                    { label: "Password", value: "Your Hostinger email account password", key: "hostinger-pass", raw: null },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-card">
                      <span className="font-medium text-muted-foreground">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground font-medium">{row.value}</span>
                        {row.raw !== null && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(String(row.raw ?? row.value), row.key)}
                          >
                            {copiedKey === row.key ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Apply preset to fill Hostinger server details in Settings.
                </p>
                <Button
                  onClick={() => handleApplyPreset("hostinger")}
                  className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Use Hostinger Preset & Open Settings <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* GODADDY TAB */}
          {activeTab === "godaddy" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 text-xs text-teal-950 dark:text-teal-200">
                <div className="flex items-start gap-2.5">
                  <Globe className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-teal-900 dark:text-teal-300">
                      GoDaddy Webmail &amp; Microsoft 365
                    </p>
                    <p className="mt-1 opacity-90 leading-relaxed">
                      If your GoDaddy email runs on <strong>Microsoft 365</strong>, use our <strong>Microsoft 365 preset</strong> (<code className="font-mono font-semibold">smtp.office365.com</code>, Port 587). For standard <strong>GoDaddy Workspace / cPanel Webmail</strong>, use the parameters below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" /> Setup Steps:
                </h4>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">GoDaddy Account Products</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Log in to GoDaddy and open your <strong>Email &amp; Office Dashboard</strong>.
                      </p>
                      <a
                        href="https://account.godaddy.com/products"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1.5"
                      >
                        GoDaddy My Products <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Standard GoDaddy Outgoing Server</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Use host <code className="px-1 py-0.5 bg-muted rounded font-mono text-foreground font-semibold">smtpout.secureserver.net</code> with port <strong>465</strong> (SSL) and your email account password.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameters Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    GoDaddy Connection Parameters
                  </span>
                  <Badge variant="secondary" className="text-[11px]">Port 465 (SSL)</Badge>
                </div>
                <div className="divide-y divide-border text-xs sm:text-sm">
                  {[
                    { label: "SMTP Host", value: "smtpout.secureserver.net", key: "godaddy-host" },
                    { label: "Port", value: "465", key: "godaddy-port" },
                    { label: "SSL/TLS (Secure)", value: "ON (Enable toggle for 465)", key: "godaddy-secure", raw: true },
                    { label: "Username", value: "Your complete GoDaddy email (e.g. contact@yourfirm.com)", key: "godaddy-user", raw: null },
                    { label: "Password", value: "Your GoDaddy email account password", key: "godaddy-pass", raw: null },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-card">
                      <span className="font-medium text-muted-foreground">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground font-medium">{row.value}</span>
                        {row.raw !== null && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(String(row.raw ?? row.value), row.key)}
                          >
                            {copiedKey === row.key ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Apply preset to fill GoDaddy server details in Settings.
                </p>
                <Button
                  onClick={() => handleApplyPreset("godaddy")}
                  className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Use GoDaddy Preset & Open Settings <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ZOHO TAB */}
          {activeTab === "zoho" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Zoho Domain Region Note</p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      If your account is registered on Zoho India (ends in <strong>.in</strong>), use host <code className="px-1 py-0.5 bg-muted rounded font-mono text-foreground font-semibold">smtp.zoho.in</code>. For global/US accounts, use <code className="px-1 py-0.5 bg-muted rounded font-mono text-foreground font-semibold">smtp.zoho.com</code>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" /> How to get Zoho App Password:
                </h4>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Log in to Zoho Account</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Open Zoho Accounts security page and select <strong>Security &gt; App Passwords</strong>.
                      </p>
                      <div className="flex gap-4 mt-1.5">
                        <a
                          href="https://accounts.zoho.in/#security/app_password"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          Zoho India App Passwords <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                          href="https://accounts.zoho.com/#security/app_password"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          Zoho Global App Passwords <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Generate New Password</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Click &quot;Generate New Password&quot;, enter App Name as &quot;Lekvya&quot;, and copy the generated password.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameters Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Zoho Mail Parameters
                  </span>
                  <Badge variant="secondary" className="text-[11px]">Port 465 (SSL)</Badge>
                </div>
                <div className="divide-y divide-border text-xs sm:text-sm">
                  {[
                    { label: "Host (India accounts)", value: "smtp.zoho.in", key: "zoho-in-host" },
                    { label: "Host (Global accounts)", value: "smtp.zoho.com", key: "zoho-global-host" },
                    { label: "Port", value: "465", key: "zoho-port" },
                    { label: "SSL/TLS (Secure)", value: "ON (Enable toggle for 465)", key: "zoho-secure", raw: true },
                    { label: "Username", value: "Your full Zoho email address", key: "zoho-user", raw: null },
                    { label: "Password", value: "Generated Zoho App-specific password", key: "zoho-pass", raw: null },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-card">
                      <span className="font-medium text-muted-foreground">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground font-medium">{row.value}</span>
                        {row.raw !== null && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(String(row.raw ?? row.value), row.key)}
                          >
                            {copiedKey === row.key ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleApplyPreset("zoho_in")}
                  className="gap-2"
                >
                  Use Zoho India (.in) Preset
                </Button>
                <Button
                  onClick={() => handleApplyPreset("zoho_global")}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Use Zoho Global (.com) Preset <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* CUSTOM / CPANEL TAB */}
          {activeTab === "custom" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs">
                <p className="font-semibold text-foreground">cPanel, Hostinger, GoDaddy, Namecheap &amp; Webmail</p>
                <p className="text-muted-foreground mt-1 leading-relaxed">
                  If you have business email on your domain (e.g. <code className="font-mono text-foreground">contact@yourfirm.com</code>), your hosting provider gives you dedicated SMTP details in your cPanel.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" /> Where to find them in cPanel:
                </h4>

                <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <p>1. Log in to your hosting cPanel or control panel.</p>
                  <p>2. Open <strong>Email Accounts</strong>.</p>
                  <p>3. Next to your email, click <strong>Connect Devices</strong> or <strong>Set Up Mail Client</strong>.</p>
                  <p>4. Look for the box titled <strong>&quot;Mail Client Manual Settings (Secure SSL/TLS Settings)&quot;</strong>.</p>
                </div>
              </div>

              {/* Standard cPanel parameters */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/60 border-b border-border">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Typical Webmail Settings
                  </span>
                </div>
                <div className="divide-y divide-border text-xs sm:text-sm">
                  {[
                    { label: "Outgoing Server", value: "mail.yourdomain.com", key: "custom-host" },
                    { label: "SMTP Port (SSL)", value: "465 (Secure toggle ON)", key: "custom-port-ssl" },
                    { label: "SMTP Port (TLS)", value: "587 (Secure toggle OFF)", key: "custom-port-tls" },
                    { label: "Username", value: "Your complete email address", key: "custom-user", raw: null },
                    { label: "Password", value: "Your webmail email account password", key: "custom-pass", raw: null },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-card">
                      <span className="font-medium text-muted-foreground">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground font-medium">{row.value}</span>
                        {row.raw !== null && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(String(row.raw ?? row.value), row.key)}
                          >
                            {copiedKey === row.key ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Open settings to enter your custom domain server details.
                </p>
                <Button
                  onClick={() => handleApplyPreset("custom")}
                  className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Configure Custom SMTP in Settings <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Test reminder box */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Verify Before Sending</p>
              <p className="mt-0.5">
                After saving your settings, use the built-in <strong>&quot;Send Test Mail&quot;</strong> feature to verify connection before scheduling emails to clients.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
