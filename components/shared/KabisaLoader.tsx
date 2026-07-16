'use client'

import Image from 'next/image'
import { withBasePath } from '@/lib/utils/assetPath';

type LoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type LoaderVariant = 'fullscreen' | 'block' | 'inline'

const SIZE_PX: Record<LoaderSize, number> = {
  xs: 16,
  sm: 24,
  md: 40,
  lg: 64,
  xl: 96,
}

interface KabisaLoaderProps {
  /** 'fullscreen' centers in viewport, 'block' centers in parent, 'inline' is row layout for buttons / captions. */
  variant?: LoaderVariant
  /** Named size or raw pixels. Default depends on variant. */
  size?: LoaderSize | number
  /** Optional label shown under (block/fullscreen) or next to (inline) the symbol. */
  label?: string
  className?: string
}

const resolveSize = (size: LoaderSize | number | undefined, variant: LoaderVariant): number => {
  if (typeof size === 'number') return size
  if (size) return SIZE_PX[size]
  return variant === 'inline' ? SIZE_PX.sm : variant === 'block' ? SIZE_PX.lg : SIZE_PX.xl
}

export function KabisaLoader({
  variant = 'fullscreen',
  size,
  label,
  className,
}: KabisaLoaderProps) {
  const px = resolveSize(size, variant)

  const symbol = (
    <div
      className="kabisa-loader-pulse shrink-0"
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <Image
        src={withBasePath("/Kabisa Symbol Y.png")}
        alt=""
        width={px}
        height={px}
        priority
        className="select-none"
        style={{ width: px, height: px }}
      />
    </div>
  )

  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-2 ${className ?? ''}`}
        role="status"
        aria-live="polite"
      >
        {symbol}
        {label && <span className="text-sm text-gray-600">{label}</span>}
        {!label && <span className="sr-only">Loading…</span>}
      </span>
    )
  }

  const body = (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      {symbol}
      {label && <p className="text-sm text-gray-600">{label}</p>}
      {!label && <span className="sr-only">Loading…</span>}
    </div>
  )

  if (variant === 'block') {
    return (
      <div className={`w-full flex items-center justify-center py-8 ${className ?? ''}`}>
        {body}
      </div>
    )
  }

  // fullscreen
  return (
    <div className={`min-h-screen flex items-center justify-center ${className ?? ''}`}>
      {body}
    </div>
  )
}

export default KabisaLoader
