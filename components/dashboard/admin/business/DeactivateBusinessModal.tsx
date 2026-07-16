'use client'

import React from 'react'
import { 
  AlertTriangle, 
  Building2, 
  X,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { type Business } from '@/lib/api/adminBusiness'

interface DeactivateBusinessModalProps {
  isOpen: boolean
  onClose: () => void
  business: Business | null
  onConfirm: (businessId: string) => void
  isDeactivating: boolean
}

export const DeactivateBusinessModal: React.FC<DeactivateBusinessModalProps> = ({
  isOpen,
  onClose,
  business,
  onConfirm,
  isDeactivating
}) => {
  if (!business) return null

  const handleConfirm = () => {
    onConfirm(business.id)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Deactivate Business</DialogTitle>
              <DialogDescription>
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">{business.name}</p>
                <p className="text-sm text-gray-600">TIN: {business.tin}</p>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p>Deactivating this business will:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Disable all business operations</li>
              <li>Prevent new vehicle registrations</li>
              <li>Suspend payment processing</li>
              <li>Keep historical data intact</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This action is reversible. You can reactivate the business later if needed.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDeactivating}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isDeactivating}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeactivating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deactivating...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Deactivate Business
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
