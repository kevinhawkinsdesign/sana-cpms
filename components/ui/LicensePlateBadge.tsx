'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface LicensePlateBadgeProps {
  plate?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { container: 'h-7', plate: 'px-2 text-sm' },
  md: { container: 'h-9', plate: 'px-3 text-base' },
  lg: { container: 'h-11', plate: 'px-4 text-xl' },
}

/**
 * A license-plate-styled badge. Shows the plate number in a mono uppercase
 * font with a thick dark border on a white background.
 */
export const LicensePlateBadge: React.FC<LicensePlateBadgeProps> = ({
  plate,
  size = 'md',
  className,
}) => {
  if (!plate || !String(plate).trim()) return null

  const s = sizeMap[size]
  const text = String(plate).trim().toUpperCase()

  return (
    <div
      className={cn(
        'inline-flex items-center overflow-hidden rounded-md border-2 border-gray-900 bg-white shadow-sm',
        s.container,
        className,
      )}
      aria-label={`License plate ${text}`}
    >
      <div
        className={cn(
          'flex items-center justify-center font-mono font-extrabold tracking-[0.18em] text-gray-900',
          s.plate,
        )}
      >
        {text}
      </div>
    </div>
  )
}
