'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { IndividualVehicleDetailsPage } from '@/components/dashboard/admin/individual/IndividualVehicleDetailsPage'

export default function IndividualVehicleDetailsRoute() {
  const params = useParams()
  const router = useLocalizedRouter()
  const vehicleId = params.vehicleId as string

  const handleBack = () => {
    router.push('/dashboard/admin/individual-vehicles')
  }

  const handleEditVehicle = (vehicle: any) => {
    // Navigate to edit page or open edit modal
    console.log('Edit vehicle:', vehicle)
  }

  const handleDeactivateVehicle = (vehicle: any) => {
    // Handle deactivation
    console.log('Deactivate vehicle:', vehicle)
  }

  return (
    <IndividualVehicleDetailsPage
      vehicleId={vehicleId}
      onBack={handleBack}
      onEditVehicle={handleEditVehicle}
      onDeactivateVehicle={handleDeactivateVehicle}
    />
  )
}
