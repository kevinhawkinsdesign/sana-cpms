'use client'

import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VehicleDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: any
}

export function VehicleDetailsModal({ isOpen, onClose, vehicle }: VehicleDetailsModalProps) {
  if (!isOpen || !vehicle) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const primaryLicensePlate = vehicle.vehicleLicensePlates?.[0]?.licensePlate

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-gray-600 text-base">Vehicle Information</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Vehicle Image */}
        <div className="px-6 pb-4">
          {vehicle.imageUrl ? (
            <div className="w-full rounded-lg overflow-hidden bg-gray-100">
              <img 
                src={vehicle.imageUrl} 
                alt={`${vehicle.make} ${vehicle.model}`}
                className="w-full h-auto object-cover"
              />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-lg bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">🚗</span>
                </div>
                <p className="text-gray-500 text-sm">No image available</p>
              </div>
            </div>
          )}
        </div>

        {/* Vehicle Specifications */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600 text-sm">Make:</span>
              <p className="font-semibold text-gray-900">{vehicle.make || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">Model:</span>
              <p className="font-semibold text-gray-900">{vehicle.model || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">License Plate:</span>
              <p className="font-semibold text-gray-900">{vehicle.vehicleLicensePlates?.[0]?.licencePlateNumber || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">VIN:</span>
              <p className="font-semibold text-gray-900 font-mono text-xs">{vehicle.vin || 'N/A'}</p>
            </div>
            {vehicle.batteryCapacity && (
              <div>
                <span className="text-gray-600 text-sm">Battery:</span>
                <p className="font-semibold text-gray-900">{vehicle.batteryCapacity} kWh</p>
              </div>
            )}
            <div>
              <span className="text-gray-600 text-sm">Created:</span>
              <p className="font-semibold text-gray-900">{formatDate(vehicle.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="px-6 pb-6 text-center">
          <Button 
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-2 rounded-lg font-medium"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
