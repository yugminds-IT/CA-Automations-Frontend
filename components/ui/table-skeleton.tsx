import { Skeleton } from '@/components/ui/skeleton'
import { TableBody, TableCell, TableRow } from '@/components/ui/table'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

function TableSkeleton({ rows = 6, columns = 4 }: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton
                className="h-4"
                style={{ width: colIndex === 0 ? '70%' : `${55 + ((rowIndex + colIndex) % 3) * 10}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}

export { TableSkeleton }
