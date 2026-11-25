import type { LucideIcon } from "lucide-react"
import {
  Braces,
  CodeXml,
  Globe,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Mails,
  ScrollText,
  Settings,
  Upload,
  Users,
  Webhook,
} from "lucide-react"

/**
 * Every page in the sidebar, once. To add a feature: add one line here.
 * Industries only change words (see CLIENTS_WORD) and which pages they get (`only`).
 */
export type NavSection = "workspace" | "email" | "developers" | "bottom"
export type BadgeKey = "newInquiries" | "failedSends"

export interface NavPage {
  id: string
  label: string
  icon: LucideIcon
  path: string
  section: NavSection
  /** Shown only for these industries (default: all) */
  only?: Industry[]
  badge?: BadgeKey
}

export type Industry = "financial_services" | "education" | "website_developer" | "ecommerce" | "healthcare" | "saas"

export const SECTIONS: { id: NavSection; label: string; icon: LucideIcon }[] = [
  { id: "workspace", label: "Workspace", icon: LayoutDashboard },
  { id: "email", label: "Email", icon: Mails },
  { id: "developers", label: "Developers", icon: Braces },
  { id: "bottom", label: "Account", icon: Settings },
]

const DEV: Industry[] = ["financial_services", "website_developer", "ecommerce", "saas"]

export const PAGES: NavPage[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", section: "workspace" },
  { id: "clients", label: "Clients", icon: Users, path: "/client-management", section: "workspace" },
  { id: "inquiries", label: "Form inquiries", icon: Inbox, path: "/developer/inbox", section: "workspace", only: ["financial_services", "website_developer"], badge: "newInquiries" },

  { id: "emails", label: "Emails", icon: Mails, path: "/email-management/scheduled-mails", section: "email", badge: "failedSends" },
  { id: "templates", label: "Templates", icon: LayoutTemplate, path: "/email-templates", section: "email" },

  { id: "keys", label: "API keys", icon: KeyRound, path: "/developer/keys", section: "developers", only: DEV },
  { id: "webhooks", label: "Webhooks", icon: Webhook, path: "/developer/webhooks", section: "developers", only: ["financial_services", "website_developer", "saas"] },
  { id: "logs", label: "Delivery logs", icon: ScrollText, path: "/developer/logs", section: "developers", only: DEV },
  { id: "code", label: "Form and API code", icon: CodeXml, path: "/developer/quickstart", section: "developers", only: ["website_developer", "saas"] },

  { id: "settings", label: "Settings", icon: Settings, path: "/settings", section: "bottom" },
  { id: "domains", label: "Sending domains", icon: Globe, path: "/settings/domains", section: "bottom" },
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
  const known: Industry[] = ["financial_services", "education", "website_developer", "ecommerce", "healthcare", "saas"]
  return known.includes(raw as Industry) ? (raw as Industry) : "financial_services"
}

/** The pages this org sees, with its own words */
export function pagesFor(industry: Industry, role?: string | null): NavPage[] {
  if (role?.toLowerCase() === "client") return [{ id: "uploads", label: "Uploads", icon: Upload, path: "/uploads", section: "workspace" }]
  return PAGES.filter((p) => !p.only || p.only.includes(industry)).map((p) =>
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
