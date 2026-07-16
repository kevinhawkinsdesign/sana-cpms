'use client'

import { Badge } from '@/components/ui/badge'

interface LatenessBadgeProps {
  minutes: number | null | undefined
  showIcon?: boolean
  className?: string
}

export function LatenessBadge({ minutes, showIcon = true, className = '' }: LatenessBadgeProps) {
  if (minutes === null || minutes === undefined) {
    return (
      <Badge variant="outline" className={`bg-gray-50 text-gray-600 border-gray-200 ${className}`}>
        {showIcon && <span className="mr-0.5">⚪</span>}
        N/A
      </Badge>
    )
  }

  if (minutes === 0) {
    return (
      <Badge className={`bg-green-100 text-green-700 border-green-200 ${className}`}>
        {showIcon && <span className="mr-0.5">✓</span>}
        On Time
      </Badge>
    )
  }

  if (minutes > 0) {
    return (
      <Badge className={`bg-red-100 text-red-700 border-red-200 ${className}`}>
        {showIcon && <span className="mr-0.5">⚠</span>}
        {minutes} min late
      </Badge>
    )
  }

  return (
    <Badge className={`bg-yellow-100 text-yellow-700 border-yellow-200 ${className}`}>
      {showIcon && <span className="mr-0.5">⚡</span>}
      {Math.abs(minutes)} min early
    </Badge>
  )
}


