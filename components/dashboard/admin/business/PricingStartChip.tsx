'use client'

import React, { useState } from 'react'
import { TrendingDown, TrendingUp, Settings2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import type { PricingTier } from '@/lib/api/adminBusiness'

interface PricingStartChipProps {
  tiers?: PricingTier[]
  className?: string
  currency?: string
  /** When true, render a larger version suited for header areas. */
  size?: 'sm' | 'md'
  /** When provided, a "Manage Pricing" CTA appears in the popover. */
  onManage?: () => void
  manageLabel?: string
}

/**
 * Shows the starting (minKwh=0) tariff with a directional hint when there are
 * multiple tiers — e.g. "Invoice: 480 RWF/kWh ↓". Click opens a popover with
 * the full tier breakdown and an optional Manage CTA.
 */
export const PricingStartChip: React.FC<PricingStartChipProps> = ({
  tiers,
  className = '',
  currency = 'RWF',
  size = 'sm',
  onManage,
  manageLabel = 'Manage Pricing',
}) => {
  const [open, setOpen] = useState(false)

  if (!tiers || tiers.length === 0) return null

  const sorted = [...tiers].sort((a, b) => a.minKwh - b.minKwh)
  const startTier = sorted[0]
  if (!startTier) return null

  const startRate = startTier.ratePerKwh
  const lastRate = sorted[sorted.length - 1].ratePerKwh
  const goesDown = sorted.length > 1 && lastRate < startRate
  const goesUp = sorted.length > 1 && lastRate > startRate

  const formatRate = (n: number) =>
    Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2)

  const formatRange = (tier: PricingTier) => {
    if (typeof tier.maxKwh === 'number') return `${tier.minKwh}–${tier.maxKwh} kWh`
    return `${tier.minKwh}+ kWh`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
          }}
          className={`inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 ${
            size === 'md' ? 'py-1.5 text-sm' : 'py-1 text-xs'
          } text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${className}`}
          aria-label="Show pricing tiers"
        >
          <span className="font-medium">Invoice:</span>
          <span className="font-semibold">
            {formatRate(startRate)} {currency}/kWh
          </span>
          {goesDown && <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
          {goesUp && <TrendingUp className="h-3.5 w-3.5 text-amber-700" aria-hidden />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">Pricing tiers</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Rate per kWh changes with consumption
          </p>
        </div>
        <div className="px-2 py-2 max-h-64 overflow-y-auto">
          {sorted.map((tier, i) => {
            const isStart = i === 0
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-gray-50"
              >
                <span className="text-gray-600">{formatRange(tier)}</span>
                <span className={`font-semibold ${isStart ? 'text-emerald-700' : 'text-gray-900'}`}>
                  {formatRate(tier.ratePerKwh)} {currency}
                </span>
              </div>
            )
          })}
        </div>
        {onManage && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false)
                onManage()
              }}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {manageLabel}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
