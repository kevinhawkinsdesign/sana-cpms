'use client'

import React from 'react'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import type { Charger } from '@/lib/api/admin'

export interface FreeChargingFormValues {
  mode: 'sessions' | 'kwh'
  remainingCount?: number
  isUnlimited: boolean
  freeKwhLimit?: number
  periodType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'
  customDays?: number
  validFrom: string
  validUntil?: string
  chargerSelectionType: 'all' | 'specific'
  chargers?: string[]
}

interface FreeChargingAllowanceFormProps {
  form: UseFormReturn<FreeChargingFormValues>
  chargers: Charger[]
  chargersLoading: boolean
  chargerSearchTerm: string
  onChargerSearchChange: (value: string) => void
  onSubmit: (data: FreeChargingFormValues) => void
  onCancel: () => void
  isSubmitting: boolean
  isEdit: boolean
  idPrefix: 'individual' | 'business'
}

export function FreeChargingAllowanceForm({
  form,
  chargers,
  chargersLoading,
  chargerSearchTerm,
  onChargerSearchChange,
  onSubmit,
  onCancel,
  isSubmitting,
  isEdit,
  idPrefix,
}: FreeChargingAllowanceFormProps) {
  const mode = form.watch('mode')
  const isUnlimited = form.watch('isUnlimited')
  const chargerSelectionType = form.watch('chargerSelectionType')
  const periodType = form.watch('periodType')

  const modeSessionsId = `mode-sessions-${idPrefix}`
  const modeKwhId = `mode-kwh-${idPrefix}`
  const allChargersId = `all-chargers-${idPrefix}`
  const specificChargersId = `specific-chargers-${idPrefix}`

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Mode toggle: sessions vs kWh cap */}
        <FormField
          control={form.control}
          name="mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allowance Mode</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sessions" id={modeSessionsId} />
                    <Label htmlFor={modeSessionsId} className="font-normal cursor-pointer">
                      By sessions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="kwh" id={modeKwhId} />
                    <Label htmlFor={modeKwhId} className="font-normal cursor-pointer">
                      By kWh cap
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                Choose whether this allowance is limited by number of sessions or by a kWh cap per period.
              </FormDescription>
            </FormItem>
          )}
        />

        {/* Session-based configuration */}
        {mode === 'sessions' && (
          <FormField
            control={form.control}
            name="isUnlimited"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Unlimited Allowance</FormLabel>
                  <FormDescription>
                    Allow unlimited free charging sessions
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {mode === 'sessions' && !isUnlimited && (
          <FormField
            control={form.control}
            name="remainingCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remaining Sessions</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="10"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Number of free charging sessions remaining
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* KWh-cap configuration */}
        {mode === 'kwh' && (
          <>
            <FormField
              control={form.control}
              name="freeKwhLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Free kWh Limit per Period</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 50"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number.parseFloat(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Total free kWh available per period across all applicable chargers.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="periodType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period Type</FormLabel>
                  <FormControl>
                    <select
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                      className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="" disabled>
                        Select period type
                      </option>
                      <option value="DAY">Per day</option>
                      <option value="WEEK">Per week</option>
                      <option value="MONTH">Per month</option>
                      <option value="YEAR">Per year</option>
                      <option value="CUSTOM">Custom (N days)</option>
                    </select>
                  </FormControl>
                  <FormDescription>
                    Defines how often the free kWh allowance resets.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {periodType === 'CUSTOM' && (
              <FormField
                control={form.control}
                name="customDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Period Length (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g. 7, 14, 30"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number.parseInt(e.target.value, 10) : undefined)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Number of days in each period window, starting from the valid from date.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <FormField
          control={form.control}
          name="validFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valid From</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Start date for the allowance
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="validUntil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valid Until (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value || undefined)}
                  min={form.getValues('validFrom') || new Date().toISOString().split('T')[0]}
                />
              </FormControl>
              <FormDescription>
                End date for the allowance (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="chargerSelectionType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Charger Selection</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id={allChargersId} />
                    <Label htmlFor={allChargersId} className="font-normal cursor-pointer">
                      All Chargers
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id={specificChargersId} />
                    <Label htmlFor={specificChargersId} className="font-normal cursor-pointer">
                      Specific Chargers
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                Choose whether this allowance applies to all chargers or specific ones
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {chargerSelectionType === 'specific' && (
          <FormField
            control={form.control}
            name="chargers"
            render={({ field }) => {
              const filteredChargers = chargers.filter((charger) => {
                const searchLower = chargerSearchTerm.toLowerCase()
                return (
                  charger.name?.toLowerCase().includes(searchLower) ||
                  charger.kabisaId?.toLowerCase().includes(searchLower) ||
                  charger.address?.toLowerCase().includes(searchLower)
                )
              })

              return (
                <FormItem>
                  <FormLabel>Select Chargers</FormLabel>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search chargers by name, ID, or location..."
                      value={chargerSearchTerm}
                      onChange={(e) => onChargerSearchChange(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                    {chargersLoading ? (
                      <div className="text-sm text-gray-500 text-center py-4">
                        Loading chargers...
                      </div>
                    ) : filteredChargers.length > 0 ? (
                      filteredChargers.map((charger) => (
                        <div key={charger.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${idPrefix}-${charger.id}`}
                            checked={field.value?.includes(charger.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value || []
                              if (checked) {
                                field.onChange([...current, charger.id])
                              } else {
                                field.onChange(current.filter((id) => id !== charger.id))
                              }
                            }}
                          />
                          <Label htmlFor={`${idPrefix}-${charger.id}`} className="font-normal cursor-pointer">
                            {charger.name} - {charger.kabisaId}
                          </Label>
                        </div>
                      ))
                    ) : chargerSearchTerm ? (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No chargers match your search
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No chargers available
                      </div>
                    )}
                  </div>
                  {field.value && field.value.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {field.value.length} charger{field.value.length !== 1 ? 's' : ''} selected
                    </div>
                  )}
                  <FormDescription>
                    Select the chargers where this allowance can be used
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        )}

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isEdit ? (isSubmitting ? 'Updating...' : 'Update Allowance') : (isSubmitting ? 'Adding...' : 'Add Allowance')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

