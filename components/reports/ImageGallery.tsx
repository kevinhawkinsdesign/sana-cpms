'use client'

import { useState } from 'react'
import { Camera, BarChart3 } from 'lucide-react'
import { ShiftReport } from '@/lib/api/shiftsAndInspections'
import { ImageModal } from './ImageModal'

interface ImageItem {
  url: string
  type: 'checkInSelfie' | 'checkOutSelfie' | 'checkInMeter' | 'checkOutMeter'
  timestamp: string
  label: string
}

interface ImageGalleryProps {
  report: ShiftReport
}

export function ImageGallery({ report }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Collect all available images
  const images: ImageItem[] = []

  if (report.checkInSelfieImage) {
    images.push({
      url: report.checkInSelfieImage,
      type: 'checkInSelfie',
      timestamp: report.checkInTime,
      label: 'Check-in Selfie'
    })
  }

  if (report.checkInMeterReadingImageUrl) {
    images.push({
      url: report.checkInMeterReadingImageUrl,
      type: 'checkInMeter',
      timestamp: report.checkInTime,
      label: 'Meter 1 Reading (Start)'
    })
  }

  if (report.checkInMeterReadingImageUrl2) {
    images.push({
      url: report.checkInMeterReadingImageUrl2,
      type: 'checkInMeter',
      timestamp: report.checkInTime,
      label: 'Meter 2 Reading (Start)'
    })
  }

  if (report.checkOutSelfieImage) {
    images.push({
      url: report.checkOutSelfieImage,
      type: 'checkOutSelfie',
      timestamp: report.checkOutTime || '',
      label: 'Check-out Selfie'
    })
  }

  if (report.checkOutMeterReadingImageUrl) {
    images.push({
      url: report.checkOutMeterReadingImageUrl,
      type: 'checkOutMeter',
      timestamp: report.checkOutTime || '',
      label: 'Meter 1 Reading (End)'
    })
  }

  if (report.checkOutMeterReadingImageUrl2) {
    images.push({
      url: report.checkOutMeterReadingImageUrl2,
      type: 'checkOutMeter',
      timestamp: report.checkOutTime || '',
      label: 'Meter 2 Reading (End)'
    })
  }

  if (images.length === 0) {
    return <span className="text-sm text-muted-foreground">No images</span>
  }

  const handleImageClick = (image: ImageItem) => {
    setSelectedImage(image)
    setIsModalOpen(true)
  }

  const handleNext = () => {
    if (!selectedImage) return
    const currentIndex = images.findIndex(img => img.url === selectedImage.url)
    const nextIndex = (currentIndex + 1) % images.length
    setSelectedImage(images[nextIndex])
  }

  const handlePrevious = () => {
    if (!selectedImage) return
    const currentIndex = images.findIndex(img => img.url === selectedImage.url)
    const prevIndex = (currentIndex - 1 + images.length) % images.length
    setSelectedImage(images[prevIndex])
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {images.slice(0, 4).map((image, index) => (
          <button
            key={index}
            onClick={() => handleImageClick(image)}
            className="relative w-10 h-10 rounded-md border border-gray-200 overflow-hidden hover:border-blue-400 hover:shadow-md transition-all duration-200 bg-gray-100 group cursor-pointer"
            title={image.label}
          >
            <img
              src={image.url}
              alt={image.label}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
              onError={(e) => {
                // Hide image if it fails to load, show fallback icon
                const target = e.currentTarget
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const fallback = parent.querySelector('.image-fallback') as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }
              }}
            />
            {/* Fallback icon if image fails to load - hidden by default */}
            <div className="image-fallback absolute inset-0 flex items-center justify-center bg-gray-100" style={{ display: 'none' }}>
              {image.type.includes('Selfie') ? (
                <Camera className="w-6 h-6 text-gray-400" />
              ) : (
                <BarChart3 className="w-6 h-6 text-gray-400" />
              )}
            </div>
            {/* Image type badge on hover */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[9px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate font-medium">
              {image.type.includes('Selfie') ? 'S' : 'M'}
            </div>
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
          </button>
        ))}
        {images.length > 4 && (
          <button
            onClick={() => handleImageClick(images[4])}
            className="relative w-10 h-10 rounded-md border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center text-[10px] font-semibold text-gray-600 hover:text-blue-600"
            title={`${images.length - 4} more images`}
          >
            +{images.length - 4}
          </button>
        )}
      </div>

      {selectedImage && (
        <ImageModal
          image={selectedImage}
          allImages={images}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
    </>
  )
}


