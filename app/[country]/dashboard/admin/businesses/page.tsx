'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { useEffect } from 'react'
import { 
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { BusinessList } from '@/components/dashboard/admin/business/BusinessList'
import { CreateBusinessForm } from '@/components/dashboard/admin/business/CreateBusinessForm'
import { EditBusinessModal } from '@/components/dashboard/admin/business/EditBusinessModal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deactivateBusiness, type Business } from '@/lib/api/adminBusiness'

const AdminBusinessesPage = () => {
  const { user, isLoading } = useAuth()
  const router = useLocalizedRouter()
  const queryClient = useQueryClient()

  // State management
  const [view, setView] = useState<'list' | 'create'>('list')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [businessToEdit, setBusinessToEdit] = useState<Business | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && user && user.role !== UserRole.ADMIN) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  // Deactivate business mutation
  const deactivateBusinessMutation = useMutation({
    mutationFn: ({ businessId }: { businessId: string }) => deactivateBusiness(businessId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast.success('Business deactivated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate business')
    }
  })

  // Event handlers
  const handleCreateBusiness = () => {
    setView('create')
  }

  const handleViewBusiness = (business: Business) => {
    router.push(`/dashboard/admin/businesses/${business.id}`)
  }

  const handleEditBusiness = (business: Business) => {
    setBusinessToEdit(business)
    setIsEditModalOpen(true)
  }

  const handleDeactivateBusiness = (business: Business) => {
    deactivateBusinessMutation.mutate({ businessId: business.id })
  }

  const isDeactivating = deactivateBusinessMutation.isPending

  const handleBackToList = () => {
    setView('list')
  }

  const handleCreateSuccess = () => {
    setView('list')
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setBusinessToEdit(null)
  }

  const handleEditSuccess = (updatedBusiness: Business) => {
    // Invalidate and refetch the businesses list
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
          <Button 
            onClick={() => router.push('/dashboard')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {view === 'list' && (
          <BusinessList
            onCreateBusiness={handleCreateBusiness}
            onViewBusiness={handleViewBusiness}
            onEditBusiness={handleEditBusiness}
            onDeactivateBusiness={handleDeactivateBusiness}
            isDeactivating={isDeactivating}
          />
        )}

        {view === 'create' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Create New Business</h1>
            </div>
            <CreateBusinessForm
              isOpen={true}
              onClose={handleBackToList}
              onSuccess={handleCreateSuccess}
            />
          </div>
        )}

        {/* Edit Business Modal */}
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

export default AdminBusinessesPage
