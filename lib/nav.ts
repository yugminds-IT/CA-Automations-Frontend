import type { LucideIcon } from "lucide-react"
import { BarChart3, Braces, ClipboardList, Building2, Mail, Target, CodeXml, Globe, Inbox, KeyRound, LayoutDashboard, LayoutTemplate, Mails, ScrollText, Settings, ShieldCheck, SlidersHorizontal, Upload, Users, Webhook, Workflow, CheckSquare, CreditCard, Rocket } from "lucide-react"

/**
 * Every page in the sidebar, once. To add a feature: add one line here.
 * Industries only change words (see CLIENTS_WORD) and which pages they get (`only`).
 */
export type NavSection = "workspace" | "email" | "automation" | "developers" | "bottom"
export type BadgeKey = "newInquiries" | "failedSends"

export interface NavPage {
  id: string
  label: string
  icon: LucideIcon
  path: string
  section: NavSection
  /** Shown only for these industries (default: all) */
  only?: Industry[]
  /** Every listed permission is needed to see the page (see access/permissions.ts). Default: none. */
  requires?: string[]
  badge?: BadgeKey
}

export type Industry = "financial_services" | "education" | "website_developer" | "ecommerce" | "healthcare" | "saas" | "custom"

export const SECTIONS: { id: NavSection; label: string; icon: LucideIcon }[] = [
  { id: "workspace", label: "CRM", icon: LayoutDashboard },
  { id: "email", label: "Engage", icon: Mails },
  { id: "automation", label: "Automation", icon: Workflow },
  { id: "developers", label: "Developers", icon: Braces },
  { id: "bottom", label: "Settings", icon: Settings },
]

const DEV: Industry[] = ["financial_services", "website_developer", "ecommerce", "saas", "custom"]

export const PAGES: NavPage[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", section: "workspace" },
  { id: "onboarding", label: "Get started", icon: Rocket, path: "/onboarding", section: "workspace", requires: ["units.manage"] },
  { id: "leads", label: "Leads", icon: Target, path: "/leads", section: "workspace", requires: ["leads.view"] },
  { id: "clients", label: "Clients", icon: Users, path: "/client-management", section: "workspace" },
  { id: "tasks", label: "Tasks", icon: CheckSquare, path: "/tasks", section: "workspace", requires: ["leads.view"] },
  { id: "reports", label: "Reports", icon: BarChart3, path: "/reports", section: "workspace", requires: ["reports.view"] },
  { id: "inquiries", label: "Form inquiries", icon: Inbox, path: "/developer/inbox", section: "workspace", only: ["financial_services", "website_developer", "custom"], badge: "newInquiries", requires: ["inbox.manage"] },

  { id: "emails", label: "Emails", icon: Mails, path: "/email-management/scheduled-mails", section: "email", badge: "failedSends" },
  { id: "templates", label: "Templates", icon: LayoutTemplate, path: "/email-templates", section: "email" },
  { id: "forms", label: "Forms", icon: ClipboardList, path: "/forms", section: "email", requires: ["forms.manage"] },

  { id: "automation", label: "Workflows & rules", icon: Workflow, path: "/settings/automation", section: "automation", requires: ["automation.manage"] },

  { id: "keys", label: "API keys", icon: KeyRound, path: "/developer/keys", section: "developers", only: DEV, requires: ["developer.manage"] },
  { id: "webhooks", label: "Webhooks", icon: Webhook, path: "/developer/webhooks", section: "developers", only: ["financial_services", "website_developer", "saas", "custom"], requires: ["developer.manage"] },
  { id: "logs", label: "Delivery logs", icon: ScrollText, path: "/developer/logs", section: "developers", only: DEV, requires: ["developer.manage"] },
  { id: "code", label: "Form and API code", icon: CodeXml, path: "/developer/quickstart", section: "developers", only: ["website_developer", "saas", "custom"], requires: ["developer.manage"] },

  { id: "settings", label: "Settings", icon: Settings, path: "/settings", section: "bottom" },
  { id: "business-units", label: "Business setup", icon: Building2, path: "/settings/business-units", section: "bottom", requires: ["units.manage"] },
  { id: "mail-accounts", label: "Sending accounts", icon: Mail, path: "/settings/mail-accounts", section: "bottom", requires: ["mail.manage"] },
  { id: "domains", label: "Sending domains", icon: Globe, path: "/settings/domains", section: "bottom", requires: ["mail.manage"] },
  { id: "lead-fields", label: "Lead fields", icon: SlidersHorizontal, path: "/settings/lead-fields", section: "bottom", requires: ["fields.manage"] },
  { id: "staff", label: "Users, teams & access", icon: ShieldCheck, path: "/settings/staff", section: "bottom", requires: ["staff.manage"] },
  { id: "billing", label: "Plan & billing", icon: CreditCard, path: "/settings/billing", section: "bottom" },
]

/** Where "Compose email" goes */
export const COMPOSE_PATH = "/all-clients-mail-setup"

/** What each industry calls the people it emails */
const CLIENTS_WORD: Partial<Record<Industry, string>> = {
  education: "Students",
  ecommerce: "Customers",
  healthcare: "Patients",
  saas: "Users",
  website_developer: "Clients and contacts",
}

export function toIndustry(raw: string | null | undefined): Industry {
  if (raw === "school") return "education"
  const known: Industry[] = ["financial_services", "education", "website_developer", "ecommerce", "healthcare", "saas", "custom"]
  return known.includes(raw as Industry) ? (raw as Industry) : "financial_services"
}

/** Pages that only make sense with several brands. Hidden for a single-branch organization. */
const BRAND_PAGE_IDS = ["business-units"]

/** The pages this org sees, with its own words */
export function pagesFor(
  industry: Industry,
  role?: string | null,
  permissions?: readonly string[] | null,
  /** False for a single-branch organization: the brand pages are hidden. Default: true. */
  adminPanel: boolean = true,
): NavPage[] {
  if (role?.toLowerCase() === "client") return [{ id: "uploads", label: "Uploads", icon: Upload, path: "/uploads", section: "workspace" }]
  // While permissions are still loading (null) every page is listed. The server checks each request anyway.
  const allowed = (p: NavPage) => !p.requires || !permissions || p.requires.every((k) => permissions.includes(k))
  const shown = (p: NavPage) => adminPanel || !BRAND_PAGE_IDS.includes(p.id)
  return PAGES.filter((p) => (!p.only || p.only.includes(industry)) && allowed(p) && shown(p)).map((p) =>
    p.id === "clients" && CLIENTS_WORD[industry] ? { ...p, label: CLIENTS_WORD[industry]! } : p,
  )
}

/** The page a path belongs to: exact match first, then the longest prefix (/client-management/12 → Clients) */
export function activePageId(pages: { id: string; path: string }[], pathname: string): string | null {
  const exact = pages.find((p) => p.path === pathname)
  if (exact) return exact.id
  const prefix = pages.filter((p) => pathname.startsWith(p.path + "/")).sort((a, b) => b.path.length - a.path.length)[0]
  return prefix?.id ?? null
}
