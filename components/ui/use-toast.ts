'use client'

import type { ReactNode } from 'react'

import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/toast'

interface Toast {
  title?: ReactNode
  description?: ReactNode
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
}

function toast({ title, description, variant = 'default' }: Toast) {
  const headline = title ?? description
  const options = title ? { description } : undefined

  switch (variant) {
    case 'destructive':
      return toastError(headline, options)
    case 'success':
      return toastSuccess(headline, options)
    case 'warning':
      return toastWarning(headline, options)
    default:
      return toastInfo(headline, options)
  }
}

function useToast() {
  return { toast, dismiss: () => {} }
}

export { useToast, toast }
