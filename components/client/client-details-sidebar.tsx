'use client'

import {
  User,
  FolderOpen,
  Landmark,
  Receipt,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type ClientDetailsSidebarTab =
  | 'details'
  | 'files'
  | 'bank-statement'
  | 'invoice'
  | 'settings'

const NAV_ITEMS: {
  value: ClientDetailsSidebarTab
  label: string
  icon: typeof User
}[] = [
  { value: 'details', label: 'Client Dashboard', icon: User },
  { value: 'files', label: 'Files', icon: FolderOpen },
  { value: 'bank-statement', label: 'Bank Statement', icon: Landmark },
  { value: 'invoice', label: 'Invoice', icon: Receipt },
 
]

interface ClientDetailsSidebarProps {
  activeTab: string
  onNavigate: (tab: ClientDetailsSidebarTab) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  clientLabel?: string
}

export function ClientDetailsSidebar({
  activeTab,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  clientLabel,
}: ClientDetailsSidebarProps) {
  return (
    <aside
      className={cn(
        'shrink-0 flex flex-col border-r border-border bg-card/50 transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-[52px]' : 'w-[200px] sm:w-[220px]',
      )}
    >
      <div
        className={cn(
          'flex items-center border-b border-border min-h-[44px]',
          collapsed ? 'justify-center px-1' : 'justify-between gap-2 px-3',
        )}
      >
        {!collapsed && (
          <p className="text-xs font-semibold text-foreground truncate min-w-0" title={clientLabel}>
            {clientLabel || 'Client'}
          </p>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? 'Open sidebar' : 'Close sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto" aria-label="Client sections">
        <ul className={cn('space-y-0.5', collapsed ? 'px-1.5' : 'px-2')}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.value
            const Icon = item.icon
            const button = (
              <button
                type="button"
                onClick={() => onNavigate(item.value)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'w-full flex items-center rounded-md text-sm font-medium transition-colors',
                  collapsed ? 'justify-center h-9 px-0' : 'gap-2.5 h-9 px-2.5 text-left',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            )

            return (
              <li key={item.value}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  button
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
