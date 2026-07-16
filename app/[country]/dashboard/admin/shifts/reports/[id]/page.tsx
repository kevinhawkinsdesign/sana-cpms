'use client'

import React, { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  AlertCircle,
  Calendar,
  MapPin,
  RefreshCw,
  ShoppingCart,
  Zap,
  Wallet,
} from 'lucide-react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminAccessGuard } from '@/components/shared/AdminAccessGuard'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import {
  getShiftReportDetail,
  ShiftReportDetail,
} from '@/lib/api/shiftsAndInspections'
import {
  calculateCheckInLateness,
  calculateCheckOutLateness,
} from '@/lib/utils/latenessCalculation'
import { OperatorAvatar } from '@/components/reports/admin/OperatorAvatar'
import {
  ShiftStatusPill,
  deriveShiftStatus,
} from '@/components/reports/admin/ShiftStatusPill'
import { Section } from '@/components/reports/admin/details/Section'
import { StatRow } from '@/components/reports/admin/details/StatRow'
import {
  ShiftTimeCard,
  startedTone,
  endedTone,
} from '@/components/reports/admin/details/ShiftTimeCard'
import { MeterCard } from '@/components/reports/admin/details/MeterCard'
import { PaymentBars } from '@/components/reports/admin/details/PaymentBars'
import { PhotoRow } from '@/components/reports/admin/details/PhotoRow'
import { ReviewSection } from '@/components/reports/admin/details/ReviewSection'
import { SessionsSection } from '@/components/reports/admin/details/SessionsSection'

dayjs.extend(utc)
dayjs.extend(timezone)

const KIGALI_TIMEZONE = 'Africa/Kigali'

const ShiftReportDetailPageBody = () => {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const localizedRouter = useLocalizedRouter()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['shiftReportDetail', id],
    queryFn: () => getShiftReportDetail(id),
    enabled: !!id,
  })

  const detail = data?.detail ?? null

  // Preserve the list view's filter/sort state in the back link. The list
  // page mirrors its state to the URL, so we just round-trip whatever
  // search params were appended to our deep link via ?returnTo=... or fall
  // back to the bare list URL.
  const handleBack = () => {
    const returnTo = searchParams?.get('returnTo')
    if (returnTo) {
      // returnTo is encoded query string only (no path), built by the list
      // page when it navigated us here. Re-attach to the list path.
      localizedRouter.push(`/dashboard/admin/shifts/reports?${returnTo}`)
      return
    }
    // No round-trip context — use browser history if available, else go to
    // the list root.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    localizedRouter.push('/dashboard/admin/shifts/reports')
  }

  if (isLoading) {
    return (
      <AdminAccessGuard>
        <div className="space-y-6">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </AdminAccessGuard>
    )
  }

  if (error || !detail) {
    return (
      <AdminAccessGuard>
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load shift report</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'Report not found'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            </div>
          </div>
        </div>
      </AdminAccessGuard>
    )
  }

  return (
    <AdminAccessGuard>
      <Content detail={detail} isFetching={isFetching} onBack={handleBack} onRefetch={refetch} />
    </AdminAccessGuard>
  )
}

interface ContentProps {
  detail: ShiftReportDetail
  isFetching: boolean
  onBack: () => void
  onRefetch: () => void
}

const Content: React.FC<ContentProps> = ({ detail, isFetching, onBack, onRefetch }) => {
  const { report, kpis, meter, payments, photos, notes } = detail
  // Older API deployments don't return the sessions array yet.
  const sessions = detail.sessions ?? []
  const localizedRouter = useLocalizedRouter()

  const checkInLate = calculateCheckInLateness(report) ?? kpis.checkInLatenessMinutes
  const checkOutLate = calculateCheckOutLateness(report) ?? kpis.checkOutLatenessMinutes

  const status = deriveShiftStatus(checkInLate, !!report.checkOutTime)
  const dateLabel = dayjs(report.checkInTime).tz(KIGALI_TIMEZONE).format('MMM DD, YYYY')
  const location = report.operatorShift?.charger?.name ?? '—'
  const isOngoing = !report.checkOutTime
  const actualStart = dayjs(report.checkInTime).tz(KIGALI_TIMEZONE).format('HH:mm')
  const actualEnd = report.checkOutTime
    ? dayjs(report.checkOutTime).tz(KIGALI_TIMEZONE).format('HH:mm')
    : '—'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="outline" size="sm" onClick={onBack} className="mt-1">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to reports
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <OperatorAvatar operator={report.operator ?? undefined} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate">
                  {report.operator
                    ? `${report.operator.firstName ?? ''} ${report.operator.lastName ?? ''}`.trim() || 'Operator'
                    : 'Operator'}
                </h1>
                <ShiftStatusPill status={status} late={checkInLate} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> {dateLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {location}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => localizedRouter.push(`/dashboard/admin/sessions?shiftReportId=${report.id}`)}
          >
            <ShoppingCart className="h-4 w-4 mr-2" /> View in sessions list
          </Button>
          <Button variant="outline" onClick={onRefetch} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Top stat strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <StatRow
            icon={ShoppingCart}
            iconBg="bg-blue-50"
            iconColor="text-blue-700"
            label="Sessions"
            value={sessions.length.toLocaleString('en-US')}
            unit="transactions"
            sub={isOngoing ? 'Shift in progress' : 'Customer charging sessions'}
          />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <StatRow
            icon={Zap}
            iconBg="bg-amber-50"
            iconColor="text-amber-700"
            label="Energy Sold"
            value={kpis.kwhSold.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            unit="kWh"
            sub={`Across ${kpis.transactions.toLocaleString('en-US')} session${kpis.transactions === 1 ? '' : 's'}`}
          />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <StatRow
            icon={Wallet}
            iconBg="bg-slate-100"
            iconColor="text-slate-900"
            label="Money Collected"
            value={kpis.moneyCollectedRwf.toLocaleString('en-US')}
            unit="RWF"
            sub="Across all sessions"
          />
        </div>
      </div>

      {/* Two-column overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Started / Ended */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-3">
              Timing
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <ShiftTimeCard
                tone={startedTone(checkInLate)}
                time={actualStart}
                footer={
                  checkInLate === null
                    ? 'Recorded'
                    : checkInLate > 5
                      ? `${checkInLate} min late`
                      : checkInLate < -5
                        ? `${Math.abs(checkInLate)} min early`
                        : 'On time'
                }
                footerTone={
                  checkInLate === null
                    ? 'neutral'
                    : checkInLate > 5
                      ? 'late'
                      : 'ok'
                }
              />
              <ShiftTimeCard
                tone={endedTone(checkOutLate, isOngoing)}
                time={actualEnd}
                footer={
                  isOngoing
                    ? 'In progress'
                    : checkOutLate === null
                      ? 'Completed'
                      : checkOutLate > 5
                        ? `${checkOutLate} min late`
                        : checkOutLate < -5
                          ? `${Math.abs(checkOutLate)} min early`
                          : 'Completed · on time'
                }
                footerTone={
                  isOngoing || checkOutLate === null
                    ? 'neutral'
                    : checkOutLate > 5
                      ? 'late'
                      : 'ok'
                }
              />
            </div>
          </div>

          {/* Review */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <ReviewSection
              reportId={report.id}
              isApproved={!!report.isApproved}
              approvedAt={report.approvedAt ?? null}
              approvalReason={report.approvalReason ?? null}
              approvedBy={report.approvedBy ?? null}
              isFlagged={!!report.isFlagged}
              flaggedAt={report.flaggedAt ?? null}
              flagReason={report.flagReason ?? null}
              flaggedBy={report.flaggedBy ?? null}
              events={report.approvalEvents ?? []}
              isReadyForReview={!!report.checkOutTime}
            />
          </div>

          {/* Meter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <Section title="Meter Readings">
              <div className="flex flex-col gap-3">
                {meter.m1 && (
                  <MeterCard
                    label="Meter 1"
                    data={meter.m1}
                    startTime={actualStart}
                    endTime={isOngoing ? 'Now' : actualEnd}
                  />
                )}
                {meter.m2 && (
                  <MeterCard
                    label="Meter 2"
                    data={meter.m2}
                    startTime={actualStart}
                    endTime={isOngoing ? 'Now' : actualEnd}
                  />
                )}
                {!meter.m1 && !meter.m2 && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500 text-center">
                    No meter readings recorded
                  </div>
                )}
              </div>
            </Section>
          </div>

          {/* Payments */}
          {payments.total > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <Section title="Payments">
                <PaymentBars payments={payments} />
              </Section>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {(photos.checkIn.length > 0 || photos.checkOut.length > 0) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <Section title="Check-in / Check-out Photos">
                <div className="flex flex-col gap-4">
                  {photos.checkIn.length > 0 && (
                    <PhotoRow label="Check-in" photos={photos.checkIn} />
                  )}
                  {photos.checkOut.length > 0 && (
                    <PhotoRow label="Check-out" photos={photos.checkOut} />
                  )}
                </div>
              </Section>
            </div>
          )}

          {notes && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <Section title="Notes / Remarks">
                <div className="px-3.5 py-3 bg-slate-50 rounded-xl border border-slate-200 text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {notes}
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>

      {/* Sessions list */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <SessionsSection sessions={sessions} />
      </div>
    </div>
  )
}

const ShiftReportDetailPage = () => (
  <Suspense fallback={null}>
    <ShiftReportDetailPageBody />
  </Suspense>
)

export default ShiftReportDetailPage
