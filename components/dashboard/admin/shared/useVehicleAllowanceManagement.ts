import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { type FreeChargingFormValues } from './FreeChargingAllowanceForm'
import { buildAllowanceFormData } from './vehicleAdminUtils'

export interface AllowanceItem {
  id: string
  isUnlimited: boolean
  [key: string]: any
}

/**
 * Manages allowance state and pure (non-mutation) handlers shared between
 * IndividualVehicleManagementModal and VehicleManagementModal.
 *
 * Mutation-calling handlers (handleAddAllowance, handleDeactivateAllowance,
 * confirmDeleteAllowance) are NOT included here to avoid a circular dependency
 * with mutations that need these setters in their onSuccess callbacks.
 * Use createHandleAllowance() from vehicleAdminUtils for handleAddAllowance.
 */
export function useVehicleAllowanceManagement(
  freeChargingForm: UseFormReturn<FreeChargingFormValues>
) {
  const [isAddAllowanceOpen, setIsAddAllowanceOpen] = useState(false)
  const [editingAllowance, setEditingAllowance] = useState<AllowanceItem | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [allowanceToDelete, setAllowanceToDelete] = useState<AllowanceItem | null>(null)
  const [chargerSearchTerm, setChargerSearchTerm] = useState('')

  function handleEditAllowance(allowance: AllowanceItem) {
    setEditingAllowance(allowance)
    setIsAddAllowanceOpen(true)
    freeChargingForm.reset(buildAllowanceFormData(allowance))
  }

  function handleDeleteAllowance(allowance: AllowanceItem) {
    setAllowanceToDelete(allowance)
    setDeleteConfirmOpen(true)
  }

  function cancelDelete() {
    setDeleteConfirmOpen(false)
    setAllowanceToDelete(null)
  }

  return {
    isAddAllowanceOpen,
    setIsAddAllowanceOpen,
    editingAllowance,
    setEditingAllowance,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    allowanceToDelete,
    setAllowanceToDelete,
    chargerSearchTerm,
    setChargerSearchTerm,
    handleEditAllowance,
    handleDeleteAllowance,
    cancelDelete,
  }
}
