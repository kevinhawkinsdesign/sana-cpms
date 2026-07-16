'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { IndividualVehicleList } from '@/components/dashboard/admin/individual/IndividualVehicleList'
import { CreateIndividualVehicleForm } from '@/components/dashboard/admin/individual/CreateIndividualVehicleForm'
import { EditIndividualVehicleModal } from '@/components/dashboard/admin/individual/EditIndividualVehicleModal'
import { deactivateIndividualVehicle, type IndividualVehicle } from '@/lib/api/adminIndividual'

export default function IndividualVehiclesPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<IndividualVehicle | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const queryClient = useQueryClient()

  // Deactivate vehicle mutation
  const deactivateVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) => deactivateIndividualVehicle(vehicleId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicles'] })
      // Use backend success message
      toast.success(response.message || 'Vehicle deactivated successfully')
      setIsDeactivating(false)
    },
    onError: (error: any) => {
      // Use backend error message only
      toast.error(error.message || 'Failed to deactivate vehicle')
      setIsDeactivating(false)
    }
  })

  const handleCreateVehicle = () => {
    setIsCreateOpen(true)
  }


  const handleEditVehicle = (vehicle: IndividualVehicle) => {
    setSelectedVehicle(vehicle)
    setIsEditOpen(true)
  }

  const handleDeactivateVehicle = (vehicle: IndividualVehicle) => {
    setIsDeactivating(true)
    deactivateVehicleMutation.mutate(vehicle.id)
  }

  const handleCreateSuccess = () => {
    setIsCreateOpen(false)
    queryClient.invalidateQueries({ queryKey: ['individual-vehicles'] })
  }

  const handleEditSuccess = () => {
    setIsEditOpen(false)
    setSelectedVehicle(null)
    queryClient.invalidateQueries({ queryKey: ['individual-vehicles'] })
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <IndividualVehicleList
          onCreateVehicle={handleCreateVehicle}
          onEditVehicle={handleEditVehicle}
          onDeactivateVehicle={handleDeactivateVehicle}
          isDeactivating={isDeactivating}
        />
      </div>

      {/* Create Vehicle Modal */}
      <CreateIndividualVehicleForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />


      {/* Edit Vehicle Modal */}
      {selectedVehicle && (
        <EditIndividualVehicleModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false)
            setSelectedVehicle(null)
          }}
          vehicle={selectedVehicle}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}
