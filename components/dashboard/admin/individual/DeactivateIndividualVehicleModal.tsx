'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type IndividualVehicle } from '@/lib/api/adminIndividual'

interface DeactivateIndividualVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: IndividualVehicle
  onConfirm: (vehicleId: string) => void
}

export function DeactivateIndividualVehicleModal({ 
  isOpen, 
  onClose, 
  vehicle, 
  onConfirm 
}: DeactivateIndividualVehicleModalProps) {
  const handleConfirm = () => {
    onConfirm(vehicle.id)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Deactivate Individual Vehicle
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to deactivate this individual vehicle? This action will:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Vehicle Details</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Vehicle:</span> {vehicle.make} {vehicle.model}</p>
              <p><span className="font-medium">Kabisa ID:</span> {vehicle.kabisaId}</p>
              <p><span className="font-medium">Owner:</span> {vehicle.owner ? `${vehicle.owner.firstName} ${vehicle.owner.lastName}` : 'No owner info'}</p>
              <p><span className="font-medium">Phone:</span> {vehicle.owner?.phone || 'No phone info'}</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">Consequences</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Vehicle will be marked as inactive</li>
              <li>• Owner will lose access to charging services</li>
              <li>• All payment methods will be deactivated</li>
              <li>• Free charging allowances will be removed</li>
              <li>• This action can be reversed by reactivating the vehicle</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Deactivate Vehicle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
