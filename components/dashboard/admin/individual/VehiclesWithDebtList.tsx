'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Car, DollarSign, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getVehiclesWithDebt } from '@/lib/api/adminIndividual'

interface VehiclesWithDebtListProps {
  onBack: () => void
  onViewVehicle: (vehicleId: string) => void
}

export function VehiclesWithDebtList({ onBack, onViewVehicle }: VehiclesWithDebtListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicles-with-debt'],
    queryFn: getVehiclesWithDebt,
  })

  const vehicles = data?.data?.vehicles ?? []
  const totalDebt = data?.data?.totalDebt ?? 0
  const count = data?.data?.count ?? 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-700 mb-2">Failed to load data</h4>
          <p className="text-sm text-gray-500">{(error as any)?.message || 'An error occurred'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Vehicles with Debt</h2>
            <p className="text-sm text-gray-500">All vehicles with outstanding balances</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-red-600 mb-1">Total Outstanding Debt</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(totalDebt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Vehicles with Debt</p>
            <p className="text-2xl font-bold text-gray-900">{count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Average Debt</p>
            <p className="text-2xl font-bold text-gray-900">
              {count > 0 ? formatCurrency(totalDebt / count) : formatCurrency(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle List */}
      {vehicles.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50">
                  <TableRow>
                    <TableHead className="text-xs">Vehicle</TableHead>
                    <TableHead className="text-xs">License Plate</TableHead>
                    <TableHead className="text-xs">Debt Balance</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Note</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onViewVehicle(vehicle.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Car className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{vehicle.make} {vehicle.model}</p>
                            <p className="text-xs text-gray-500">{vehicle.kabisaId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {vehicle.licensePlates?.[0] || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(vehicle.debtBalance)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-gray-500 max-w-[200px] truncate block">
                          {vehicle.debtNote || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewVehicle(vehicle.id)
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="h-12 w-12 text-green-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-green-600 mb-2">No Outstanding Debt</h4>
            <p className="text-sm text-gray-400">
              All vehicles are debt-free.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
