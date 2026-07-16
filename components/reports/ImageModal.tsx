'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

interface ImageItem {
  url: string
  type: 'checkInSelfie' | 'checkOutSelfie' | 'checkInMeter' | 'checkOutMeter'
  timestamp: string
  label: string
}

interface ImageModalProps {
  image: ImageItem
  allImages: ImageItem[]
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
}

export function ImageModal({ image, allImages, isOpen, onClose, onNext, onPrevious }: ImageModalProps) {
  const currentIndex = allImages.findIndex(img => img.url === image.url)
  const hasNext = currentIndex < allImages.length - 1
  const hasPrevious = currentIndex > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] !p-0 gap-0 overflow-hidden rounded-2xl bg-gray-900/95 backdrop-blur-xl border-0 shadow-2xl [&>button]:hidden">
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">
          {image.label} - {dayjs(image.timestamp).tz('Africa/Kigali').format('MMM DD, YYYY HH:mm:ss')} ({currentIndex + 1} of {allImages.length})
        </DialogTitle>
        <div className="relative w-full h-[85vh] flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/20 transition-all duration-200 hover:scale-110"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Navigation Buttons */}
          {hasPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/20 transition-all duration-200 hover:scale-110 hover:left-3"
              onClick={onPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/20 transition-all duration-200 hover:scale-110 hover:right-3"
              onClick={onNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Image Container - No padding, image fills the space */}
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={image.url}
              alt={image.label}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-image.png'
              }}
            />
          </div>

          {/* Image Metadata - Beautiful gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent backdrop-blur-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="space-y-1">
                <p className="font-semibold text-white text-base">{image.label}</p>
                <p className="text-sm text-gray-300 font-medium">
                  {dayjs(image.timestamp).tz('Africa/Kigali').format('MMM DD, YYYY HH:mm:ss')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <p className="text-sm font-medium text-white">
                    {currentIndex + 1} <span className="text-gray-400">/</span> {allImages.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


