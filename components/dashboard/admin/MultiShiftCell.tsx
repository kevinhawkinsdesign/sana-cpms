'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Clock, MapPin, Plus, MoreHorizontal, Edit, Trash2, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Shift } from '@/lib/api/shifts'

interface MultiShiftCellProps {
  operatorId: string
  dayOfWeek: number
  date: Date
  shifts: Shift[]
  onClick: () => void
  onEdit: (shift: Shift) => void
  onDelete: (shift: Shift) => void
}

export const MultiShiftCell: React.FC<MultiShiftCellProps> = ({
  operatorId,
  dayOfWeek,
  date,
  shifts,
  onClick,
  onEdit,
  onDelete,
}) => {
  // Droppable for empty cells
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `cell-${operatorId}-${dayOfWeek}`,
    data: {
      operatorId,
      dayOfWeek,
      type: 'cell',
    },
  })

  // Check if this date is today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cellDate = new Date(date)
  cellDate.setHours(0, 0, 0, 0)
  const isToday = cellDate.getTime() === today.getTime()

  const getTimeDisplay = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return 'Flexible'
    return `${startTime} - ${endTime}`
  }

  // Empty cell (no shifts assigned)
  if (!shifts || shifts.length === 0) {
    return (
      <div
        ref={setDroppableRef}
        onClick={onClick}
        className={`
          bg-gray-50 border-b border-r p-2 sm:p-3 min-h-[80px] flex items-center justify-center min-w-[100px]
          hover:bg-gray-100 transition-all duration-200 cursor-pointer
          ${isOver ? 'bg-blue-50 border-blue-200' : ''}
          ${isToday ? 'ring-2 ring-inset ring-orange-400 bg-orange-50/30' : ''}
        `}
      >
        <div className="text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          </div>
          <span className="text-xs text-gray-500 hidden xs:block">Click to Add</span>
        </div>
      </div>
    )
  }

  // Single shift (use original styling)
  if (shifts.length === 1) {
    const shift = shifts[0]
    const isCheckedIn = shift.isCheckedIn || false
    const isDraft = (shift as any).isDraft || false

    return (
      <div
        className={`
          relative text-white p-2 sm:p-3 min-h-[80px] min-w-[100px]
          border-b border-r cursor-pointer
          ${isDraft
            ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-2 border-dashed border-amber-600'
            : isCheckedIn
              ? 'bg-gradient-to-br from-green-500 to-green-600 ring-2 ring-green-400'
              : 'bg-gradient-to-br from-blue-500 to-blue-600'}
          ${isToday && !isCheckedIn && !isDraft ? 'ring-2 ring-orange-400' : ''}
          hover:brightness-105 transition-all duration-200
        `}
        onClick={() => onEdit(shift)}
      >
        {/* Checked-in Badge */}
        {isCheckedIn && (
          <Badge
            variant="secondary"
            className="absolute top-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 shadow border bg-white text-green-700 border-green-300 flex items-center gap-1"
          >
            <CheckCircle className="h-3 w-3" />
            ACTIVE
          </Badge>
        )}

        {/* Draft Badge */}
        {isDraft && (
          <Badge
            variant="secondary"
            className="absolute top-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 shadow border bg-white text-amber-700 border-amber-300"
          >
            DRAFT
          </Badge>
        )}

        <div className={`flex items-start justify-between h-full ${isCheckedIn ? 'mt-6' : ''}`}>
          <div className="flex-1 min-w-0">
            {/* Time Display */}
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="text-xs font-semibold tracking-tight">
                {getTimeDisplay(shift.startTime, shift.endTime)}
              </span>
            </div>

            {/* Charger Location */}
            {shift.charger?.name && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs opacity-90 truncate">{shift.charger.name}</span>
              </div>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white hover:bg-white/20 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(shift)
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Shift
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(shift)
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Shift
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  // Multiple shifts (2+) - split view
  const multipleShiftCount = shifts.length
  const hasMultipleShifts = multipleShiftCount >= 2

  return (
    <div
      className={`
        relative min-h-[80px] min-w-[100px] border-b border-r
        ${isOver ? 'bg-blue-50' : 'bg-gray-50'}
        ${hasMultipleShifts ? 'ring-2 ring-purple-300 border-purple-300 bg-purple-50/60' : ''}
        ${isToday ? 'ring-2 ring-inset ring-orange-400' : ''}
      `}
    >
      {hasMultipleShifts && (
        <Badge
          variant="secondary"
          className="absolute top-1 right-1 text-[10px] font-semibold px-1.5 py-0.5 bg-white text-purple-700 border-purple-200 shadow"
        >
          {multipleShiftCount} shift{multipleShiftCount === 1 ? '' : 's'}
        </Badge>
      )}

      {/* Show 2 shifts stacked */}
      {shifts.length === 2 ? (
        <div className="flex flex-col h-full">
          {shifts.map((shift, index) => {
            const isCheckedIn = shift.isCheckedIn || false
            const isDraft = (shift as any).isDraft || false
            return (
              <div
                key={shift.id}
                className={`
                  flex-1 p-1.5 cursor-pointer relative
                  ${index === 0 ? 'border-b border-gray-300' : ''}
                  ${isDraft
                    ? 'bg-gradient-to-br from-amber-400 to-amber-500'
                    : isCheckedIn
                      ? 'bg-gradient-to-br from-green-500 to-green-600'
                      : 'bg-gradient-to-br from-blue-500 to-blue-600'}
                  text-white hover:brightness-105 transition-all
                `}
                onClick={() => onEdit(shift)}
              >
                {isDraft && (
                  <Badge
                    variant="secondary"
                    className="absolute top-0.5 left-0.5 text-[9px] px-1 py-0.5 bg-white text-amber-700 border-amber-300"
                  >
                    Draft
                  </Badge>
                )}
                {isCheckedIn && (
                  <div className="absolute top-0.5 left-0.5">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className={`text-[10px] ${isCheckedIn ? 'ml-4' : ''}`}>
                  <div className="font-semibold truncate">
                    {getTimeDisplay(shift.startTime, shift.endTime)}
                  </div>
                  {shift.charger?.name && (
                    <div className="truncate opacity-90">{shift.charger.name}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // 3+ shifts - scrollable compact list
        <div className="h-full overflow-y-auto space-y-0.5 p-1">
          {shifts.map((shift) => {
            const isCheckedIn = shift.isCheckedIn || false
            const isDraft = (shift as any).isDraft || false
            return (
              <div
                key={shift.id}
                className={`
                  p-1 cursor-pointer rounded relative
                  ${isDraft
                    ? 'bg-gradient-to-br from-amber-400 to-amber-500'
                    : isCheckedIn
                      ? 'bg-gradient-to-br from-green-500 to-green-600'
                      : 'bg-gradient-to-br from-blue-500 to-blue-600'}
                  text-white hover:brightness-105 transition-all
                `}
                onClick={() => onEdit(shift)}
              >
                {isDraft && (
                  <Badge
                    variant="secondary"
                    className="absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 bg-white text-amber-700 border-amber-300"
                  >
                    Draft
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  {isCheckedIn && <CheckCircle className="h-2.5 w-2.5 flex-shrink-0" />}
                  <div className="text-[9px] flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {shift.startTime && shift.endTime
                        ? `${shift.startTime}-${shift.endTime}`
                        : 'Flex'}
                    </div>
                    {shift.charger?.name && (
                      <div className="truncate opacity-80">
                        {shift.charger.name.substring(0, 10)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add more button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-white border border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center transition-all shadow-sm"
        title="Add another shift"
      >
        <Plus className="h-3 w-3 text-gray-600" />
      </button>
    </div>
  )
}
