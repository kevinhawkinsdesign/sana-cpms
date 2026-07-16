'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const KIGALI_TIMEZONE = 'Africa/Kigali'

interface DateRange {
  startDate: Date
  endDate: Date
}

interface DateRangeFilterProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

const QUICK_RANGES = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: -1 },
  { label: 'Last 7 days', days: -7 },
  { label: 'Last 30 days', days: -30 },
] as const

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const handleQuickRange = (days: number) => {
    const end = dayjs().tz(KIGALI_TIMEZONE).endOf('day').toDate()
    const start = days === 0 
      ? dayjs().tz(KIGALI_TIMEZONE).startOf('day').toDate()
      : dayjs().tz(KIGALI_TIMEZONE).add(days, 'days').startOf('day').toDate()
    
    onDateRangeChange({ startDate: start, endDate: end })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Quick Range Buttons */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_RANGES.map((range) => (
          <Button
            key={range.label}
            variant="outline"
            size="sm"
            onClick={() => handleQuickRange(range.days)}
            className="text-xs"
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Date Pickers */}
      <div className="flex items-center gap-2">
        <DatePicker
          selected={dateRange.startDate}
          onChange={(date: Date | null) => {
            if (date) {
              const start = dayjs(date).tz(KIGALI_TIMEZONE).startOf('day').toDate()
              onDateRangeChange({ ...dateRange, startDate: start })
            }
          }}
          selectsStart
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          maxDate={dateRange.endDate}
          dateFormat="MMM dd, yyyy"
          className="h-9 px-3 py-2 text-sm border border-input bg-background rounded-md w-[180px]"
          placeholderText="Start date"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <DatePicker
          selected={dateRange.endDate}
          onChange={(date: Date | null) => {
            if (date) {
              const end = dayjs(date).tz(KIGALI_TIMEZONE).endOf('day').toDate()
              onDateRangeChange({ ...dateRange, endDate: end })
            }
          }}
          selectsEnd
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          minDate={dateRange.startDate}
          dateFormat="MMM dd, yyyy"
          className="h-9 px-3 py-2 text-sm border border-input bg-background rounded-md w-[180px]"
          placeholderText="End date"
        />
      </div>
    </div>
  )
}

