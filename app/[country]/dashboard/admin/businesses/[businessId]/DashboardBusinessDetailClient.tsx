'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BusinessDetails } from '@/components/dashboard/admin/business/BusinessDetails'
import { AddVehicleForm } from '@/components/dashboard/admin/business/AddVehicleForm'
import { EditBusinessModal } from '@/components/dashboard/admin/business/EditBusinessModal'
import type { Business } from '@/lib/api/adminBusiness'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const AdminBusinessDetailsPage = () => {
  const { user, isLoading } = useAuth()
  const router = useLocalizedRouter()
  const params = useParams<{ businessId: string }>()
  const queryClient = useQueryClient()

  const businessId = params?.businessId

  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [selectedBusinessForVehicle, setSelectedBusinessForVehicle] = useState<{ id: string; name: string } | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [businessToEdit, setBusinessToEdit] = useState<Business | null>(null)

  useEffect(() => {
    if (!isLoading && user && user.role !== UserRole.ADMIN) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  const handleBackToList = () => {
    router.push('/dashboard/admin/businesses')
  }

  const handleEditBusiness = (business: Business) => {
    setBusinessToEdit(business)
    setIsEditModalOpen(true)
  }

  const handleAddVehicle = (targetBusinessId: string, businessName: string) => {
    setSelectedBusinessForVehicle({ id: targetBusinessId, name: businessName })
    setIsAddVehicleOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setBusinessToEdit(null)
  }

  const handleEditSuccess = () => {
    if (!businessId) return
    queryClient.invalidateQueries({ queryKey: ['business', businessId] })
    queryClient.invalidateQueries({ queryKey: ['businesses'] })
    setIsEditModalOpen(false)
    setBusinessToEdit(null)
    toast.success('Business updated successfully')
  }

  if (isLoading) {
    return null
  }

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!businessId || typeof businessId !== 'string') {
    return null
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <BusinessDetails
          businessId={businessId}
          onBack={handleBackToList}
          onEditBusiness={handleEditBusiness}
          onAddVehicle={handleAddVehicle}
        />

        {selectedBusinessForVehicle && (
          <AddVehicleForm
            isOpen={isAddVehicleOpen}
            onClose={() => {
              setIsAddVehicleOpen(false)
              setSelectedBusinessForVehicle(null)
            }}
            businessId={selectedBusinessForVehicle.id}
            businessName={selectedBusinessForVehicle.name}
            onSuccess={() => {
              setIsAddVehicleOpen(false)
              setSelectedBusinessForVehicle(null)
              queryClient.invalidateQueries({ queryKey: ['business', businessId] })
              queryClient.invalidateQueries({ queryKey: ['businesses'] })
            }}
          />
        )}

        {businessToEdit && (
          <EditBusinessModal
            isOpen={isEditModalOpen}
            onClose={handleCloseEditModal}
            business={businessToEdit}
            onSuccess={handleEditSuccess}
          />
        )}
      </div>
    </div>
  )
}

export default AdminBusinessDetailsPage
