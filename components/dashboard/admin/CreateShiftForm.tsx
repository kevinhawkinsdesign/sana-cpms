'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  X, 
  AlertCircle,
  Save,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
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
import { updateShift, getAllUsers, type Shift, type User as ShiftUser } from '@/lib/api/shifts'
import { getOperators } from '@/lib/api/admin'
import { ChargerSelect } from '@/components/ui/ChargerSelect'
import { getAuthTokens } from '@/lib/utils/authStorage'

// Form validation schema
const shiftFormSchema = z.object({
  operatorId: z.string().min(1, 'Please select an operator'),
  selectedDates: z.array(z.string()).min(1, 'Please select at least one date'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  chargerId: z.string().optional(),
  isLastShift: z.boolean().optional(),
  repeatDays: z.array(z.number().min(0).max(6)).optional(),
}).refine((data) => {
  // If start time is provided, end time should also be provided
  if (data.startTime && !data.endTime) {
    return false
  }
  if (!data.startTime && data.endTime) {
    return false
  }
  // Removed the end time validation to allow overnight shifts
  return true
}, {
  message: "Both start time and end time must be provided together",
  path: ["endTime"]
})

type ShiftFormData = z.infer<typeof shiftFormSchema>

interface CreateShiftFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editShift?: Shift | null
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
  onDeleteShift?: (shift: Shift) => void
}

const CreateShiftForm: React.FC<CreateShiftFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editShift,
  isDraftMode,
  onCreateShift,
  onDeleteShift
}) => {
  const queryClient = useQueryClient()
  const isEditing = !!editShift
  const [selectedChargerName, setSelectedChargerName] = useState<string | undefined>(editShift?.charger?.name)

  const normalizeShiftDate = (dateString?: string) => {
    if (!dateString) return null
    const dateInstance = new Date(dateString)
    if (Number.isNaN(dateInstance.getTime())) return null
    dateInstance.setHours(12, 0, 0, 0)
    return dateInstance.toISOString()
  }

  useEffect(() => {
    setSelectedChargerName(editShift?.charger?.name)
  }, [editShift])

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      operatorId: '',
      selectedDates: [],
      startTime: 'flexible',
      endTime: 'flexible',
      chargerId: undefined,
      isLastShift: false,
      repeatDays: [],
    }
  })

  // Fetch users and chargers
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const tokens = getAuthTokens()
      const result = await getAllUsers()
      return result
    },
    enabled: isOpen,
  })

  const { data: operatorsData } = useQuery({
    queryKey: ['adminOperators'],
    queryFn: getOperators,
    enabled: isOpen,
  })

  // Handle users error
  useEffect(() => {
    if (usersError) {
      console.error('🔍 CreateShiftForm - Error fetching users:', usersError)
      toast.error('Failed to load operators')
    }
  }, [usersError])



  // Note: We handle shifts manually in onSubmit instead of using mutation
  // because we need to create multiple shifts for different days

  const users = usersData?.data?.users || []
  const operators = users.filter((user: ShiftUser) => user.role === 'OPERATOR')
  const adminOperators = operatorsData?.data?.operators || []
  const traineeByOperatorId = Object.fromEntries(
    adminOperators.map((op) => [op.id, op.isTrainee])
  )

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ]

  // Set form values when editing
  useEffect(() => {
    if (isEditing && editShift) {
      const normalizedDate = normalizeShiftDate(editShift.shiftDate)
      form.reset({
        operatorId: editShift.operatorId,
        selectedDates: normalizedDate ? [normalizedDate] : [],
        startTime: editShift.startTime && editShift.startTime !== '' ? editShift.startTime : 'flexible',
        endTime: editShift.endTime && editShift.endTime !== '' ? editShift.endTime : 'flexible',
        chargerId: editShift.chargerId || undefined,
        isLastShift: editShift.isLastShift ?? false,
        repeatDays: [],
      })
    } else {
      form.reset({
        operatorId: '',
        selectedDates: [],
        startTime: 'flexible',
        endTime: 'flexible',
        chargerId: undefined,
        isLastShift: false,
        repeatDays: [],
      })
    }
  }, [isEditing, editShift, form])

  const [isCreating, setIsCreating] = useState(false)

  // Time slots for dropdown (24h coverage)
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

  const handleClose = () => {
    form.reset()
    setSelectedChargerName(undefined)
    onClose()
  }

  const handleDeleteShiftRequest = () => {
    if (isEditing && editShift && onDeleteShift) {
      onDeleteShift(editShift)
    }
  }

  const onSubmit = async (data: ShiftFormData) => {
    if (isEditing && editShift) {
      const isDraftShift = Boolean((editShift as any)?.isDraft)
      const selectedDateValue = data.selectedDates[0]
      if (!selectedDateValue) {
        toast.error('Please select a shift date')
        return
      }
      const dateInstance = new Date(selectedDateValue)
      const shiftDateISO = dateInstance.toISOString()
      const submitData = {
        operatorId: data.operatorId,
        shiftDate: shiftDateISO,
        dayOfWeek: dateInstance.getDay(),
        startTime: data.startTime === 'flexible' ? '' : data.startTime || undefined,
        endTime: data.endTime === 'flexible' ? '' : data.endTime || undefined,
        chargerId: data.chargerId || undefined,
        isLastShift: data.isLastShift || false
      }

      if (isDraftShift) {
        try {
          await onCreateShift(
            {
              ...submitData,
              dayOfWeek: editShift.dayOfWeek ?? dateInstance.getDay(),
              chargerName: selectedChargerName ?? editShift.charger?.name
            },
            { draftId: editShift.id }
          )
          toast.success('Draft shift updated locally')
          onSuccess()
          handleClose()
        } catch (error: any) {
          console.error('Update draft shift error:', error)
          toast.error(error?.message || 'Failed to update draft shift')
        }
      } else {
        updateShift(editShift.id, submitData).then(() => {
          queryClient.invalidateQueries({ queryKey: ['shifts'] })
          toast.success('Shift updated successfully')
          onSuccess()
          handleClose()
        }).catch((error: any) => {
          console.error('Update shift error:', error)
          toast.error(error.message || 'Failed to update shift')
        })
      }
    } else {
      // For creating, create shifts for all selected dates
      setIsCreating(true)
      const baseApiData = {
        operatorId: data.operatorId,
        startTime: data.startTime === 'flexible' ? '' : data.startTime || undefined,
        endTime: data.endTime === 'flexible' ? '' : data.endTime || undefined,
        chargerId: data.chargerId || undefined,
        isLastShift: data.isLastShift || false
      }

      try {
        let createdCount = 0
        let failedCount = 0
        const repeatDays = Array.from(new Set(data.repeatDays || [])).filter(
          (day) => day >= 0 && day <= 6
        )
        const datesToCreate = new Set<string>()

        for (const shiftDate of data.selectedDates) {
          const normalizedBase = normalizeShiftDate(shiftDate)
          if (!normalizedBase) continue
          datesToCreate.add(normalizedBase)

          if (repeatDays.length > 0) {
            const baseDate = new Date(normalizedBase)
            repeatDays.forEach((dayValue) => {
              const diff = dayValue - baseDate.getDay()
              const targetDate = new Date(baseDate)
              targetDate.setDate(baseDate.getDate() + diff)
              targetDate.setHours(12, 0, 0, 0)
              datesToCreate.add(targetDate.toISOString())
            })
          }
        }

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
          if (failedCount > 0) {
            toast.warning(
              `${createdCount} ${isDraftMode ? 'draft shift' : 'shift'}${plural} saved. ${failedCount} failed.`
            )
          } else {
            toast.success(
              `${createdCount} ${isDraftMode ? 'draft shift' : 'shift'}${plural} ${isDraftMode ? 'saved locally' : 'created successfully'}`
            )
          }
          onSuccess()
          handleClose()
        } else {
          toast.error('Failed to create shifts')
        }
      } catch (error) {
        console.error('Error creating shifts:', error)
        toast.error('Failed to create shifts')
      } finally {
        setIsCreating(false)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            {isEditing ? (
              <>
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Edit Shift
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                Create New Shift
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isEditing ? 'Update the shift details' : 'Create a new operator shift schedule'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Operator Selection */}
            <FormField
              control={form.control}
              name="operatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Operator *
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an operator" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {usersLoading ? (
                        <div className="p-4">
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : usersError ? (
                        <div className="p-4 text-center text-red-500">
                          <AlertCircle className="h-4 w-4 mx-auto mb-2" />
                          Failed to load operators
                        </div>
                      ) : operators.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No operators found
                        </div>
                      ) : (
                        operators.map((operator: ShiftUser) => (
                          <SelectItem key={operator.id} value={operator.id}>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold">
                                {operator.firstName?.[0]}{operator.lastName?.[0]}
                              </div>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {operator.firstName} {operator.lastName}
                                  {(traineeByOperatorId[operator.id] || operator.isTrainee) && (
                                    <Badge variant="secondary" className="text-xs">Trainee</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {operator.email}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the operator for this shift
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Selection */}
            <FormField
              control={form.control}
              name="selectedDates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4" />
                    {isEditing ? 'Shift Date *' : 'Select Date *'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value?.[0] ? new Date(field.value[0]).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const date = new Date(e.target.value)
                          date.setHours(12, 0, 0, 0) // Set to noon to avoid timezone issues
                          field.onChange([date.toISOString()])
                        } else {
                          field.onChange([])
                        }
                      }}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    {isEditing
                      ? 'Update the scheduled date for this shift'
                      : 'Select the specific date for this shift'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Repeat Days */}
            {!isEditing && (
              <FormField
                control={form.control}
                name="repeatDays"
                render={({ field }) => {
                  const selectedDays = field.value || []
                  const toggleDay = (dayValue: number) => {
                    if (selectedDays.includes(dayValue)) {
                      field.onChange(selectedDays.filter((value: number) => value !== dayValue))
                    } else {
                      field.onChange([...selectedDays, dayValue])
                    }
                  }

                  return (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Repeat This Shift (Optional)
                      </FormLabel>
                      <FormDescription>
                        Select other weekdays in the same week to duplicate this shift automatically.
                      </FormDescription>
                      <FormControl>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2 mt-2">
                          {daysOfWeek.map((day) => {
                            const isSelected = selectedDays.includes(day.value)
                            return (
                              <Button
                                key={day.value}
                                type="button"
                                variant={isSelected ? 'default' : 'outline'}
                                size="sm"
                                className={`justify-center text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 ${isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'text-gray-600'}`}
                                onClick={() => toggleDay(day.value)}
                              >
                                {day.label.slice(0, 3)}
                              </Button>
                            )
                          })}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Leave unselected to only create the chosen date.
                      </FormDescription>
                    </FormItem>
                  )
                }}
              />
            )}

            {/* Time Range */}
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
                    <Select onValueChange={field.onChange} value={field.value || ''}>
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
                    <FormDescription className="text-xs">
                      Optional: Set start time or select Flexible
                    </FormDescription>
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
                    <Select onValueChange={field.onChange} value={field.value || ''}>
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
                    <FormDescription className="text-xs">
                      Optional: Set end time or select Flexible
                    </FormDescription>
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
                    Charger
                  </FormLabel>
                  <FormControl>
                    <ChargerSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      onChargerSelect={(charger) => setSelectedChargerName(charger?.name)}
                      placeholder="Any charger (optional)"
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: Assign to a specific charger
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

            {/* Form Actions */}
            <div className="flex flex-col gap-3 pt-4 sm:pt-6 border-t">
              {isEditing && editShift && onDeleteShift && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteShiftRequest}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Shift
                </Button>
              )}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {isEditing ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {isEditing
                        ? 'Update Shift'
                        : 'Create Shift(s)'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateShiftForm
