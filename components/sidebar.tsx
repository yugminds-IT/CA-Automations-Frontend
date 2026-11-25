"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, SquarePen } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { getUserData, getRoleFromUser, getOrganizationData } from "@/lib/api/index"
import { getFormSubmissions } from "@/lib/api/developer"
import { listSchedules } from "@/lib/api/mail-management"
import { COMPOSE_PATH, SECTIONS, activePageId, pagesFor, toIndustry, type BadgeKey, type NavPage } from "@/lib/nav"
import { cn } from "@/lib/utils"

interface SidebarProps {
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (open: boolean) => void
  collapsed?: boolean
}

const WEEK = 7 * 86_400_000
const asList = (r: unknown): any[] => (Array.isArray(r) ? r : ((r as any)?.schedules ?? (r as any)?.data ?? []))

/** Counts that need attention: new form inquiries, sends that failed in the last 7 days */
function useBadges(pages: NavPage[], pathname: string) {
  const [badges, setBadges] = useState<Partial<Record<BadgeKey, number>>>({})
  const wanted = pages.map((p) => p.badge).filter(Boolean).join()
  useEffect(() => {
    let live = true
    const jobs: Promise<[BadgeKey, number]>[] = []
    if (wanted.includes("newInquiries"))
      jobs.push(getFormSubmissions("new").then((l) => ["newInquiries", Array.isArray(l) ? l.length : 0] as [BadgeKey, number]))
    if (wanted.includes("failedSends"))
      jobs.push(listSchedules("failed").then((r) => {
        const since = Date.now() - WEEK
        return ["failedSends", asList(r).filter((s) => Date.parse(s.updatedAt ?? s.scheduledAt ?? 0) >= since).length] as [BadgeKey, number]
      }))
    Promise.allSettled(jobs).then((res) => {
      if (!live) return
      setBadges(Object.fromEntries(res.flatMap((x) => (x.status === "fulfilled" ? [x.value] : []))))
    })
    return () => { live = false }
  }, [wanted, pathname]) // refreshed on navigation, e.g. after reading an inquiry
  return badges
}

const badgeText = (key: BadgeKey, n: number) => (key === "failedSends" ? `${n} failed` : String(n))

export function Sidebar({ mobileMenuOpen: externalOpen, setMobileMenuOpen: setExternalOpen, collapsed = false }: SidebarProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [internalOpen, setInternalOpen] = useState(false)
  const mobileOpen = externalOpen ?? internalOpen
  const setMobileOpen = setExternalOpen ?? setInternalOpen
  const [industry, setIndustry] = useState(() => toIndustry(null))
  const [role, setRole] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const refresh = () => {
      const user = getUserData() as any
      setRole(getRoleFromUser(user))
      setIndustry(toIndustry(getOrganizationData()?.industry || user?.organization?.industry))
    }
    refresh()
    window.addEventListener("userDataUpdated", refresh)
    return () => window.removeEventListener("userDataUpdated", refresh)
  }, [])

  // Ctrl+K / ⌘K opens search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen((o) => !o) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const isClient = role?.toLowerCase() === "client"
  const pages = useMemo(() => pagesFor(industry, role), [industry, role])
  const active = activePageId(pages, pathname)
  const composing = pathname === COMPOSE_PATH
  const badges = useBadges(isClient ? [] : pages, pathname)
  const sections = SECTIONS.map((s) => ({ ...s, pages: pages.filter((p) => p.section === s.id) })).filter((s) => s.pages.length)
  const go = (path: string) => { setSearchOpen(false); setMobileOpen(false); router.push(path) }
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

  const row = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
  const rowState = (on: boolean) => (on
    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground dark:hover:bg-white/5 dark:hover:text-foreground")

  const Badge = ({ p }: { p: NavPage }) => {
    const n = p.badge ? badges[p.badge] : 0
    if (!n || !p.badge) return null
    return (
      <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
        p.badge === "failedSends" ? "bg-destructive/10 text-destructive" : "bg-primary/15 text-primary")}>
        {badgeText(p.badge, n)}
      </span>
    )
  }

  /** Labelled list: used by the wide sidebar and the phone menu */
  const fullNav = (
    <>
      {!isClient && (
        <div className="space-y-1.5 px-3 pt-3">
          <Link href={COMPOSE_PATH} onClick={() => setMobileOpen(false)} aria-current={composing ? "page" : undefined}
            className={cn("flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              "bg-primary text-primary-foreground hover:bg-primary/90", composing && "ring-2 ring-primary/30")}>
            <SquarePen className="h-4 w-4" />Compose email
          </Link>
          <button type="button" onClick={() => setSearchOpen(true)}
            className="flex h-9 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <Search className="h-4 w-4" />Search
            <Kbd className="ml-auto hidden lg:inline-flex">{isMac ? "⌘" : "Ctrl"} K</Kbd>
          </button>
        </div>
      )}
      <nav aria-label="Main navigation" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 [scrollbar-width:thin]">
        {sections.map((s) => (
          <div key={s.id} className={s.id === "bottom" ? "mt-auto border-t border-sidebar-border pt-2" : "pt-4"}>
            {s.id !== "bottom" && <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>}
            <ul className="space-y-0.5">
              {s.pages.map((p) => (
                <li key={p.id}>
                  <Link href={p.path} onClick={() => setMobileOpen(false)} aria-current={active === p.id ? "page" : undefined}
                    className={cn(row, "relative", rowState(active === p.id), active === p.id && "before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-primary")}>
                    <p.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{p.label}</span>
                    <Badge p={p} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  )

  /** Icon rail: same order, dividers between sections; Developers folds into one menu */
  const railIcon = (label: string, el: React.ReactNode) => (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{el}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>{label}</TooltipContent>
    </Tooltip>
  )
  const railBtn = "relative mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
  const dot = (p: NavPage) => p.badge && badges[p.badge]
    ? <span className={cn("absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-sidebar", p.badge === "failedSends" ? "bg-destructive" : "bg-primary")} />
    : null
  const railNav = (
    <nav aria-label="Main navigation" className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-3 [scrollbar-width:none]">
      {!isClient && (
        <>
          {railIcon("Compose email", (
            <Link href={COMPOSE_PATH} aria-label="Compose email" className={cn(railBtn, "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90")}>
              <SquarePen className="h-[18px] w-[18px]" />
            </Link>
          ))}
          {railIcon(`Search (${isMac ? "⌘" : "Ctrl"} K)`, (
            <button type="button" aria-label="Search" onClick={() => setSearchOpen(true)} className={cn(railBtn, rowState(false))}>
              <Search className="h-[18px] w-[18px]" />
            </button>
          ))}
        </>
      )}
      {sections.map((s) => {
        const fold = s.id === "developers" && s.pages.length > 1
        const on = s.pages.some((p) => p.id === active)
        return (
          <div key={s.id} className={cn("flex w-full flex-col items-center gap-1", s.id === "bottom" && "mt-auto")}>
            <span className="my-1 h-px w-8 bg-sidebar-border" aria-hidden />
            {fold ? (
              <DropdownMenu>
                {railIcon(s.label, (
                  <DropdownMenuTrigger aria-label={s.label} className={cn(railBtn, rowState(on))}>
                    <s.icon className="h-[18px] w-[18px]" />
                  </DropdownMenuTrigger>
                ))}
                <DropdownMenuContent side="right" align="start" sideOffset={10} className="w-52">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{s.label}</DropdownMenuLabel>
                  {s.pages.map((p) => (
                    <DropdownMenuItem key={p.id} onSelect={() => go(p.path)} className={cn("gap-2 py-2", active === p.id && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                      <p.icon className="h-4 w-4" />{p.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : s.pages.map((p) => (
              <div key={p.id}>
                {railIcon(p.badge && badges[p.badge] ? `${p.label} · ${badgeText(p.badge, badges[p.badge]!)}` : p.label, (
                  <Link href={p.path} aria-label={p.label} aria-current={active === p.id ? "page" : undefined} className={cn(railBtn, rowState(active === p.id))}>
                    <p.icon className="h-[18px] w-[18px]" />
                    {dot(p)}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )
      })}
    </nav>
  )

  const logo = (small: boolean) => small
    // collapsed: just the robot mark, cut from the wordmark (1818×667, mark at 1422,218 size 350)
    ? <span role="img" aria-label="Lekvya" className="block h-8 w-8 bg-no-repeat"
        style={{ backgroundImage: "url(/Light.png)", backgroundSize: `${(1818 * 32) / 350}px auto`, backgroundPosition: `-${(1422 * 32) / 350}px -${(218 * 32) / 350}px` }} />
    : <img src="/Light.png" alt="Lekvya" className="h-9 w-auto max-w-[150px] object-contain" />

  return (
    <>
      {/* Phones and tablets: slide-in menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="dark sidebar-navy w-[min(300px,100vw-2rem)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="h-16 justify-center border-b border-sidebar-border px-5">
            <SheetTitle className="flex items-center">{logo(false)}</SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100dvh-4rem)] flex-col">{fullNav}</div>
        </SheetContent>
      </Sheet>

      {/* Desktop: a rounded panel floating just inside the page edge */}
      <aside aria-label="Sidebar"
        className={cn("fixed inset-y-0 left-0 z-40 hidden p-2 pr-0 transition-[width] duration-200 ease-out lg:block", collapsed ? "w-[72px]" : "w-64")}>
        <div className="dark sidebar-navy flex h-full flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm">
          <div className={cn("flex h-14 shrink-0 items-center border-b border-sidebar-border", collapsed ? "justify-center" : "px-5")}>
            {logo(collapsed)}
          </div>
          {collapsed ? railNav : fullNav}
        </div>
      </aside>

      {/* Jump to any page by name */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Search" description="Go to a page">
        <CommandInput placeholder="Go to a page…" />
        <CommandList>
          <CommandEmpty>No page matches.</CommandEmpty>
          {!isClient && (
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => go(COMPOSE_PATH)}><SquarePen className="h-4 w-4" />Compose email</CommandItem>
            </CommandGroup>
          )}
          {sections.map((s) => (
            <CommandGroup key={s.id} heading={s.label}>
              {s.pages.map((p) => (
                <CommandItem key={p.id} value={`${p.label} ${s.label}`} onSelect={() => go(p.path)}>
                  <p.icon className="h-4 w-4" />{p.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
