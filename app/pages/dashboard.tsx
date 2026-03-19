"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Clock,
  Mail,
  MailCheck,
  MailX,
  FileText,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getClients,
  getScheduledEmails,
  getOrgEmailTemplates,
} from "@/lib/api/index"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import type { ScheduledEmail } from "@/lib/api/index"

interface DashboardStats {
  totalClients: number
  totalScheduled: number
  totalSent: number
  totalFailed: number
  totalTemplates: number
  successRate: number
  recentEmails: ScheduledEmail[]
}

export function Dashboard() {
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalScheduled: 0,
    totalSent: 0,
    totalFailed: 0,
    totalTemplates: 0,
    successRate: 0,
    recentEmails: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      const clientsResponse = await getClients()
      const totalClients = clientsResponse.total || 0

      const orgTemplatesResponse = await getOrgEmailTemplates({ limit: 1000 }).catch(() => [])
      const orgTemplatesList = Array.isArray(orgTemplatesResponse)
        ? orgTemplatesResponse
        : (orgTemplatesResponse as { templates?: unknown[] })?.templates ?? []
      const totalTemplates = orgTemplatesList?.length || 0

      let scheduledCount = 0
      let sentCount = 0
      let failedCount = 0
      const recentEmails: ScheduledEmail[] = []

      const clientsListResponse = await getClients()
      const clients = clientsListResponse.clients || []
      const twentyFourHoursAgo = new Date().getTime() - 24 * 60 * 60 * 1000

      const emailResults = await Promise.all(
        clients.map((client) =>
          getScheduledEmails(client.id, { limit: 1000 }).catch(() => ({
            scheduled_emails: [] as ScheduledEmail[],
          }))
        )
      )

      for (const emails of emailResults.map((r) => r.scheduled_emails || [])) {
        const pendingEmails = emails.filter((email) => {
          if (email.status !== "pending") return false
          const scheduledTime = (email as { scheduled_datetime?: string }).scheduled_datetime
            ? new Date((email as { scheduled_datetime: string }).scheduled_datetime).getTime()
            : 0
          return scheduledTime > twentyFourHoursAgo
        })
        scheduledCount += pendingEmails.length
        const sentEmails = emails.filter((e) => e.status === "sent")
        sentCount += sentEmails.length
        const failedEmails = emails.filter((e) => e.status === "failed")
        failedCount += failedEmails.length
        const clientRecent = emails
          .filter((e) => e.status === "sent" || e.status === "failed")
          .sort((a, b) => {
            const dateA = (a as { scheduled_datetime?: string }).scheduled_datetime ? new Date((a as { scheduled_datetime: string }).scheduled_datetime).getTime() : 0
            const dateB = (b as { scheduled_datetime?: string }).scheduled_datetime ? new Date((b as { scheduled_datetime: string }).scheduled_datetime).getTime() : 0
            return dateB - dateA
          })
          .slice(0, 3)
        recentEmails.push(...(clientRecent as ScheduledEmail[]))
      }

      const totalProcessed = sentCount + failedCount
      const successRate =
        totalProcessed > 0 ? Math.round((sentCount / totalProcessed) * 100) : 0

      recentEmails.sort((a, b) => {
        const dateA = (a as unknown as { scheduled_datetime?: string }).scheduled_datetime ? new Date((a as unknown as { scheduled_datetime: string }).scheduled_datetime).getTime() : 0
        const dateB = (b as unknown as { scheduled_datetime?: string }).scheduled_datetime ? new Date((b as unknown as { scheduled_datetime: string }).scheduled_datetime).getTime() : 0
        return dateB - dateA
      })

      setStats({
        totalClients,
        totalScheduled: scheduledCount,
        totalSent: sentCount,
        totalFailed: failedCount,
        totalTemplates,
        successRate,
        recentEmails: recentEmails.slice(0, 10),
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: ScheduledEmail["status"]) => {
    switch (status) {
      case "sent":
        return (
          <Badge
            variant="secondary"
            className="bg-success/15 text-success border-0 font-medium gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3" />
            Sent
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="font-medium gap-1">
            <Clock className="h-3.5 w-3" />
            Pending
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive" className="font-medium gap-1">
            <XCircle className="h-3.5 w-3" />
            Failed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="font-medium gap-1">
            <AlertCircle className="h-3.5 w-3" />
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="min-h-full bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Overview of clients, email delivery, and recent activity
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-4 w-4 shrink-0" />
              <span>Updated {format(new Date(), "MMM d, yyyy · HH:mm")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* KPI cards */}
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              {
                label: "Total Clients",
                value: stats.totalClients,
                icon: Users,
                desc: "Registered",
                theme: "primary",
              },
              {
                label: "Scheduled",
                value: stats.totalScheduled,
                icon: Clock,
                desc: "Pending emails",
                theme: "warning",
              },
              {
                label: "Sent",
                value: stats.totalSent,
                icon: MailCheck,
                desc: "Delivered",
                theme: "success",
              },
              {
                label: "Failed",
                value: stats.totalFailed,
                icon: MailX,
                desc: "Delivery failed",
                theme: "destructive",
              },
              {
                label: "Templates",
                value: stats.totalTemplates,
                icon: FileText,
                desc: "Available",
                theme: "muted",
              },
              {
                label: "Success Rate",
                value: `${stats.successRate}%`,
                icon: TrendingUp,
                desc: "Last period",
                theme:
                  stats.successRate >= 90
                    ? "success"
                    : stats.successRate >= 70
                      ? "warning"
                      : "destructive",
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Card
                  key={item.label}
                  className="overflow-hidden border-border bg-card transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-5">
                    {isLoading ? (
                      <div className="space-y-3">
                        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                        <div className="h-8 w-16 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {item.label}
                          </span>
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              item.theme === "primary"
                                ? "bg-primary/10 text-primary"
                                : item.theme === "success"
                                  ? "bg-success/15 text-success"
                                  : item.theme === "warning"
                                    ? "bg-warning/15 text-warning"
                                    : item.theme === "destructive"
                                      ? "bg-destructive/10 text-destructive"
                                      : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                        </div>
                        <p className="mt-3 kpi-medium text-foreground">
                          {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : item.value}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.desc}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Main content: Activity + Side panels */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Recent Email Activity - takes 2 cols on xl */}
          <Card className="xl:col-span-2 border-border bg-card">
            <CardHeader className="px-6 pb-4 pt-6 sm:px-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Recent Email Activity
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Latest sends across all clients
                  </CardDescription>
                </div>
                {!isLoading && stats.recentEmails.length > 0 && (
                  <Badge variant="secondary" className="w-fit text-xs font-normal">
                    {stats.recentEmails.length} items
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              {isLoading ? (
                <div className="space-y-0 divide-y divide-border">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 py-4 first:pt-0"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-muted animate-pulse" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.recentEmails.length > 0 ? (
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {stats.recentEmails.map((email, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-2 bg-card px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            email.status === "sent"
                              ? "bg-success/15 text-success"
                              : email.status === "failed"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {email.status === "sent" ? (
                            <MailCheck className="h-5 w-5" />
                          ) : email.status === "failed" ? (
                            <MailX className="h-5 w-5" />
                          ) : (
                            <Mail className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {Array.isArray(email.recipient_emails) &&
                            email.recipient_emails.length > 0
                              ? email.recipient_emails.join(", ")
                              : "No recipient"}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3 shrink-0" />
                              {String((email as { template_name?: string }).template_name || "Unknown template")}
                            </span>
                            {(email as { scheduled_datetime?: string }).scheduled_datetime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                {format(
                                  new Date(String((email as unknown as { scheduled_datetime: string }).scheduled_datetime)),
                                  "MMM d, HH:mm"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 sm:pl-2">
                        {getStatusBadge(email.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    No recent activity
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Email sends will show here once deliveries are made
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column: Performance + Overview */}
          <div className="space-y-6 xl:col-span-1">
            <Card className="border-border bg-card">
              <CardHeader className="px-6 pb-3 pt-6 sm:px-6">
                <CardTitle className="text-base font-semibold">
                  Email Performance
                </CardTitle>
                <CardDescription className="text-xs">
                  Delivery success vs failed
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
                    <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Processed</span>
                      <span className="font-semibold text-foreground">
                        {(stats.totalSent + stats.totalFailed).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Success</span>
                        <span className="font-medium text-success">
                          {stats.totalSent.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-success transition-all duration-500"
                          style={{
                            width: `${
                              stats.totalSent + stats.totalFailed > 0
                                ? (stats.totalSent /
                                    (stats.totalSent + stats.totalFailed)) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Failed</span>
                        <span className="font-medium text-destructive">
                          {stats.totalFailed.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-destructive transition-all duration-500"
                          style={{
                            width: `${
                              stats.totalSent + stats.totalFailed > 0
                                ? (stats.totalFailed /
                                    (stats.totalSent + stats.totalFailed)) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="px-6 pb-3 pt-6 sm:px-6">
                <CardTitle className="text-base font-semibold">
                  System Overview
                </CardTitle>
                <CardDescription className="text-xs">
                  Key metrics at a glance
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-10 w-full rounded-lg bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {[
                      {
                        label: "Active clients",
                        value: stats.totalClients.toLocaleString(),
                        icon: Users,
                      },
                      {
                        label: "Email templates",
                        value: stats.totalTemplates.toLocaleString(),
                        icon: FileText,
                      },
                      {
                        label: "Pending emails",
                        value: stats.totalScheduled.toLocaleString(),
                        icon: Clock,
                      },
                    ].map((row) => {
                      const Icon = row.icon
                      return (
                        <li
                          key={row.label}
                          className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0"
                        >
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                            {row.label}
                          </span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {row.value}
                          </span>
                        </li>
                      )
                    })}
                    <li className="flex items-center justify-between gap-3 border-t border-border pt-3 mt-2 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                        Success rate
                      </span>
                      <span
                        className={`font-semibold tabular-nums ${
                          stats.successRate >= 90
                            ? "text-success"
                            : stats.successRate >= 70
                              ? "text-warning"
                              : "text-destructive"
                        }`}
                      >
                        {stats.successRate}%
                      </span>
                    </li>
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
