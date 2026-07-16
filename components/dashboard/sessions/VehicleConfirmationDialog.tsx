'use client'

import { Car, Check, X } from 'lucide-react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import CfImage from "@/components/ui/CfImage"
import { formatCurrency } from "@/lib/utils"
import { VehicleInfo, ChargingInfo } from "@/types/session"

interface VehicleConfirmationDialogProps {
  open: boolean
  onClose: () => void
  vehicleInfo: VehicleInfo | null
  chargingInfo: ChargingInfo | null
  needsRegistration: boolean
  onConfirm: () => void
}

function getFreeAllowancePeriodLabel(
  fa: ChargingInfo['freeAllowance']
): string {
  if (!fa?.periodType) return ''
  const { periodType, customDays } = fa
  if (periodType === 'DAY') return 'day'
  if (periodType === 'WEEK') return 'week'
  if (periodType === 'MONTH') return 'month'
  if (periodType === 'YEAR') return 'year'
  if (periodType === 'CUSTOM' && customDays != null) {
    return `${customDays} days`
  }
  return ''
}

export function VehicleConfirmationDialog({
  open,
  onClose,
  vehicleInfo,
  chargingInfo,
  needsRegistration,
  onConfirm,
}: VehicleConfirmationDialogProps) {
  if (!vehicleInfo || !chargingInfo) return null

  const isFreeAllowance =
    chargingInfo.paymentMethodEnum === 'FREE_ALLOWANCE' ||
    chargingInfo.paymentMethodName === 'Free Allowance'

  const paymentMethodLabel =
    chargingInfo.paymentMethodName ||
    (chargingInfo.paymentMethodEnum === 'FREE_ALLOWANCE' ? 'Free Allowance' : null) ||
    (chargingInfo.paymentMethodEnum === 'CONTRACT' ? 'Contract' : null) ||
    (chargingInfo.paymentMethodEnum === 'MOMO' ? 'MTN MOMO' : null) ||
    (chargingInfo.paymentMethodEnum === 'CARD' ? 'Card' : null) ||
    chargingInfo.paymentMethodEnum ||
    'Standard'

  const paymentMethodDescription =
    paymentMethodLabel === 'Standard' ? 'the selected payment method' : paymentMethodLabel

  const isFreeAllowanceExhausted =
    !!chargingInfo.freeAllowance &&
    typeof chargingInfo.freeAllowance.remainingFreeKwhThisPeriod === 'number' &&
    chargingInfo.freeAllowance.remainingFreeKwhThisPeriod === 0 &&
    chargingInfo.paymentMethodEnum !== 'FREE_ALLOWANCE'

  let chargingRateLabel = 'Standard'
  if (isFreeAllowance) {
    chargingRateLabel = 'FREE'
  } else if (chargingInfo.standardPrice) {
    chargingRateLabel = `${formatCurrency(chargingInfo.standardPrice)} RWF/kWh`
  }

  const formatFreeAllowanceDetails = () => {
    const fa = chargingInfo.freeAllowance
    if (!fa) {
      return 'Unlimited free charging'
    }

    const hasLimit = fa.freeKwhLimit != null && fa.periodType
    if (!hasLimit) {
      return 'Unlimited free charging'
    }

    const period = getFreeAllowancePeriodLabel(fa)

    const base = `Free up to ${fa.freeKwhLimit} kWh/${period}`

    if (typeof fa.remainingFreeKwhThisPeriod === 'number') {
      return `${base} (${fa.remainingFreeKwhThisPeriod} kWh left this period)`
    }

    return base
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Confirm Vehicle Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicle Image */}
          <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
            {(() => {
              if (!vehicleInfo.imageUrl) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <Car className="h-16 w-16 mb-2" />
                    <span className="text-sm">No image available</span>
                    <span className="text-xs text-gray-400">{vehicleInfo.make} {vehicleInfo.model}</span>
                  </div>
                );
              }
              
              // Try different approaches to display the image
              const isCloudflareUrl = vehicleInfo.imageUrl.includes('imagedelivery.net');
              const isHttpUrl = vehicleInfo.imageUrl.startsWith('http');
              
              if (isCloudflareUrl) {
                // Use CfImage for Cloudflare URLs
                return (
                  <CfImage
                    srcIdOrUrl={vehicleInfo.imageUrl}
                    variant="hero"
                    alt={`${vehicleInfo.make} ${vehicleInfo.model}`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const container = target.closest('.relative');
                      if (container) {
                        container.innerHTML = `
                          <div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            <svg class="h-16 w-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                            </svg>
                            <span class="text-sm">Image failed to load</span>
                            <span class="text-xs text-gray-400">${vehicleInfo.make} ${vehicleInfo.model}</span>
                          </div>
                        `;
                      }
                    }}
                  />
                );
              } else if (isHttpUrl) {
                // Use regular Next.js Image for other HTTP URLs
                return (
                  <Image
                    src={vehicleInfo.imageUrl}
                    alt={`${vehicleInfo.make} ${vehicleInfo.model}`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const container = target.closest('.relative');
                      if (container) {
                        container.innerHTML = `
                          <div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            <svg class="h-16 w-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                            </svg>
                            <span class="text-sm">Image failed to load</span>
                            <span class="text-xs text-gray-400">${vehicleInfo.make} ${vehicleInfo.model}</span>
                          </div>
                        `;
                      }
                    }}
                  />
                );
              } else {
                // Try to treat as Cloudflare image ID
                return (
                  <CfImage
                    srcIdOrUrl={vehicleInfo.imageUrl}
                    variant="hero"
                    alt={`${vehicleInfo.make} ${vehicleInfo.model}`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const container = target.closest('.relative');
                      if (container) {
                        container.innerHTML = `
                          <div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            <svg class="h-16 w-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                            </svg>
                            <span class="text-sm">Image failed to load</span>
                            <span class="text-xs text-gray-400">${vehicleInfo.make} ${vehicleInfo.model}</span>
                          </div>
                        `;
                      }
                    }}
                  />
                );
              }
            })()}
          </div>

          {/* Vehicle & Charging Details */}
          <div className="grid gap-2 text-sm">
            <div className="grid grid-cols-2 gap-1 py-1">
              <span className="text-muted-foreground">Make & Model:</span>
              <span className="font-medium">
                {vehicleInfo.make} {vehicleInfo.model}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 py-1">
              <span className="text-muted-foreground">License Plate:</span>
              <span className="font-medium">{vehicleInfo.licenseNumber}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 py-1">
              <span className="text-muted-foreground">Charging Rate:</span>
              <span className="font-medium">
                {chargingRateLabel}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 py-1">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-medium">
                {paymentMethodLabel}
              </span>
            </div>
            {isFreeAllowance && (
              <div className="grid grid-cols-2 gap-1 py-1">
                <span className="text-muted-foreground">Free Charging:</span>
                <span className="font-medium">
                  {formatFreeAllowanceDetails()}
                </span>
              </div>
            )}
            {vehicleInfo.freeChargingExpiration && (
              <div className="grid grid-cols-2 gap-1 py-1">
                <span className="text-muted-foreground">Free Charging Until:</span>
                <span className="font-medium">
                  {new Date(vehicleInfo.freeChargingExpiration).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {isFreeAllowanceExhausted && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-500/10 p-4 text-sm text-yellow-800 dark:text-yellow-300">
              <div className="font-semibold">
                Free charging allowance for this period is exhausted.
              </div>
              <div>
                {formatFreeAllowanceDetails()}.
              </div>
              <div className="mt-1">
                This session will be charged via {paymentMethodDescription}.
              </div>
            </div>
          )}

          {needsRegistration && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-500/10 p-4 text-sm text-yellow-800 dark:text-yellow-300">
              Note: This vehicle requires full registration. You will be redirected to complete
              the registration process.
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <Check className="mr-2 h-4 w-4" />
            Confirm and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}