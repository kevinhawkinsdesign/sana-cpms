'use client'

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, UserPlus, X } from "lucide-react"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useVehicleData } from "@/lib/hooks/useVehicleData"
import { useEffect } from "react"

const quickRegistrationSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  licenseNumber: z.string().min(3, 'License plate must be at least 3 characters').max(10, 'License plate must be at most 10 characters').transform(val => val.toUpperCase()),
  makeId: z.string().min(1, "Car make is required"),
  modelId: z.string().uuid("Model is required"),
})

type QuickRegistrationFormData = z.infer<typeof quickRegistrationSchema>

interface QuickRegistrationDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void> | any
  isLoading: boolean
  vehicleId: string // ID to register
}

export function QuickRegistrationDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  vehicleId
}: QuickRegistrationDialogProps) {
  const form = useForm<QuickRegistrationFormData>({
    resolver: zodResolver(quickRegistrationSchema)
  })

  const { data: makes, isLoading: isLoadingMakes } = useVehicleData()
  const selectedMake = form.watch("makeId")

  // Reset model when make changes
  useEffect(() => {
    form.setValue("modelId", "")
  }, [selectedMake, form])

  const handleSubmit = async (data: QuickRegistrationFormData) => {
    const apiData = {
      id: vehicleId,
      info: {
        "Owner - First Name": data.firstName,
        "Owner - Last Name": data.lastName,
        "License Plate #": data.licenseNumber,
        modelId: data.modelId
      }
    }

    await onSubmit(apiData)
  }

  // Get models for selected make - with proper error handling
  const availableModels = Array.isArray(makes) 
    ? makes.find((make: any) => make.id === selectedMake)?.models || []
    : []

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Quick Vehicle Registration
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter first name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Plate Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter license plate" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="makeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Make</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingMakes}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select make" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(makes) ? makes.map((make: any) => (
                          <SelectItem key={make.id} value={make.id}>
                            {make.make}
                          </SelectItem>
                        )) : []}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Model</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedMake || isLoadingMakes}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableModels.map((model: any) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isLoadingMakes}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Register Vehicle
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}