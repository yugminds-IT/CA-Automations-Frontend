"use client"

import { useEffect, useState } from "react"
import { Dashboard } from "@/components/pages/dashboard"
import { getMe } from "@/lib/api/index"

/** Org user home. Shows a notice when the organization's access ends within 3 days. */
export default function DashboardHomePage() {
  const [trialNotice, setTrialNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = (await getMe()) as {
          organization?: { accessUntil?: string | null; approvalStatus?: string }
        }
        const until = me?.organization?.accessUntil
        if (!until || me?.organization?.approvalStatus !== "approved") return
        const daysLeft = (new Date(until).getTime() - Date.now()) / 86400000
        if (!cancelled && daysLeft > 0 && daysLeft <= 3) {
          setTrialNotice(
            `Your access ends on ${new Date(until).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}. Purchase a subscription or contact support to extend.`,
          )
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-full flex-col">
      {trialNotice && (
        <div
          role="status"
          className="mx-4 mt-4 sm:mx-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {trialNotice}
        </div>
      )}
      <Dashboard />
    </div>
  )
}
