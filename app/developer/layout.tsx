import { DashboardShell } from "@/components/dashboard-shell"

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
