 'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  X, 
  Save,
  Plus,
  RefreshCw
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { type User as Operator } from '@/lib/api/shifts'
import { ChargerSelect } from '@/components/ui/ChargerSelect'

// Form validation schema
const shiftFormSchema = z.object({
  operatorId: z.string().min(1, 'Please select an operator'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  chargerId: z.string().optional(),
  isLastShift: z.boolean().optional(),
  repeatDays: z.array(z.number().min(0).max(6)).optional(),
}).refine((data) => {
  // If start time is provided and not "flexible", end time should also be provided
  if (data.startTime && data.startTime !== 'flexible' && !data.endTime) {
    return false
  }
  if (!data.startTime && data.endTime && data.endTime !== 'flexible') {
    return false
  }
  return true
}, {
  message: "Both start time and end time must be provided together",
  path: ["endTime"]
})

type ShiftFormData = z.infer<typeof shiftFormSchema>

interface CreateShiftModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCell: { operatorId: string; dayOfWeek: number; date?: string } | null
  operators: Operator[]
  onCreateSuccess: () => void
  isDraftMode: boolean
  onCreateShift: (payload: {
    operatorId: string
    shiftDate: string
    dayOfWeek?: number
    startTime?: string
    endTime?: string
    chargerId?: string
    chargerName?: string
    isLastShift?: boolean
  }, options?: { draftId?: string }) => Promise<void>
}

export const CreateShiftModal: React.FC<CreateShiftModalProps> = ({
  isOpen,
  onClose,
  selectedCell,
  operators,
  onCreateSuccess,
  isDraftMode,
  onCreateShift
}) => {
  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      operatorId: selectedCell?.operatorId || '',
      startTime: 'flexible',
      endTime: 'flexible',
      chargerId: undefined,
      isLastShift: false,
      repeatDays: [],
    }
  })

  const normalizeShiftDate = (dateString?: string) => {
    if (!dateString) return null
    const dateInstance = new Date(dateString)
    if (Number.isNaN(dateInstance.getTime())) return null
    dateInstance.setHours(12, 0, 0, 0)
    return dateInstance.toISOString()
  }

  // Update form when selectedCell changes
  React.useEffect(() => {
    if (selectedCell) {
      form.setValue('operatorId', selectedCell.operatorId)
    }
  }, [selectedCell, form])

  // Check if operator is pre-selected from cell click
  const isOperatorPreSelected = Boolean(selectedCell?.operatorId)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedChargerName, setSelectedChargerName] = useState<string | undefined>(undefined)

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ]

  const timeSlots = Array.from({ length: 24 }, (_, hour) =>
    `${hour.toString().padStart(2, '0')}:00`
  )

  // Convert 24-hour time to 12-hour format with AM/PM
  const formatTimeWithAMPM = (time24: string) => {
    if (time24 === '' || time24 === 'flexible') return 'Flexible'
    const [hours, minutes] = time24.split(':')
    const hour24 = parseInt(hours)
    if (hour24 === 0) return `12:${minutes} AM`
    if (hour24 < 12) return `${hour24}:${minutes} AM`
    if (hour24 === 12) return `12:${minutes} PM`
    return `${hour24 - 12}:${minutes} PM`
  }

  const handleSubmit = async (data: ShiftFormData) => {
    setIsCreating(true)

    // Convert "flexible" back to empty strings for API
    const baseApiData = {
      operatorId: data.operatorId,
      startTime: data.startTime === 'flexible' ? '' : data.startTime,
      endTime: data.endTime === 'flexible' ? '' : data.endTime,
      chargerId: data.chargerId,
      isLastShift: data.isLastShift || false,
    }

    // Create a shift for the specific date
    try {
      if (!selectedCell?.date) {
        toast.error('No date selected')
        setIsCreating(false)
        return
      }

      const normalizedBase = normalizeShiftDate(selectedCell.date)
      if (!normalizedBase) {
        toast.error('Unable to determine base date for this shift')
        setIsCreating(false)
        return
      }

      const baseDate = new Date(normalizedBase)
      const repeatDays = Array.from(new Set(data.repeatDays || [])).filter(
        (day) => day >= 0 && day <= 6
      )
      const datesToCreate = new Set<string>([normalizedBase])

      repeatDays.forEach((dayValue) => {
        const diff = dayValue - baseDate.getDay()
        const targetDate = new Date(baseDate)
        targetDate.setDate(baseDate.getDate() + diff)
        targetDate.setHours(12, 0, 0, 0)
        datesToCreate.add(targetDate.toISOString())
      })

      let createdCount = 0
      let failedCount = 0

      for (const shiftDate of datesToCreate) {
        try {
          const dateInstance = new Date(shiftDate)
          await onCreateShift({
            ...baseApiData,
            shiftDate,
            dayOfWeek: dateInstance.getDay(),
            chargerName: selectedChargerName
          })
          createdCount++
        } catch (error) {
          console.error(`Failed to create shift for date ${shiftDate}:`, error)
          failedCount++
        }
      }

      if (createdCount > 0) {
        const plural = createdCount === 1 ? '' : 's'
        const action = isDraftMode ? 'saved locally' : 'created successfully'
        if (failedCount > 0) {
          toast.warning(`${createdCount} shift${plural} ${action}. ${failedCount} failed.`)
        } else {
          toast.success(`${createdCount} shift${plural} ${action}`)
        }
        onCreateSuccess()
        form.reset()
        setSelectedChargerName(undefined)
      } else {
        toast.error('Failed to create shifts')
      }
    } catch (error: any) {
      console.error('Error creating shift:', error)
      toast.error(error.message || 'Failed to create shift')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setSelectedChargerName(undefined)
    onClose()
  }

  const selectedOperator = operators.find(op => op.id === form.watch('operatorId'))
  const baseDayOfWeek = selectedCell?.dayOfWeek
  const baseDayLabel = baseDayOfWeek !== undefined
    ? daysOfWeek.find(day => day.value === baseDayOfWeek)?.label
    : undefined

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            {isOperatorPreSelected && selectedOperator
              ? `Create Shift for ${selectedOperator.firstName || 'Unknown'} ${selectedOperator.lastName || 'Operator'}`
              : 'Create New Shift'
            }
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isOperatorPreSelected
              ? `Create a new shift assignment for ${selectedOperator?.firstName || 'Unknown'} ${selectedOperator?.lastName || 'Operator'}`
              : 'Create a new shift assignment for an operator'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6">
            {/* Operator Selection */}
            <FormField
              control={form.control}
              name="operatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Operator
                  </FormLabel>
                  {isOperatorPreSelected && selectedOperator ? (
                    // Show pre-selected operator as read-only
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <Avatar className="w-8 h-8">
                        <AvatarImage 
                          src={selectedOperator.imageUrl || selectedOperator.avatar || selectedOperator.profilePicture || selectedOperator.picture} 
                          alt={`${selectedOperator.firstName || 'Unknown'} ${selectedOperator.lastName || 'Operator'}`}
                        />
                        <AvatarFallback className="text-sm font-semibold bg-blue-100 text-blue-600">
                          {selectedOperator.firstName?.charAt(0) || ''}{selectedOperator.lastName?.charAt(0) || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-blue-900">
                          {selectedOperator.firstName || 'Unknown'} {selectedOperator.lastName || 'Operator'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Allow operator selection
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an operator" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {operators.map((operator) => (
                          <SelectItem key={operator.id} value={operator.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage 
                                  src={operator.imageUrl || operator.avatar || operator.profilePicture || operator.picture} 
                                  alt={`${operator.firstName || 'Unknown'} ${operator.lastName || 'Operator'}`}
                                />
                                <AvatarFallback className="text-xs font-semibold bg-blue-100 text-blue-600">
                                  {operator.firstName?.charAt(0) || ''}{operator.lastName?.charAt(0) || ''}
                                </AvatarFallback>
                              </Avatar>
                              <span>{operator.firstName || 'Unknown'} {operator.lastName || 'Operator'}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Display - Read Only */}
            {selectedCell?.date && (
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Shift Date
                </Label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm font-medium text-blue-900">
                    {new Date(selectedCell.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Repeat Days */}
            <FormField
              control={form.control}
              name="repeatDays"
              render={({ field }) => {
                const selectedRepeatDays = field.value || []
                const toggleDay = (dayValue: number) => {
                  if (dayValue === baseDayOfWeek) return
                  if (selectedRepeatDays.includes(dayValue)) {
                    field.onChange(selectedRepeatDays.filter((value: number) => value !== dayValue))
                  } else {
                    field.onChange([...selectedRepeatDays, dayValue])
                  }
                }

                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Repeat This Shift (Optional)
                    </FormLabel>
                    <FormDescription>
                      Select additional weekdays this week to copy the same schedule.{baseDayLabel ? ` The original shift stays on ${baseDayLabel}.` : ''}
                    </FormDescription>
                    <FormControl>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2 mt-2">
                        {daysOfWeek.map((day) => {
                          const isBaseDay = day.value === baseDayOfWeek
                          const isSelected = selectedRepeatDays.includes(day.value)
                          return (
                            <Button
                              key={day.value}
                              type="button"
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              className={`justify-center text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 ${isBaseDay ? 'opacity-60 cursor-not-allowed' : isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'text-gray-600'}`}
                              onClick={() => toggleDay(day.value)}
                              disabled={isBaseDay}
                            >
                              {day.label.slice(0, 3)}
                            </Button>
                          )
                        })}
                      </div>
                    </FormControl>
                  </FormItem>
                )
              }}
            />

            {/* Time Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Start Time
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="flexible">Flexible</SelectItem>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            <div className="flex items-center gap-2">
                              <span>{formatTimeWithAMPM(time)}</span>
                              <span className="text-xs text-gray-400">({time})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      End Time
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select end time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="flexible">Flexible</SelectItem>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            <div className="flex items-center gap-2">
                              <span>{formatTimeWithAMPM(time)}</span>
                              <span className="text-xs text-gray-400">({time})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Charger Selection */}
            <FormField
              control={form.control}
              name="chargerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Charger Location (Optional)
                  </FormLabel>
                  <ChargerSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    onChargerSelect={(charger) => setSelectedChargerName(charger?.name)}
                    placeholder="Select a charger location"
                  />
                  <FormDescription>
                    Assign this shift to a specific charger location
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Last Shift */}
            <FormField
              control={form.control}
              name="isLastShift"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      Last Shift of Day
                    </FormLabel>
                    <FormDescription>
                      Mark this shift as the last shift of the day. When checking out, the system will not check if the next operator has checked in.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Shift
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
