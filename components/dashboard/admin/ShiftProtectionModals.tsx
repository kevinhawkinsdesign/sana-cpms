'use client'

import React from 'react'
import { AlertTriangle, Clock, MapPin, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type Shift } from '@/lib/api/shifts'

interface EditWarningModalProps {
  isOpen: boolean
  shift: Shift | null
  onCancel: () => void
  onConfirm: () => void
}

export const EditWarningModal: React.FC<EditWarningModalProps> = ({
  isOpen,
  shift,
  onCancel,
  onConfirm,
}) => {
  if (!shift) return null

  const getCheckedInTime = () => {
    // This would come from shift report data
    // For now, showing placeholder
    return 'Currently active'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Edit Active Shift?
          </DialogTitle>
          <DialogDescription>
            This shift is currently active. Editing may affect ongoing work.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-900">
              <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="font-semibold">Shift Active</span>
            </div>

            <div className="space-y-2 text-sm">
              {shift.operator && (
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="h-4 w-4 text-amber-600" />
                  <span>
                    {shift.operator.firstName} {shift.operator.lastName}
                  </span>
                </div>
              )}

              {shift.startTime && shift.endTime && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>
                    {shift.startTime} - {shift.endTime}
                  </span>
                </div>
              )}

              {shift.charger && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  <span>{shift.charger.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-amber-700 font-medium mt-3">
                <Clock className="h-4 w-4" />
                <span>{getCheckedInTime()}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p>
              The operator is currently checked in to this shift. Making changes
              could disrupt their work or affect shift reporting.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Edit Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteWarningModalProps {
  isOpen: boolean
  shift: Shift | null
  onCancel: () => void
  onConfirm: () => void
}

export const DeleteWarningModal: React.FC<DeleteWarningModalProps> = ({
  isOpen,
  shift,
  onCancel,
  onConfirm,
}) => {
  if (!shift) return null

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Active Shift?
          </DialogTitle>
          <DialogDescription>
            This is a dangerous operation that cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-bold">WARNING: Shift is Active!</span>
            </div>

            <div className="space-y-2 text-sm">
              {shift.operator && (
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="h-4 w-4 text-red-600" />
                  <span>
                    {shift.operator.firstName} {shift.operator.lastName}
                  </span>
                </div>
              )}

              {shift.startTime && shift.endTime && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="h-4 w-4 text-red-600" />
                  <span>
                    {shift.startTime} - {shift.endTime}
                  </span>
                </div>
              )}

              {shift.charger && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span>{shift.charger.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-red-700 font-medium mt-3">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span>Operator has NOT checked out yet</span>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-900 mb-2">
              Deleting this shift will:
            </p>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Remove the shift from the schedule</li>
              <li>May prevent proper check-out</li>
              <li>Could affect shift reports and metrics</li>
              <li>Cannot be undone</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            Delete Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
