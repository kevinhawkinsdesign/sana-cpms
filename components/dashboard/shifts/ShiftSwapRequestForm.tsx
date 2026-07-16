/*
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Calendar, Clock, User, MessageSquare, X, Loader2 } from 'lucide-react'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import {
  getAvailableOperators,
  createShiftSwap,
  getOperatorShifts,
  getNextValidDateForDayOfWeek,
  doesDateMatchDayOfWeek,
  getDayName,
  type CreateShiftSwapData,
  type Operator,
  type OperatorShift,
} from '@/lib/api/shiftsAndInspections'

const shiftSwapSchema = z.object({
  operatorShiftId: z.string().min(1, 'Please select a shift'),
  targetOperatorId: z.string().min(1, 'Please select an operator'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
  swapDate: z.string().min(1, 'Please select a swap date'),
})

type ShiftSwapFormData = z.infer<typeof shiftSwapSchema>

interface ShiftSwapRequestFormProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ShiftSwapRequestForm({ open, onClose, onSuccess }: ShiftSwapRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<ShiftSwapFormData>({
    resolver: zodResolver(shiftSwapSchema),
    defaultValues: {
      operatorShiftId: '',
      targetOperatorId: '',
      reason: '',
      swapDate: '',
    }
  })

  // Fetch available operators
  const { data: operatorsData, isLoading: operatorsLoading } = useQuery({
    queryKey: ['availableOperators'],
    queryFn: getAvailableOperators,
    enabled: open,
  })

  // Fetch operator shifts
  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['operatorShifts'],
    queryFn: getOperatorShifts,
    enabled: open,
  })

  const operators = operatorsData?.operators || []
  const shifts = shiftsData?.shifts || []

  // Set default swap date based on selected shift's dayOfWeek
  useEffect(() => {
    const selectedShiftId = form.watch('operatorShiftId')
    const selectedShift = shifts.find(shift => shift.id === selectedShiftId)

    if (open && selectedShift) {
      const nextValidDate = getNextValidDateForDayOfWeek(selectedShift.dayOfWeek)
      form.setValue('swapDate', nextValidDate)
    } else if (open && !selectedShift && !form.getValues('swapDate')) {
      // Fallback to tomorrow if no shift is selected yet
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      form.setValue('swapDate', tomorrow.toISOString().split('T')[0])
    }
  }, [open, form, shifts, form.watch('operatorShiftId')])

  // Create shift swap mutation
  const createSwapMutation = useMutation({
    mutationFn: createShiftSwap,
    onSuccess: (data) => {
      // Show success message
      toast.success('Shift swap request created successfully!')
      
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['allShiftSwaps'] })
      queryClient.invalidateQueries({ queryKey: ['pendingShiftSwaps'] })
      queryClient.invalidateQueries({ queryKey: ['operatorShifts'] })
      
      // Reset form and close dialog
      form.reset()
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      // Show error message
      toast.error(error.message || 'Failed to create shift swap request. Please try again.')
      console.error('Error creating shift swap:', error)
    }
  })

  const onSubmit = async (data: ShiftSwapFormData) => {
    // Validate that the swap date matches the selected shift's dayOfWeek
    const selectedShift = shifts.find(shift => shift.id === data.operatorShiftId)
    if (selectedShift && !doesDateMatchDayOfWeek(data.swapDate, selectedShift.dayOfWeek)) {
      const dayName = getDayName(selectedShift.dayOfWeek)
      form.setError('swapDate', {
        type: 'manual',
        message: `Swap date must be on a ${dayName} to match your selected shift`
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createSwapMutation.mutateAsync(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const selectedShift = shifts.find(shift => shift.id === form.watch('operatorShiftId'))

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Request Shift Swap
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           
            <FormField
              control={form.control}
              name="operatorShiftId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Select Shift to Swap
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a shift..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {shiftsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading shifts...
                        </div>
                      ) : shifts.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No shifts available
                        </div>
                      ) : (
                        shifts.map((shift) => (
                          <SelectItem key={shift.id} value={shift.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {getDayName(shift.dayOfWeek)} - {shift.startTime} to {shift.endTime}
                              </span>
                              {shift.charger && (
                                <span className="text-sm text-muted-foreground">
                                  {shift.charger.name}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          

            <FormField
              control={form.control}
              name="targetOperatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Select Operator to Swap With
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an operator..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {operatorsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading operators...
                        </div>
                      ) : operators.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No operators available
                        </div>
                      ) : (
                        operators.map((operator) => (
                          <SelectItem key={operator.id} value={operator.id}>
                            {operator.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the operator you want to swap shifts with
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

           
            <FormField
              control={form.control}
              name="swapDate"
              render={({ field }) => {
                const selectedShift = shifts.find(shift => shift.id === form.watch('operatorShiftId'))
                const dayName = selectedShift ? getDayName(selectedShift.dayOfWeek) : null

                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Swap Date
                      {selectedShift && (
                        <span className="text-sm text-muted-foreground">
                          (Must be on a {dayName})
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          field.onChange(e)
                          // Clear any previous error when user changes the date
                          if (form.formState.errors.swapDate) {
                            form.clearErrors('swapDate')
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {selectedShift ? (
                        <>
                          Select a {dayName} when this shift swap will be effective.
                          Next available: {getNextValidDateForDayOfWeek(selectedShift.dayOfWeek)}
                        </>
                      ) : (
                        'Please select a shift first to see available dates'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Reason for Swap (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why you need to swap this shift..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || operatorsLoading || shiftsLoading}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Creating Request...' : 'Request Swap'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
*/
