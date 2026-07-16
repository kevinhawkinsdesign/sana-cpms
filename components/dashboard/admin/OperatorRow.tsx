'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { User, Clock, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { type User as Operator, type Shift } from '@/lib/api/shifts'
import { MultiShiftCell } from './MultiShiftCell'

interface WeekDay {
  date: Date
  dayOfWeek: number
  dayName: string
  dayNumber: number
  month: string
}

interface OperatorRowProps {
  operator: Operator
  weekDays: WeekDay[]
  shiftsByOperator: { [operatorId: string]: { [dayOfWeek: number]: Shift[] } }
  onCellClick: (operatorId: string, dayOfWeek: number, date: Date) => void
  onEditShift: (shift: Shift) => void
  onDeleteShift: (shift: Shift) => void
  overlappingMeta: Record<string, { count: number; index: number; color: { badgeClass: string; ringClass: string } }>
}

export const OperatorRow: React.FC<OperatorRowProps> = ({
  operator,
  weekDays,
  shiftsByOperator,
  onCellClick,
  onEditShift,
  onDeleteShift,
  overlappingMeta
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: operator.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getOperatorInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return `${last}${first}`.toUpperCase() || 'OP'
  }

  const getRandomColor = (initials: string) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600',
      'bg-purple-100 text-purple-600',
      'bg-orange-100 text-orange-600',
      'bg-pink-100 text-pink-600',
      'bg-indigo-100 text-indigo-600',
      'bg-teal-100 text-teal-600',
      'bg-red-100 text-red-600',
    ]
    const index = initials.charCodeAt(0) % colors.length
    return colors[index]
  }

  const operatorShifts = shiftsByOperator[operator.id] || {}
  const initials = getOperatorInitials(operator.firstName, operator.lastName)
  const colorClass = getRandomColor(initials || 'OP')

  return (
    <>
      {/* Operator Name Column */}
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`bg-white p-2 sm:p-4 border-r border-b hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing min-w-[120px] ${
          isDragging ? 'opacity-50' : ''
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
            <AvatarImage 
              src={operator.imageUrl || operator.avatar || operator.profilePicture || operator.picture} 
              alt={`${operator.lastName || 'Operator'}, ${operator.firstName || 'Unknown'}`}
            />
            <AvatarFallback className={`text-xs sm:text-sm font-semibold ${colorClass}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 truncate text-sm sm:text-base">
                {operator.lastName || 'Operator'}, {operator.firstName || 'Unknown'}
              </span>
              {operator.isTrainee && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Trainee
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate hidden xs:block">
              {operator.email || 'No email'}
            </div>
          </div>
        </div>
      </div>

      {/* Shift Cells for each day */}
      {weekDays.map((day) => {
        const shifts = operatorShifts[day.dayOfWeek] || []
        return (
          <MultiShiftCell
            key={`${operator.id}-${day.dayOfWeek}`}
            operatorId={operator.id}
            dayOfWeek={day.dayOfWeek}
            date={day.date}
            shifts={shifts}
            onClick={() => onCellClick(operator.id, day.dayOfWeek, day.date)}
            onEdit={onEditShift}
            onDelete={onDeleteShift}
          />
        )
      })}
    </>
  )
}
