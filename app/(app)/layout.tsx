import { DashboardShell } from "@/components/dashboard-shell"

/** One shared frame (auth, sidebar, header) for every org-user page in this group. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
