'use client'

import React from 'react'
import { Search, Filter as FilterIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export type StatusFilter = 'all' | 'active' | 'completed'
export type LatenessFilter = 'all' | 'onTime' | 'late' | 'early'
export type ReviewFilter = 'all' | 'approved' | 'flagged' | 'pending' | 'flaggedThenApproved'

interface OperatorOption {
  id: string
  name: string
}

interface ShiftReportFiltersBarProps {
  startDate: Date
  endDate: Date
  onStartDateChange: (d: Date) => void
  onEndDateChange: (d: Date) => void
  search: string
  onSearchChange: (v: string) => void
  operatorFilter: string
  onOperatorFilterChange: (v: string) => void
  operators: OperatorOption[]
  statusFilter: StatusFilter
  onStatusFilterChange: (v: StatusFilter) => void
  latenessFilter: LatenessFilter
  onLatenessFilterChange: (v: LatenessFilter) => void
  reviewFilter: ReviewFilter
  onReviewFilterChange: (v: ReviewFilter) => void
  onReset: () => void
  showReset: boolean
}

export const ShiftReportFiltersBar: React.FC<ShiftReportFiltersBarProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  search,
  onSearchChange,
  operatorFilter,
  onOperatorFilterChange,
  operators,
  statusFilter,
  onStatusFilterChange,
  latenessFilter,
  onLatenessFilterChange,
  reviewFilter,
  onReviewFilterChange,
  onReset,
  showReset,
}) => {
  const pillCls =
    'h-9 px-3 text-[12.5px] bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50'

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white">
      <div className="flex items-center gap-1.5">
        <DatePicker
          selected={startDate}
          onChange={(d: Date | null) => d && onStartDateChange(d)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          maxDate={endDate}
          dateFormat="MMM dd, yyyy"
          className="h-9 px-3 text-[12.5px] bg-white border border-slate-200 rounded-lg w-[140px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholderText="Start date"
        />
        <span className="text-xs text-slate-400">to</span>
        <DatePicker
          selected={endDate}
          onChange={(d: Date | null) => d && onEndDateChange(d)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
          dateFormat="MMM dd, yyyy"
          className="h-9 px-3 text-[12.5px] bg-white border border-slate-200 rounded-lg w-[140px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholderText="End date"
        />
      </div>

      <div className="relative flex-1 min-w-[220px] max-w-[340px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Search operator, location, date…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-[12.5px] bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500/20"
        />
      </div>

      <Select value={operatorFilter} onValueChange={onOperatorFilterChange}>
        <SelectTrigger className={`${pillCls} w-[170px]`}>
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All operators</SelectItem>
          {operators.map((op) => (
            <SelectItem key={op.id} value={op.id}>
              {op.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
        <SelectTrigger className={`${pillCls} w-[140px]`}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={latenessFilter} onValueChange={(v) => onLatenessFilterChange(v as LatenessFilter)}>
        <SelectTrigger className={`${pillCls} w-[130px]`}>
          <SelectValue placeholder="Lateness" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="onTime">On time</SelectItem>
          <SelectItem value="late">Late</SelectItem>
          <SelectItem value="early">Early</SelectItem>
        </SelectContent>
      </Select>

      <Select value={reviewFilter} onValueChange={(v) => onReviewFilterChange(v as ReviewFilter)}>
        <SelectTrigger className={`${pillCls} w-[180px]`}>
          <SelectValue placeholder="Review" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All review</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="flagged">Flagged</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="flaggedThenApproved">Flagged → Approved</SelectItem>
        </SelectContent>
      </Select>

      {showReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-9 text-[12.5px] text-slate-500 hover:text-slate-900"
        >
          <FilterIcon className="h-3.5 w-3.5 mr-1.5" /> Reset
        </Button>
      )}
    </div>
  )
}
