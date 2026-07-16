'use client'

import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowRight, 
  User, 
  AlertTriangle, 
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TransferKwhFields } from '@/components/shared/TransferKwhFields'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  getAvailableOperators,
  transferSession, 
  type Operator,
  type TransferSessionData 
} from '@/lib/api/chargingSessions'
import { getVehicleLicensePlateNumber } from '@/lib/utils/vehicleUtils'
import { useOperatorWs } from '@/lib/hooks/useOperatorWs'


interface SessionTransferDialogProps {
  session: any | null
  isOpen: boolean
  onClose: () => void
}

export function SessionTransferDialog({ session, isOpen, onClose }: SessionTransferDialogProps) {
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('')
  const [transferredKwh, setTransferredKwh] = useState('')
  const [transferredKwhImage, setTransferredKwhImage] = useState('')
  // Live kWh from WS telemetry for this session. Seeded from the session prop
  // and overwritten in-place on every session:telemetry event so the readout
  // stays fresh while the operator is deciding who to transfer to.
  const [liveKwh, setLiveKwh] = useState<number | null>(
    session?.chargedKwh != null ? Number(session.chargedKwh) : null
  )
  const queryClient = useQueryClient()

  useEffect(() => {
    setLiveKwh(session?.chargedKwh != null ? Number(session.chargedKwh) : null)
  }, [session?.id, session?.chargedKwh])

  useOperatorWs({
    onSessionTelemetry: ({ sessionId, chargedKwh }) => {
      if (!session || sessionId !== session.id) return
      if (chargedKwh != null) setLiveKwh(chargedKwh)
    },
  })

  // Fetch available operators
  const { data: operators = [], isLoading: operatorsLoading, error: operatorsError } = useQuery<Operator[]>({
    queryKey: ['available-operators'],
    queryFn: getAvailableOperators,
    enabled: isOpen
  })

  // Transfer session mutation
  const transferMutation = useMutation({
    mutationFn: async (operatorId: string) => {
      if (!session?.id) throw new Error('No session selected')

      const isRemote = session?.source === 'REMOTE'
      const transferData: TransferSessionData = {
        sessionId: session.id,
        newOperatorId: operatorId,
        ...(isRemote
          ? {}
          : { transferredKwh: parseFloat(transferredKwh), transferredKwhImage }),
      }

      return await transferSession(transferData)
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['operatorSessions'] })
      queryClient.invalidateQueries({ queryKey: ['operatorActiveSessions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      queryClient.invalidateQueries({ queryKey: ['available-operators'] })
      
      // Force refresh the page to ensure all data is updated
      window.location.reload()
      
      onClose()
      // Reset form
      setSelectedOperatorId('')
    },
    onError: (error) => {
      console.error('Transfer failed:', error)
    }
  })

  const isRemoteSession = session?.source === 'REMOTE'

  const handleTransfer = () => {
    if (!selectedOperatorId) return

    // Manual sessions require kWh + image; remote sessions use backend's live data
    if (!isRemoteSession) {
      if (!transferredKwh || parseFloat(transferredKwh) <= 0) return
      if (!transferredKwhImage) return
    }

    transferMutation.mutate(selectedOperatorId)
  }

  const handleClose = () => {
    setSelectedOperatorId('')
    setTransferredKwh('')
    setTransferredKwhImage('')
    onClose()
  }

  const selectedOperator = operators.find((op: Operator) => op.id === selectedOperatorId)

  if (!session) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] sm:w-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Transfer Session
          </DialogTitle>
          <DialogDescription>
            Transfer this charging session to another operator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Vehicle:</span>
                <span className="font-medium">{getVehicleLicensePlateNumber(session.vehicle) || session.vehicle?.kabisaId || session.vehicleId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Charger:</span>
                <span className="font-medium">{session.charger?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Started:</span>
                <span className="font-medium">
                  {new Date(session.startTime).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Operator Selection */}
          <div className="space-y-2">
            <Label htmlFor="operator-select">Select Operator</Label>
            <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an operator..." />
              </SelectTrigger>
              <SelectContent>
                {operatorsLoading ? (
                  <SelectItem value="loading" disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading operators...
                  </SelectItem>
                ) : operatorsError ? (
                  <SelectItem value="error" disabled>
                    Error loading operators
                  </SelectItem>
                ) : operators.length === 0 ? (
                  <SelectItem value="no-operators" disabled>
                    No operators available
                  </SelectItem>
                ) : (
                  operators.map((operator: Operator) => (
                    <SelectItem key={operator.id} value={operator.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{operator.name ?? ([operator.firstName, operator.lastName].filter(Boolean).join(' ') || 'Unknown')}</span>
                        {operator.isTrainee && (
                          <Badge variant="secondary" className="ml-1 text-xs">Trainee</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* kWh Reading at Transfer */}
          {isRemoteSession ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-800 font-medium">kWh at Transfer</span>
                <span className="text-lg font-bold text-green-900">
                  {liveKwh != null ? `${liveKwh.toFixed(2)} kWh` : '—'}
                </span>
              </div>
              <p className="text-xs text-green-700">
                Auto-filled from the charger, updates live. No photo required for online sessions.
              </p>
            </div>
          ) : (
            <TransferKwhFields
              kwhValue={transferredKwh}
              kwhImage={transferredKwhImage}
              onKwhChange={setTransferredKwh}
              onImageChange={setTransferredKwhImage}
              disabled={transferMutation.isPending}
            />
          )}

          {/* Warning */}
         
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={transferMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedOperatorId || (!isRemoteSession && (!transferredKwh || !transferredKwhImage)) || transferMutation.isPending}
            className="bg-black hover:bg-gray-800 text-white"
          >
            {transferMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Transfer Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
