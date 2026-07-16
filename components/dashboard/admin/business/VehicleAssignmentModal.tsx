'use client'

import React from 'react'
import {
  Car,
  Building2,
  User,
  Info,
  AlertCircle,
  CheckCircle,
  Calendar,
  Battery,
  Hash,
  Image as ImageIcon
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface VehicleData {
  id: string
  kabisaId: string
  make: string
  model: string
  vin?: string
  batteryCapacity?: number
  imageUrl?: string
  createdAt: string
}

interface CurrentOwnership {
  type: 'business' | 'individual' | 'unassigned'
  ownerName?: string
  ownerId?: string
  assignedAt?: string
}

interface VehicleAssignmentModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  vehicleData: {
    vehicle: VehicleData
    currentOwnership: CurrentOwnership
    canAssign: boolean
    reason?: string
  }
  loading?: boolean
  businessName?: string
}

export const VehicleAssignmentModal: React.FC<VehicleAssignmentModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  vehicleData,
  loading = false,
  businessName = 'your business'
}) => {
  const { vehicle, currentOwnership, canAssign, reason } = vehicleData

  const getOwnershipIcon = () => {
    switch (currentOwnership.type) {
      case 'business':
        return <Building2 className="h-4 w-4 text-blue-500" />
      case 'individual':
        return <User className="h-4 w-4 text-green-500" />
      case 'unassigned':
        return <Info className="h-4 w-4 text-gray-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-orange-500" />
    }
  }

  const getOwnershipStatus = () => {
    switch (currentOwnership.type) {
      case 'business':
        return {
          text: `Owned by Business: ${currentOwnership.ownerName}`,
          color: 'bg-blue-100 text-blue-800',
          description: 'This vehicle is currently owned by another business in the system.'
        }
      case 'individual':
        return {
          text: `Owned by Individual: ${currentOwnership.ownerName}`,
          color: 'bg-green-100 text-green-800',
          description: 'This vehicle is currently owned by an individual user.'
        }
      case 'unassigned':
        return {
          text: 'Unassigned Vehicle',
          color: 'bg-gray-100 text-gray-800',
          description: 'This vehicle exists in the system but is not assigned to any business or user.'
        }
      default:
        return {
          text: 'Unknown Status',
          color: 'bg-orange-100 text-orange-800',
          description: 'Unable to determine current ownership status.'
        }
    }
  }

  const ownershipStatus = getOwnershipStatus()

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-500" />
            Vehicle Assignment Confirmation
          </DialogTitle>
          <DialogDescription>
            A vehicle with this license plate already exists in the system. Review the details below before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert Message */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Vehicle Already Exists</strong> - A vehicle with this license plate already exists in the system. 
              Review the details below before proceeding with the assignment.
            </AlertDescription>
          </Alert>

          {/* Vehicle Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Make & Model</label>
                  <p className="text-lg font-semibold">{vehicle.make} {vehicle.model}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Kabisa ID</label>
                  <p className="font-mono text-sm flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {vehicle.kabisaId}
                  </p>
                </div>
                
                {vehicle.vin && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">VIN</label>
                    <p className="font-mono text-sm">{vehicle.vin}</p>
                  </div>
                )}
                
                {vehicle.batteryCapacity && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Battery Capacity</label>
                    <p className="text-sm flex items-center gap-1">
                      <Battery className="h-3 w-3" />
                      {vehicle.batteryCapacity} kWh
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Added to System</label>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(vehicle.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {vehicle.imageUrl && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Vehicle Image</label>
                  <div className="mt-2">
                    <img 
                      src={vehicle.imageUrl} 
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-32 h-20 object-cover rounded border"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Ownership Status */}
          <Card className="border-l-4 border-l-blue-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getOwnershipIcon()}
                Current Ownership Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={ownershipStatus.color}>
                  {ownershipStatus.text}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600">{ownershipStatus.description}</p>
              
              {currentOwnership.assignedAt && (
                <p className="text-xs text-gray-500">
                  Assigned on: {new Date(currentOwnership.assignedAt).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Assignment Information */}
          <Card className={`border-l-4 ${canAssign ? 'border-l-green-400' : 'border-l-red-400'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${canAssign ? 'text-green-500' : 'text-red-500'}`} />
                What Will Happen Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canAssign ? (
                <div className="space-y-2">
                  <p className="text-sm flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Assign to {businessName}:</strong> The vehicle will be added to your business fleet</span>
                  </p>
                  <p className="text-sm flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Shared access:</strong> Both your business and the current owner can use this vehicle</span>
                  </p>
                  <p className="text-sm flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Payment methods:</strong> You can set up your own payment methods for this vehicle</span>
                  </p>
                  <p className="text-sm flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Fleet management:</strong> You can assign this vehicle to your drivers</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Cannot assign:</strong> {reason || 'This vehicle cannot be assigned to your business'}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Please contact support if you believe this is an error.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warning for Business Ownership */}
          {currentOwnership.type === 'business' && canAssign && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Shared Vehicle Access</strong> - This vehicle will be shared between your business and the current owner. 
                Both parties will have access to the same vehicle for charging sessions.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for Individual Ownership */}
          {currentOwnership.type === 'individual' && canAssign && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Individual User Vehicle</strong> - This vehicle is currently owned by an individual user. 
                Assigning it to your business will give both the individual and your business access to this vehicle.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!canAssign || loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {canAssign ? 'Assign to Business' : 'Cannot Assign'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

