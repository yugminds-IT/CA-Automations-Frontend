'use client'

import { User, FolderOpen, Receipt, FileBarChart2, CreditCard, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type ClientDetailSection = 'details' | 'files' | 'tds' | 'gst' | 'bank-statement'

interface ClientDetailSidebarProps {
  clientName?: string
  activeSection: ClientDetailSection
  onSectionChange: (section: ClientDetailSection) => void
  collapsed?: boolean
  offsetLeft?: number
}

const NAV_ITEMS: { id: ClientDetailSection; label: string; icon: React.ElementType }[] = [
  { id: 'details',        label: 'Client Details', icon: User },
  { id: 'files',          label: 'Files',          icon: FolderOpen },
  { id: 'tds',            label: 'TDS',            icon: Receipt },
  { id: 'gst',            label: 'GST',            icon: FileBarChart2 },
  { id: 'bank-statement', label: 'Bank Statement', icon: CreditCard },
]

export function ClientDetailSidebar({
  clientName,
  activeSection,
  onSectionChange,
  collapsed = false,
  offsetLeft = 0,
}: ClientDetailSidebarProps) {
  const router = useRouter()

  return (
    <aside
      className="hidden lg:flex bg-sidebar text-sidebar-foreground flex-col h-screen fixed top-0 bottom-0 z-[50] transition-[width] duration-300 ease-out"
      style={{
        left: `${offsetLeft}px`,
        width: collapsed ? '60px' : '240px',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Logo */}
      <div className={`shrink-0 border-b border-sidebar-border ${collapsed ? 'py-4 px-2' : 'py-5 px-4'}`}>
        <div className="flex items-center justify-center">
          {collapsed ? (
            <>
              <img src="/Light.png" className="h-10 w-10 object-contain dark:hidden" alt="Lekvya" />
              <img src="/Light.png" className="h-10 w-10 object-contain hidden dark:block" alt="Lekvya" />
            </>
          ) : (
            <>
              <img src="/Light.png" className="h-12 w-auto max-w-[180px] object-contain dark:hidden" alt="Lekvya" />
              <img src="/Light.png" className="h-12 w-auto max-w-[180px] object-contain hidden dark:block" alt="Lekvya" />
            </>
          )}
        </div>
      </div>

      {/* Client name badge */}
      {!collapsed && clientName && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-[10px] uppercase font-semibold tracking-wider text-sidebar-foreground/50 mb-0.5">Client</p>
          <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight" title={clientName}>
            {clientName}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto" aria-label="Client navigation">
        <ul className={collapsed ? 'space-y-0.5' : 'space-y-1'}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id
            const btn = (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={`
                    relative w-full flex items-center text-[13px] font-medium
                    rounded-none transition-all duration-200 ease-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar
                    ${collapsed ? 'px-2 justify-center py-3' : 'px-3 py-2.5 gap-3'}
                    ${isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 dark:hover:bg-sidebar-accent/30'
                    }
                  `}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sidebar-primary" aria-hidden />
                  )}
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.id} delayDuration={300}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }
            return btn
          })}
        </ul>
      </nav>

      {/* Back to Clients */}
      <div className="shrink-0 border-t border-sidebar-border">
        {collapsed ? (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => router.push('/client-management')}
                className="w-full flex items-center justify-center py-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              Back to Clients
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/client-management')}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span>Back to Clients</span>
          </button>
        )}
      </div>
    </aside>
  )
}
