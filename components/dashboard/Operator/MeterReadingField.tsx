'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ImageUpload from '@/components/ui/image-upload'

interface ReferenceImage {
  url: string
  label?: string
}

interface MeterReadingFieldProps {
  label: string
  photoLabel: string
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  imageName: string
  imageUploadLabel: string
  currentImage: string
  onImageChange: (name: string, url: string) => void
  uploadContext: string
  entityId?: string
  compact?: boolean
  // Step number rendered as a small numbered circle before the label —
  // helps the operator track which physical meter they're on when the
  // charger has more than one.
  stepNumber?: number
  // Optional check-in reference photo shown beside the input. Lets the
  // operator visually match the on-screen field to the meter on the wall
  // when chargers have two near-identical meters.
  referenceImage?: ReferenceImage | null
}

export function MeterReadingField({
  label,
  photoLabel,
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  placeholder = 'Enter meter reading',
  imageName,
  imageUploadLabel,
  currentImage,
  onImageChange,
  uploadContext,
  entityId,
  compact = false,
  stepNumber,
  referenceImage,
}: MeterReadingFieldProps) {
  const labelClass = compact ? 'text-xs font-medium' : undefined
  const inputClass = compact ? 'text-sm h-9' : undefined
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const labelNode = (
    <span className="inline-flex items-center gap-2">
      {typeof stepNumber === 'number' && (
        <span className="inline-flex w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold items-center justify-center flex-shrink-0">
          {stepNumber}
        </span>
      )}
      <span>{label}</span>
    </span>
  )

  const inputBlock = (
    <>
      <div>
        <Label className={labelClass}>{labelNode}</Label>
        <Input
          type="text"
          inputMode="decimal"
          pattern="[0-9.,]*"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          autoComplete="off"
          className={inputClass}
        />
      </div>

      {value && (
        <div>
          <Label className={labelClass}>{photoLabel}</Label>
          <ImageUpload
            name={imageName}
            label={imageUploadLabel}
            currentImage={currentImage}
            onImageChange={onImageChange}
            isRequired={true}
            cameraOnly
            classNames="w-full"
            uploadContext={uploadContext}
            entityId={entityId}
          />
        </div>
      )}
    </>
  )

  if (!referenceImage?.url) {
    return <>{inputBlock}</>
  }

  return (
    <>
      <div className="flex gap-3 items-start">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          title={referenceImage.label ?? 'Check-in photo'}
          className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={referenceImage.url}
            alt={referenceImage.label ?? 'Check-in photo'}
            className="w-full h-full object-cover"
          />
        </button>
        <div className="flex-1 min-w-0 space-y-2">{inputBlock}</div>
      </div>
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 bg-slate-900 border-slate-800">
          <DialogTitle className="px-4 py-3 text-sm font-semibold text-slate-100">
            {referenceImage.label ?? 'Check-in photo'}
          </DialogTitle>
          <div className="w-full max-h-[80vh] flex items-center justify-center bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={referenceImage.url}
              alt={referenceImage.label ?? 'Check-in photo'}
              className="max-w-full max-h-[80vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
