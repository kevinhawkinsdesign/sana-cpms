'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, MapPin, X, Plus, MoreHorizontal, Edit, Trash2, CheckCircle } from 'lucide-react'
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

interface ShiftCellProps {
  operatorId: string
  dayOfWeek: number
  date: Date
  shift: Shift | undefined
  onClick: () => void
  onDelete: () => void
  overlapMeta?: { count: number; index: number; color: { badgeClass: string; ringClass: string } }
}

export const ShiftCell: React.FC<ShiftCellProps> = ({
  operatorId,
  dayOfWeek,
  date,
  shift,
  onClick,
  onDelete,
  overlapMeta
}) => {
  // Check if this date is today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cellDate = new Date(date)
  cellDate.setHours(0, 0, 0, 0)
  const isToday = cellDate.getTime() === today.getTime()
  // Droppable for empty cells
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `cell-${operatorId}-${dayOfWeek}`,
    data: {
      operatorId,
      dayOfWeek,
      type: 'cell'
    }
  })

  // Sortable for shift cards
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: shift?.id || `empty-${operatorId}-${dayOfWeek}`,
    data: {
      operatorId,
      dayOfWeek,
      type: 'shift',
      shift
    },
    disabled: !shift // Only make shift cards sortable, not empty cells
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getTimeDisplay = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return 'Flexible Shift'
    return `${startTime} - ${endTime}`
  }

  // Empty cell (no shift assigned)
  if (!shift) {
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
          <span className="text-xs text-gray-500 xs:hidden">Add</span>
        </div>
      </div>
    )
  }

  const badgeColorClass = overlapMeta?.color?.badgeClass || 'bg-black/50 text-white border-white/40'
  const ringClass = overlapMeta?.color?.ringClass || ''

  const overlapCount = overlapMeta?.count ?? 0

  // Determine if shift is checked in
  const isCheckedIn = shift.isCheckedIn || false

  // Shift cell (has shift assigned)
  return (
    <div
      ref={setSortableRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative text-white p-2 sm:p-3 min-h-[80px] min-w-[100px]
        border-b border-r cursor-grab active:cursor-grabbing
        ${isCheckedIn
          ? 'bg-gradient-to-br from-green-500 to-green-600 ring-2 ring-green-400'
          : 'bg-gradient-to-br from-blue-500 to-blue-600'}
        ${overlapCount >= 2 && !isCheckedIn ? `ring-2 ring-offset-2 ring-offset-blue-600 ${ringClass}` : ''}
        ${isToday && !isCheckedIn ? 'ring-2 ring-orange-400' : ''}
        hover:brightness-105 transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
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

      {/* Overlap Count Badge */}
      {overlapCount >= 2 && (
        <Badge
          variant="secondary"
          className={`absolute ${isCheckedIn ? 'bottom-1' : 'top-1'} right-1 text-[10px] font-semibold px-1.5 py-0.5 shadow border ${badgeColorClass}`}
        >
          {overlapCount}x
        </Badge>
      )}

      <div className="flex items-start justify-between h-full mt-${isCheckedIn ? '6' : '0'}">
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
              <span className="text-xs opacity-90 truncate">
                {shift.charger.name}
              </span>
            </div>
          )}

          {/* Additional info can go here if needed */}
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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onClick}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Shift
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete}
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
