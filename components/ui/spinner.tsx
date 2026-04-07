import { Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LekvyaLoader } from '@/components/ui/lekvya-loader'

/** Small inline spinner — use inside buttons and compact spaces */
function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
}

/** Full-page / full-section loader using the Lekvya brand animation */
function PageLoader({ className }: { className?: string }) {
  return <LekvyaLoader className={className} />
}

export { Spinner, PageLoader }
