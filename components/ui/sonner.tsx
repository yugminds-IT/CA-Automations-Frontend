'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-right"
      closeButton
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'rounded-xl border shadow-lg backdrop-blur-sm',
          success: '!border-success/30 [&_[data-icon]]:text-success',
          error: '!border-destructive/30 [&_[data-icon]]:text-destructive',
          warning: '!border-warning/30 [&_[data-icon]]:text-warning',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
