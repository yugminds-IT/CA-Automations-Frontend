import type { ReactNode } from "react"
import { MasterAdminShell } from "@/components/master-admin-shell"

export default function MasterAdminLayout({ children }: { children: ReactNode }) {
  return <MasterAdminShell>{children}</MasterAdminShell>
}
