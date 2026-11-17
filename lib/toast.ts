import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { createElement, type ReactNode } from 'react'
import { toast as sonnerToast } from 'sonner'

interface ToastOptions {
  description?: ReactNode
}

function toastSuccess(title: ReactNode, options?: ToastOptions) {
  return sonnerToast.success(title, {
    description: options?.description,
    icon: createElement(CheckCircle2, { className: 'size-4 text-success' }),
  })
}

function toastError(title: ReactNode, options?: ToastOptions) {
  return sonnerToast.error(title, {
    description: options?.description,
    icon: createElement(AlertCircle, { className: 'size-4 text-destructive' }),
  })
}

function toastWarning(title: ReactNode, options?: ToastOptions) {
  return sonnerToast.warning(title, {
    description: options?.description,
    icon: createElement(AlertTriangle, { className: 'size-4 text-warning' }),
  })
}

function toastInfo(title: ReactNode, options?: ToastOptions) {
  return sonnerToast(title, {
    description: options?.description,
    icon: createElement(Info, { className: 'size-4 text-info' }),
  })
}

export { toastSuccess, toastError, toastWarning, toastInfo }
