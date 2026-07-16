'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface ImageThumbProps {
  src: string
  alt?: string
  className?: string
}

// A small clickable image thumbnail that opens the full image in a lightbox dialog.
// Uses a plain <img> (matching image-upload) so R2 URLs need no next/image config.
export function ImageThumb({ src, alt = 'image', className }: ImageThumbProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('inline-block h-10 w-10 shrink-0 overflow-hidden rounded border border-gray-200 transition hover:opacity-80', className)}
        aria-label="View image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[80vh] w-full rounded object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ImageThumb
