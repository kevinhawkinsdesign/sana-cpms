'use client'

import React from 'react'
import {
  Tag,
  Infinity,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  Plus,
  PowerOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatShortDate } from './vehicleAdminUtils'

function AllowanceTypeBadge({ allowance }: { readonly allowance: AllowanceRow }) {
  if (allowance.freeKwhLimit && allowance.periodType) {
    return (
      <>
        <Tag className="h-5 w-5 text-indigo-600" />
        <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1">
          kWh cap
        </Badge>
      </>
    )
  }
  if (allowance.isUnlimited) {
    return (
      <>
        <Infinity className="h-5 w-5 text-blue-600" />
        <Badge variant="default" className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
          Unlimited
        </Badge>
      </>
    )
  }
  return (
    <>
      <Tag className="h-5 w-5 text-green-600" />
      <Badge variant="secondary" className="bg-green-100 text-green-800 text-sm px-3 py-1">
        Session-based
      </Badge>
    </>
  )
}

function AllowanceRemainingCell({ allowance }: { readonly allowance: AllowanceRow }) {
  if (allowance.freeKwhLimit && allowance.periodType) {
    return (
      <div className="space-y-1">
        <div className="text-sm">
          {allowance.periodType === 'DAY' && (
            <>Up to <span className="font-semibold">{allowance.freeKwhLimit}</span> kWh per day</>
          )}
          {allowance.periodType === 'WEEK' && (
            <>Up to <span className="font-semibold">{allowance.freeKwhLimit}</span> kWh per week</>
          )}
          {allowance.periodType === 'MONTH' && (
            <>Up to <span className="font-semibold">{allowance.freeKwhLimit}</span> kWh per month</>
          )}
          {allowance.periodType === 'YEAR' && (
            <>Up to <span className="font-semibold">{allowance.freeKwhLimit}</span> kWh per year</>
          )}
          {allowance.periodType === 'CUSTOM' && (
            <>Up to <span className="font-semibold">{allowance.freeKwhLimit}</span> kWh every {allowance.customDays} days</>
          )}
        </div>
        {typeof allowance.remainingFreeKwhThisPeriod === 'number' && (
          <div className="text-xs text-gray-600">
            Remaining this period:{' '}
            <span className="font-semibold">{allowance.remainingFreeKwhThisPeriod} kWh</span>
          </div>
        )}
      </div>
    )
  }
  if (allowance.isUnlimited) {
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
        Unlimited
      </Badge>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">{allowance.remainingCount || 0}</span>
      <span className="text-sm text-gray-500">sessions</span>
    </div>
  )
}

export interface AllowanceRow {
  id: string
  isUnlimited: boolean
  isActive?: boolean
  remainingCount: number | null
  validFrom: string
  validUntil: string | null
  chargerAllowances?: { chargerId: string; isActive: boolean }[]
  allowedChargerIds?: string[] | null
  freeKwhLimit?: number | null
  periodType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM' | null
  customDays?: number | null
  remainingFreeKwhThisPeriod?: number | null
}

interface FreeChargingAllowancesTabContentProps {
  readonly allowances: AllowanceRow[]
  readonly onAddClick: () => void
  readonly onEditClick: (allowance: AllowanceRow) => void
  readonly onDeleteClick: (allowance: AllowanceRow) => void
  readonly onDeactivateClick: (allowance: AllowanceRow) => void
  readonly isDeletePending: boolean
  readonly isDeactivatePending: boolean
}

export function FreeChargingAllowancesTabContent({
  allowances,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onDeactivateClick,
  isDeletePending,
  isDeactivatePending,
}: FreeChargingAllowancesTabContentProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Free Charging Allowances</h3>
        <Button onClick={onAddClick} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Allowance
        </Button>
      </div>

      {allowances.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-4 text-sm font-semibold">Type</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Status</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Valid From</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Valid Until</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Remaining</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Chargers</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowances.map((allowance) => (
                <TableRow key={allowance.id} className="hover:bg-gray-50">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <AllowanceTypeBadge allowance={allowance} />
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      {allowance.isActive === false ? (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <Badge variant="outline" className="text-red-500 border-red-200 text-sm px-3 py-1">
                            Inactive
                          </Badge>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <Badge variant="outline" className="text-green-600 border-green-200 text-sm px-3 py-1">
                            Active
                          </Badge>
                        </>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium">{formatShortDate(allowance.validFrom)}</span>
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    {allowance.validUntil ? (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <span className="text-sm font-medium">{formatShortDate(allowance.validUntil)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 font-medium">No expiry</span>
                    )}
                  </TableCell>

                  <TableCell className="py-4">
                    <AllowanceRemainingCell allowance={allowance} />
                  </TableCell>

                  <TableCell className="py-4">
                    {!allowance.chargerAllowances || allowance.chargerAllowances.length === 0 ? (
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        All Chargers
                      </Badge>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="text-sm px-3 py-1 w-fit">
                          {allowance.chargerAllowances.length} Specific Charger{allowance.chargerAllowances.length > 1 ? 's' : ''}
                        </Badge>
                        {allowance.allowedChargerIds && allowance.allowedChargerIds.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {allowance.allowedChargerIds.slice(0, 2).join(', ')}
                            {allowance.allowedChargerIds.length > 2 && ` +${allowance.allowedChargerIds.length - 2} more`}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditClick(allowance)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {allowance.isActive !== false && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeactivateClick(allowance)}
                          disabled={isDeactivatePending}
                          title="Deactivate allowance"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                        >
                          <PowerOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteClick(allowance)}
                        disabled={isDeletePending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <DollarSign className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-600">No free charging allowances</p>
            <p className="text-sm text-gray-500 mt-1">Add a free charging allowance to get started</p>
          </CardContent>
        </Card>
      )}
    </>
  )
}
