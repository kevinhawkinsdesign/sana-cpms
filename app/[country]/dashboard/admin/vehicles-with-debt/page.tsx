'use client'

import React from 'react'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { VehiclesWithDebtList } from '@/components/dashboard/admin/individual/VehiclesWithDebtList'

export default function VehiclesWithDebtPage() {
  const router = useLocalizedRouter()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VehiclesWithDebtList
          onBack={() => router.push('/dashboard/admin/individual-vehicles')}
          onViewVehicle={(vehicleId) => router.push(`/dashboard/admin/individual-vehicles/${vehicleId}`)}
        />
      </div>
    </div>
  )
}
