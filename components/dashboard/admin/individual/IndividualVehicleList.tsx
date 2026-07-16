'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import {
  Car,
  User,
  CreditCard,
  DollarSign,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  AlertTriangle,
  X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LicensePlateBadge } from '@/components/ui/LicensePlateBadge'
import { getAllIndividualVehicles, type IndividualVehicle } from '@/lib/api/adminIndividual'
import { DeactivateIndividualVehicleModal } from './DeactivateIndividualVehicleModal'

interface IndividualVehicleListProps {
  onCreateVehicle: () => void
  onEditVehicle: (vehicle: IndividualVehicle) => void
  onDeactivateVehicle: (vehicle: IndividualVehicle) => void
  isDeactivating: boolean
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

type AllowanceItem = NonNullable<IndividualVehicle['freeChargingAllowances']>[number]
function getAllowanceLabel(a: AllowanceItem): string {
  if (a.freeKwhLimit != null && a.periodType) {
    const period =
      a.periodType === 'DAY'
        ? '/day'
        : a.periodType === 'WEEK'
          ? '/week'
          : a.periodType === 'MONTH'
            ? '/month'
            : a.periodType === 'YEAR'
              ? '/year'
              : a.periodType === 'CUSTOM' && a.customDays
                ? ` /${a.customDays}d`
                : ''
    return `${a.freeKwhLimit} kWh${period}`
  }
  if (a.isUnlimited) return 'Unlimited'
  return `${a.remainingCount ?? 0} sessions`
}

export const IndividualVehicleList: React.FC<IndividualVehicleListProps> = ({
  onCreateVehicle,
  onEditVehicle,
  onDeactivateVehicle,
  isDeactivating,
}) => {
  const router = useLocalizedRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [deactivateModal, setDeactivateModal] = useState<{
    isOpen: boolean
    vehicle: IndividualVehicle | null
  }>({ isOpen: false, vehicle: null })

  const { data: vehiclesData, isLoading, error } = useQuery({
    queryKey: ['individual-vehicles'],
    queryFn: getAllIndividualVehicles,
  })

  const vehicles = vehiclesData?.data?.vehicles || []

  const filteredVehicles = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return vehicles.filter((v) => {
      if (!v || !v.id || !v.kabisaId) return false
      const matchesSearch =
        !q ||
        (v.make?.toLowerCase() || '').includes(q) ||
        (v.model?.toLowerCase() || '').includes(q) ||
        (v.kabisaId?.toLowerCase() || '').includes(q) ||
        (v.licensePlates?.[0]?.licencePlateNumber?.toLowerCase() || '').includes(q) ||
        (v.owner?.firstName?.toLowerCase() || '').includes(q) ||
        (v.owner?.lastName?.toLowerCase() || '').includes(q) ||
        (v.owner?.phone?.toLowerCase() || '').includes(q)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && v.isActive) ||
        (statusFilter === 'inactive' && !v.isActive)
      return matchesSearch && matchesStatus
    })
  }, [vehicles, debouncedSearch, statusFilter])

  const handleViewVehicle = (vehicle: IndividualVehicle) => {
    router.push(`/dashboard/admin/individual-vehicles/${vehicle.id}`)
  }

  const handleDeactivate = (vehicle: IndividualVehicle) => {
    setDeactivateModal({ isOpen: true, vehicle })
  }

  const confirmDeactivate = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    if (vehicle) onDeactivateVehicle(vehicle)
    setDeactivateModal({ isOpen: false, vehicle: null })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-32 w-full rounded-md" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <Car className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load individual vehicles</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeCount = vehicles.filter((v) => v.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Individual Vehicle Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage pre-registered individual vehicles and their owners</p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-blue-600" />
                <span>{vehicles.length} Total</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span>{activeCount} Active</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/admin/vehicles-with-debt')}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Vehicles with Debt
            </Button>
            <Button onClick={onCreateVehicle} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Vehicle
            </Button>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by vehicle, owner, license plate, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 h-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {debouncedSearch && (
          <p className="mt-2 text-xs text-gray-500">
            Showing {filteredVehicles.length} of {vehicles.length} vehicles for "{debouncedSearch}"
          </p>
        )}
      </div>

      {/* Cards */}
      {filteredVehicles.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <Car className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-700">
              {debouncedSearch ? 'No vehicles found' : 'No individual vehicles'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {debouncedSearch
                ? 'Try adjusting your search terms'
                : 'Create individual vehicles to get started'}
            </p>
            {!debouncedSearch && (
              <Button onClick={onCreateVehicle} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Vehicle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVehicles.map((vehicle) => {
            const plate = vehicle.licensePlates?.[0]?.licencePlateNumber as string | undefined
            const allowance = vehicle.freeChargingAllowances?.[0]
            return (
              <Card
                key={vehicle.id}
                role="button"
                tabIndex={0}
                onClick={() => handleViewVehicle(vehicle)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleViewVehicle(vehicle)
                  }
                }}
                className="group cursor-pointer overflow-hidden border-gray-200 transition-all hover:border-blue-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                {/* Image strip with floating plate */}
                {vehicle.imageUrl ? (
                  <div className="relative h-32 w-full bg-gray-100">
                    <img
                      src={vehicle.imageUrl}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="h-full w-full object-cover"
                    />
                    {plate && (
                      <div className="absolute top-2 right-2">
                        <LicensePlateBadge plate={plate} size="sm" />
                      </div>
                    )}
                  </div>
                ) : null}

                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    {!vehicle.imageUrl && (
                      <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Car className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {vehicle.kabisaId}</p>
                    </div>
                    <div
                      role="presentation"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewVehicle(vehicle)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditVehicle(vehicle)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Vehicle
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeactivate(vehicle)}
                            disabled={isDeactivating}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isDeactivating ? 'Deactivating…' : 'Deactivate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {!vehicle.imageUrl && plate && (
                    <div className="flex justify-center pt-1">
                      <LicensePlateBadge plate={plate} size="md" />
                    </div>
                  )}

                  {vehicle.owner && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 truncate">
                        <User className="h-3.5 w-3.5 text-gray-500" />
                        <span className="truncate">
                          {vehicle.owner.firstName} {vehicle.owner.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                        {vehicle.owner.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {vehicle.owner.phone}
                          </span>
                        )}
                        {vehicle.owner.email && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{vehicle.owner.email}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <CreditCard className="h-3.5 w-3.5" />
                        Payments
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {vehicle.paymentMethods?.length ?? 0}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <DollarSign className="h-3.5 w-3.5" />
                        Free Charging
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900 truncate">
                        {allowance ? getAllowanceLabel(allowance) : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Badge
                      className={
                        vehicle.isActive
                          ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 text-xs'
                          : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 text-xs'
                      }
                    >
                      {vehicle.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {(vehicle.debtBalance ?? 0) > 0 && (
                      <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">
                        Debt
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Deactivate Modal */}
      {deactivateModal.vehicle && (
        <DeactivateIndividualVehicleModal
          isOpen={deactivateModal.isOpen}
          onClose={() => setDeactivateModal({ isOpen: false, vehicle: null })}
          vehicle={deactivateModal.vehicle}
          onConfirm={confirmDeactivate}
        />
      )}
    </div>
  )
}
