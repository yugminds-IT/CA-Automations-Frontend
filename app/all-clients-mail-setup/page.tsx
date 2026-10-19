"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { SendMails } from "@/components/email-management/send-mails"

export default function AllClientsMailSetupPage() {
  return (
    <DashboardShell>
      <SendMails />
    </DashboardShell>
  )
}
