'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface PhotoRowProps {
  label: string
  photos: Array<{ url: string; label: string }>
}

export const PhotoRow: React.FC<PhotoRowProps> = ({ label, photos }) => {
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null)
  return (
    <div>
      <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <button
            key={`${p.label}-${i}`}
            type="button"
            onClick={() => setLightbox(p)}
            title={p.label}
            className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 px-1 py-0.5 text-[9px] font-semibold text-white bg-black/60 truncate">
              {p.label}
            </span>
          </button>
        ))}
      </div>
      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 bg-slate-900 border-slate-800">
          <DialogTitle className="px-4 py-3 text-sm font-semibold text-slate-100">
            {lightbox?.label}
          </DialogTitle>
          {lightbox && (
            <div className="w-full max-h-[80vh] flex items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.url}
                alt={lightbox.label}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
