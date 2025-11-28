'use client'

import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-3',
      className,
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-4 overflow-hidden rounded-xl border p-5 pr-10 shadow-2xl backdrop-blur-2xl transition-all duration-300 ease-out data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
  {
    variants: {
      variant: {
        default: 'border-white/30 dark:border-white/20 bg-white/90 dark:bg-gray-900/90 text-foreground backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/50 before:to-transparent before:dark:from-white/5 before:pointer-events-none',
        destructive:
          'destructive group border-red-500/40 dark:border-red-500/30 bg-gradient-to-br from-red-500/95 to-red-600/95 dark:from-red-900/90 dark:to-red-950/90 text-white backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(239,68,68,0.4)] dark:shadow-[0_20px_50px_-12px_rgba(239,68,68,0.6)] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none',
        success: 'border-green-500/40 dark:border-green-500/30 bg-gradient-to-br from-green-500/95 to-emerald-600/95 dark:from-green-900/90 dark:to-emerald-950/90 text-white backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(34,197,94,0.4)] dark:shadow-[0_20px_50px_-12px_rgba(34,197,94,0.6)] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none',
        warning: 'border-yellow-500/40 dark:border-yellow-500/30 bg-gradient-to-br from-yellow-500/95 to-amber-600/95 dark:from-yellow-900/90 dark:to-amber-950/90 text-white backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(234,179,8,0.4)] dark:shadow-[0_20px_50px_-12px_rgba(234,179,8,0.6)] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none',
        info: 'border-blue-500/40 dark:border-blue-500/30 bg-gradient-to-br from-blue-500/95 to-cyan-600/95 dark:from-blue-900/90 dark:to-cyan-950/90 text-white backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(59,130,246,0.4)] dark:shadow-[0_20px_50px_-12px_rgba(59,130,246,0.6)] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-white/30 dark:border-white/20 bg-white/20 dark:bg-white/10 backdrop-blur-sm px-4 text-sm font-medium transition-all duration-200 hover:bg-white/30 dark:hover:bg-white/20 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-3 top-3 rounded-lg p-1.5 text-foreground/60 dark:text-white/70 opacity-0 transition-all duration-200 hover:text-foreground dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/20 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/30 group-hover:opacity-100 backdrop-blur-sm hover:scale-110 active:scale-95',
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-base font-semibold leading-tight', className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm leading-relaxed opacity-95 mt-1', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

// Icon component for toast variants
const ToastIcon = ({ variant }: { variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info' }) => {
  const iconClass = 'h-5 w-5 shrink-0'
  
  switch (variant) {
    case 'success':
      return <CheckCircle2 className={iconClass} />
    case 'destructive':
      return <AlertCircle className={iconClass} />
    case 'warning':
      return <AlertTriangle className={iconClass} />
    case 'info':
      return <Info className={iconClass} />
    default:
      return <Info className={iconClass} />
  }
}

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastIcon,
}
