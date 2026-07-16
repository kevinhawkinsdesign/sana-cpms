'use client'

import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import {
  Building2,
  Car,
  CreditCard,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  X,
  TrendingDown,
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
import { getAllBusinesses, type Business } from '@/lib/api/adminBusiness'
import { DeactivateBusinessModal } from './DeactivateBusinessModal'
import { PricingStartChip } from './PricingStartChip'

interface BusinessListProps {
  onCreateBusiness: () => void
  onViewBusiness: (business: Business) => void
  onEditBusiness: (business: Business) => void
  onDeactivateBusiness: (business: Business) => void
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

export const BusinessList: React.FC<BusinessListProps> = ({
  onCreateBusiness,
  onViewBusiness,
  onEditBusiness,
  onDeactivateBusiness,
  isDeactivating,
}) => {
  const router = useLocalizedRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [deactivateModal, setDeactivateModal] = useState<{
    isOpen: boolean
    business: Business | null
  }>({ isOpen: false, business: null })

  const { data: businessesData, isLoading, error } = useQuery({
    queryKey: ['businesses'],
    queryFn: getAllBusinesses,
  })

  const businesses = businessesData?.data?.businesses || []

  const filteredBusinesses = businesses.filter((business) => {
    const q = debouncedSearch.trim().toLowerCase()
    const matchesSearch =
      q === '' ||
      (business.name?.toLowerCase() || '').includes(q) ||
      (business.tin?.toLowerCase() || '').includes(q)

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && business.isActive) ||
      (statusFilter === 'inactive' && !business.isActive)

    return matchesSearch && matchesStatus
  })

  const handleDeactivate = (business: Business) => {
    setDeactivateModal({ isOpen: true, business })
  }

  const confirmDeactivate = (businessId: string) => {
    onDeactivateBusiness({ id: businessId } as Business)
    setDeactivateModal({ isOpen: false, business: null })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
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
            <Building2 className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load businesses</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalVehicles = businesses.reduce((sum, b) => sum + (b._count?.vehicleOwnerships || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Business Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage pre-registered businesses and their configurations
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>{businesses.length} Total Businesses</span>
              </div>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-blue-600" />
                <span>{totalVehicles} Total Vehicles</span>
              </div>
            </div>
          </div>
          <Button onClick={onCreateBusiness} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Business
          </Button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or TIN..."
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10 px-3 border-gray-300"
              >
                <Filter className="h-4 w-4" />
                {statusFilter === 'all' ? 'All Status' : statusFilter === 'active' ? 'Active' : 'Inactive'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('active')}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>Inactive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {debouncedSearch && (
          <p className="mt-2 text-xs text-gray-500">
            Showing {filteredBusinesses.length} of {businesses.length} businesses for "{debouncedSearch}"
          </p>
        )}
      </div>

      {/* Cards grid */}
      {filteredBusinesses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 shadow-sm">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Building2 className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No businesses found</h3>
            {debouncedSearch ? (
              <p className="text-gray-500 mb-3">Try adjusting your search terms</p>
            ) : (
              <p className="text-gray-500 mb-3">Create your first business to get started</p>
            )}
            <Button onClick={onCreateBusiness} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Business
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBusinesses.map((business) => (
            <Card
              key={business.id}
              role="button"
              tabIndex={0}
              onClick={() => onViewBusiness(business)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onViewBusiness(business)
                }
              }}
              className="group cursor-pointer border-gray-200 transition-all hover:border-blue-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:bg-blue-100 transition-colors">
                      {business.imageUrl ? (
                        <img
                          src={business.imageUrl}
                          alt={business.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {business.name}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">TIN: {business.tin}</p>
                    </div>
                  </div>
                  <div
                    role="presentation"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewBusiness(business)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditBusiness(business)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Business
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeactivate(business)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Car className="h-3.5 w-3.5" />
                      Vehicles
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {business._count?.vehicleOwnerships ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <CreditCard className="h-3.5 w-3.5" />
                      Payments
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {business._count?.paymentMethods ?? 0}
                    </div>
                  </div>
                </div>

                <PricingStartChip
                  tiers={business.defaultPricingTiers}
                  onManage={() =>
                    router.push(`/dashboard/admin/businesses/${business.id}?openContract=1`)
                  }
                />

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(business.createdAt).toLocaleDateString()}
                  </div>
                  <Badge
                    className={
                      business.isActive
                        ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 text-xs'
                        : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 text-xs'
                    }
                  >
                    {business.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeactivateBusinessModal
        isOpen={deactivateModal.isOpen}
        onClose={() => setDeactivateModal({ isOpen: false, business: null })}
        business={deactivateModal.business}
        onConfirm={confirmDeactivate}
        isDeactivating={isDeactivating}
      />
    </div>
  )
}
