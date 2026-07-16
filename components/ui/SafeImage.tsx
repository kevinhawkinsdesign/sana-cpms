'use client'

import Image, { ImageProps } from 'next/image'
import { useState } from 'react'

interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src: string
  fallbackSrc?: string
}

export default function SafeImage({ 
  src, 
  fallbackSrc = '/placeholder-image.png', 
  alt, 
  onError,
  ...props 
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true)
      setImgSrc(fallbackSrc)
    }
    onError?.(e)
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      onError={handleError}
      {...props}
    />
  )
}
