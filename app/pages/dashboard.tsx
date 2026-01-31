"use client"

import { useState, useEffect } from 'react'
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
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getClients, getScheduledEmails, getOrgEmailTemplates, getMasterEmailTemplates } from '@/lib/api/index'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import type { ScheduledEmail } from '@/lib/api/index'

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
    recentEmails: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch total clients
      const clientsResponse = await getClients({ limit: 1 })
      const totalClients = clientsResponse.total || 0

      // Fetch email templates (listTemplates returns array directly)
      const [orgTemplatesResponse, masterTemplatesResponse] = await Promise.all([
        getOrgEmailTemplates({ limit: 1000 }).catch(() => []),
        getMasterEmailTemplates({ limit: 1000 }).catch(() => [])
      ])
      const orgTemplatesList = Array.isArray(orgTemplatesResponse) ? orgTemplatesResponse : (orgTemplatesResponse?.templates ?? [])
      const masterTemplatesList = Array.isArray(masterTemplatesResponse) ? masterTemplatesResponse : (masterTemplatesResponse?.templates ?? [])
      const totalTemplates = (orgTemplatesList?.length || 0) + (masterTemplatesList?.length || 0)

      // Fetch scheduled and sent emails for all clients
      let scheduledCount = 0
      let sentCount = 0
      let failedCount = 0
      const recentEmails: ScheduledEmail[] = []
      
      const clientsListResponse = await getClients({ limit: 1000 })
      const clients = clientsListResponse.clients || []
      const twentyFourHoursAgo = new Date().getTime() - (24 * 60 * 60 * 1000) // 24 hours in milliseconds
      
      // Fetch once per view: all clients in parallel (one batch, not N sequential requests)
      const emailResults = await Promise.all(
        clients.map((client) =>
          getScheduledEmails(client.id, { limit: 1000 }).catch(() => ({ scheduled_emails: [] as ScheduledEmail[] }))
        )
      )
      
      for (const emails of emailResults.map((r) => r.scheduled_emails || [])) {
        // Count pending emails that are still valid (not more than 24 hours past scheduled time)
        const pendingEmails = emails.filter(email => {
          if (email.status !== 'pending') return false
          const scheduledTime = email.scheduled_datetime ? new Date(email.scheduled_datetime).getTime() : 0
          return scheduledTime > twentyFourHoursAgo
        })
        scheduledCount += pendingEmails.length

        const sentEmails = emails.filter(email => email.status === 'sent')
        sentCount += sentEmails.length

        const failedEmails = emails.filter(email => email.status === 'failed')
        failedCount += failedEmails.length
        
        const clientRecentEmails = emails
          .filter(email => email.status === 'sent' || email.status === 'failed')
          .sort((a, b) => {
            const dateA = a.scheduled_datetime ? new Date(a.scheduled_datetime).getTime() : 0
            const dateB = b.scheduled_datetime ? new Date(b.scheduled_datetime).getTime() : 0
            return dateB - dateA
          })
          .slice(0, 3)
        recentEmails.push(...clientRecentEmails)
      }

      // Calculate success rate
      const totalProcessed = sentCount + failedCount
      const successRate = totalProcessed > 0 ? Math.round((sentCount / totalProcessed) * 100) : 0

      // Sort recent emails by date (most recent first)
      recentEmails.sort((a, b) => {
        const dateA = a.scheduled_datetime ? new Date(a.scheduled_datetime).getTime() : 0
        const dateB = b.scheduled_datetime ? new Date(b.scheduled_datetime).getTime() : 0
        return dateB - dateA
      })

      setStats({
        totalClients,
        totalScheduled: scheduledCount,
        totalSent: sentCount,
        totalFailed: failedCount,
        totalTemplates,
        successRate,
        recentEmails: recentEmails.slice(0, 10)
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    color = "primary",
    trend 
  }: { 
    title: string
    value: number | string
    description: string
    icon: React.ElementType
    color?: "primary" | "success" | "warning" | "danger" | "info"
    trend?: { value: number; label: string }
  }) => {
    const colorClasses = {
      primary: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20",
      success: "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20",
      warning: "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20",
      danger: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20",
      info: "border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20"
    }

    const iconColors = {
      primary: "text-blue-600 dark:text-blue-400",
      success: "text-green-600 dark:text-green-400",
      warning: "text-yellow-600 dark:text-yellow-400",
      danger: "text-red-600 dark:text-red-400",
      info: "text-purple-600 dark:text-purple-400"
    }

    return (
      <Card className={`${colorClasses[color]} transition-all hover:shadow-md`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
          <Icon className={`h-5 w-5 ${iconColors[color]}`} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{description}</p>
              {trend && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{trend.label}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: ScheduledEmail['status']) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your system statistics and recent activity
          </p>
        </div>
        <Badge variant="outline" className="text-xs w-fit">
          <Activity className="h-3 w-3 mr-1" />
          Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
        </Badge>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          description="Registered clients in the system"
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Mails Scheduled"
          value={stats.totalScheduled}
          description="Pending scheduled emails"
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Mails Sent"
          value={stats.totalSent}
          description="Successfully sent emails"
          icon={MailCheck}
          color="success"
        />
        <StatCard
          title="Mails Failed"
          value={stats.totalFailed}
          description="Failed email deliveries"
          icon={MailX}
          color="danger"
        />
        <StatCard
          title="Email Templates"
          value={stats.totalTemplates}
          description="Available email templates"
          icon={FileText}
          color="info"
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          description="Email delivery success rate"
          icon={TrendingUp}
          color={stats.successRate >= 90 ? "success" : stats.successRate >= 70 ? "warning" : "danger"}
        />
      </div>

      {/* Recent Activity Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Recent Email Activity</CardTitle>
              <CardDescription className="text-xs mt-1">
                Latest email sending activity across all clients
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {stats.recentEmails.length} recent
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4 py-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats.recentEmails.length > 0 ? (
            <div className="space-y-4">
              {stats.recentEmails.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      email.status === 'sent' 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : email.status === 'failed'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-muted'
                    }`}>
                      {email.status === 'sent' ? (
                        <MailCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : email.status === 'failed' ? (
                        <MailX className="h-5 w-5 text-red-600 dark:text-red-400" />
                      ) : (
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {email.recipient_emails && email.recipient_emails.length > 0 
                            ? email.recipient_emails.join(', ') 
                            : 'No recipient'}
                        </p>
                        {getStatusBadge(email.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {email.template_name || 'Unknown Template'}
                        </span>
                        {email.scheduled_datetime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(email.scheduled_datetime), 'MMM dd, yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md bg-muted/30">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No recent email activity</p>
              <p className="text-xs mt-1">Email activity will appear here once emails are sent</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Email Performance</CardTitle>
            <CardDescription className="text-xs">Overall email delivery statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-6 w-full bg-muted animate-pulse rounded" />
                <div className="h-6 w-full bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Processed</span>
                  <span className="text-sm font-semibold">
                    {(stats.totalSent + stats.totalFailed).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Successful</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {stats.totalSent.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${stats.totalSent + stats.totalFailed > 0 
                          ? (stats.totalSent / (stats.totalSent + stats.totalFailed)) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Failed</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {stats.totalFailed.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${stats.totalSent + stats.totalFailed > 0 
                          ? (stats.totalFailed / (stats.totalSent + stats.totalFailed)) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">System Overview</CardTitle>
            <CardDescription className="text-xs">Key system metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-6 w-full bg-muted animate-pulse rounded" />
                <div className="h-6 w-full bg-muted animate-pulse rounded" />
                <div className="h-6 w-full bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Active Clients
                  </span>
                  <span className="text-sm font-semibold">{stats.totalClients.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Email Templates
                  </span>
                  <span className="text-sm font-semibold">{stats.totalTemplates.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Emails
                  </span>
                  <span className="text-sm font-semibold">{stats.totalScheduled.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Success Rate
                  </span>
                  <span className={`text-sm font-semibold ${
                    stats.successRate >= 90 
                      ? 'text-green-600 dark:text-green-400' 
                      : stats.successRate >= 70 
                      ? 'text-yellow-600 dark:text-yellow-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stats.successRate}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
