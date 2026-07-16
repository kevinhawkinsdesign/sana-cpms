'use client'

import React, { useState } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {
  Car,
  User,
  Zap,
  Wallet,
  ArrowRightLeft,
  Clock,
  ImageOff,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type {
  ShiftReportSession,
  SessionPhoto,
} from '@/lib/api/shiftsAndInspections'
import { Section } from './Section'

dayjs.extend(utc)
dayjs.extend(timezone)

const KIGALI_TIMEZONE = 'Africa/Kigali'

interface SessionsSectionProps {
  sessions: ShiftReportSession[]
}

export const SessionsSection: React.FC<SessionsSectionProps> = ({ sessions }) => {
  const [lightbox, setLightbox] = useState<SessionPhoto | null>(null)

  if (sessions.length === 0) {
    return (
      <Section title={`Sessions (0)`}>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-sm text-slate-500 text-center">
          No charging sessions recorded for this shift.
        </div>
      </Section>
    )
  }

  return (
    <Section title={`Sessions (${sessions.length})`}>
      <div className="flex flex-col gap-3">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} onOpenPhoto={setLightbox} />
        ))}
      </div>
      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-slate-900 border-slate-800">
          <DialogTitle className="px-4 py-3 text-sm font-semibold text-slate-100">
            {lightbox?.label}
          </DialogTitle>
          {lightbox && (
            <div className="w-full max-h-[85vh] flex items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.url}
                alt={lightbox.label}
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Section>
  )
}

interface SessionCardProps {
  session: ShiftReportSession
  onOpenPhoto: (p: SessionPhoto) => void
}

const STATUS_PILL: Record<ShiftReportSession['status'], { bg: string; text: string; label: string }> = {
  STARTED:    { bg: 'bg-amber-100',   text: 'text-amber-800',   label: 'Active' },
  COMPLETED:  { bg: 'bg-blue-100',    text: 'text-blue-800',    label: 'Completed' },
  PAID:       { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Paid' },
  EBM_ISSUED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'EBM' },
  CANCELLED:  { bg: 'bg-slate-200',   text: 'text-slate-700',   label: 'Cancelled' },
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onOpenPhoto }) => {
  const start = dayjs(session.startTime).tz(KIGALI_TIMEZONE)
  const end = session.endTime ? dayjs(session.endTime).tz(KIGALI_TIMEZONE) : null
  const timeRange = end
    ? `${start.format('HH:mm')} – ${end.format('HH:mm')}`
    : `${start.format('HH:mm')} – ongoing`
  const durationLabel =
    session.durationMinutes != null
      ? session.durationMinutes >= 60
        ? `${Math.floor(session.durationMinutes / 60)}h ${session.durationMinutes % 60}m`
        : `${session.durationMinutes}m`
      : '—'

  const pill = STATUS_PILL[session.status] ?? STATUS_PILL.STARTED
  const photoTiles: Array<{ key: string; photo: SessionPhoto | null }> = [
    { key: 'chargerScreen', photo: session.photos.chargerScreen },
    { key: 'odometerReading', photo: session.photos.odometerReading },
    { key: 'transferredKwh', photo: session.photos.transferredKwh },
    { key: 'carImage', photo: session.photos.carImage },
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[10px] font-bold text-slate-400 tabular-nums">#{session.index}</span>
          <span className="text-[13px] font-semibold text-slate-900 truncate" title={session.sessionId}>
            {session.sessionId}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pill.bg} ${pill.text}`}>
            {pill.label}
          </span>
          {session.previousOperator && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
              <ArrowRightLeft className="h-3 w-3" />
              From {session.previousOperator.firstName} {session.previousOperator.lastName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[12px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeRange} · {durationLabel}
          </span>
          {session.gun?.gunNumber && (
            <span className="text-slate-400">Gun {session.gun.gunNumber}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <User className="h-3 w-3" /> Customer
          </div>
          <div className="text-[13px] font-semibold text-slate-900">
            {session.customerName ?? 'Anonymous'}
          </div>
          <div className="text-[11.5px] text-slate-500 inline-flex items-center gap-1.5">
            {session.plate && (
              <span className="font-semibold text-slate-700">{session.plate}</span>
            )}
            {session.carModelMake && (
              <span className="inline-flex items-center gap-1">
                <Car className="h-3 w-3" />
                {session.carModelMake}
              </span>
            )}
            {!session.plate && !session.carModelMake && <span>No vehicle info</span>}
          </div>
        </div>

        {/* Energy */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <Zap className="h-3 w-3" /> Energy
          </div>
          <div className="text-[15px] font-bold text-slate-900 tabular-nums">
            {(session.chargedKwh ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            <span className="text-[11px] text-slate-400 font-medium ml-1">kWh</span>
          </div>
          {session.transferredKwh != null && session.transferredKwh > 0 && (
            <div className="text-[11.5px] text-violet-700 font-medium">
              Transferred: {session.transferredKwh.toLocaleString('en-US', { maximumFractionDigits: 2 })} kWh
            </div>
          )}
        </div>

        {/* Money */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <Wallet className="h-3 w-3" /> Payment
          </div>
          <div className="text-[15px] font-bold text-slate-900 tabular-nums">
            RWF {(session.totalAmount ?? 0).toLocaleString('en-US')}
          </div>
          <div className="text-[11.5px] text-slate-500">
            {session.paymentMethodType ?? '—'}
            {session.ratePerKwh != null && (
              <span className="text-slate-400"> · {session.ratePerKwh} RWF/kWh</span>
            )}
          </div>
        </div>
      </div>

      {/* Photo strip */}
      <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {photoTiles.map(({ key, photo }) => (
          <PhotoTile
            key={key}
            photo={photo}
            fallbackLabel={fallbackLabel(key)}
            onOpen={onOpenPhoto}
          />
        ))}
      </div>
    </div>
  )
}

const fallbackLabel = (key: string): string => {
  switch (key) {
    case 'chargerScreen': return 'Charger screen'
    case 'odometerReading': return 'Odometer'
    case 'transferredKwh': return 'Transferred kWh'
    case 'carImage': return 'Vehicle'
    default: return key
  }
}

interface PhotoTileProps {
  photo: SessionPhoto | null
  fallbackLabel: string
  onOpen: (p: SessionPhoto) => void
}

const PhotoTile: React.FC<PhotoTileProps> = ({ photo, fallbackLabel, onOpen }) => {
  if (!photo) {
    return (
      <div className="aspect-square rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1">
        <ImageOff className="h-5 w-5" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{fallbackLabel}</span>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(photo)}
      title={photo.label}
      className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 group"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.label}
        className="w-full h-full object-cover transition group-hover:scale-105"
      />
      <span className="absolute inset-x-0 bottom-0 px-1.5 py-1 text-[10px] font-semibold text-white bg-black/60 truncate text-left">
        {photo.label}
      </span>
    </button>
  )
}
