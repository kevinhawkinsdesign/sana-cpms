'use client'

import { useState } from 'react'
import Image, { ImageProps } from 'next/image'
import { getImageUrl, ImageVariant } from '@/lib/utils/cloudflareImages'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = Omit<ImageProps, 'src'> & {
  // Accept a full imagedelivery URL, a full R2 URL, or a bare image id
  srcIdOrUrl: string
  variant?: ImageVariant
}

export default function CfImage({ srcIdOrUrl, variant = 'public', alt, className, onError, ...props }: Props) {
  const [hasError, setHasError] = useState(false)
  const src = getImageUrl(srcIdOrUrl, variant)

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          className,
        )}
        style={{ width: props.width ?? '100%', height: props.height ?? '100%' }}
      >
        <ImageIcon className="h-6 w-6" />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      {...props}
      onError={(e) => {
        setHasError(true)
        onError?.(e)
      }}
    />
  )
}
