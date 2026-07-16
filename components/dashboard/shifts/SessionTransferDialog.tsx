'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TransferKwhFields } from '@/components/shared/TransferKwhFields'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { getOperatorActiveSessions as getActiveSessions } from '@/lib/api/chargingSessions'
import {
  getAvailableOperators,
  transferSession as transferChargingSession,
  type Operator,
  type TransferSessionData
} from '@/lib/api/sessionTransfer'

interface SessionTransferDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function SessionTransferDialog({ open, onClose, onSuccess }: SessionTransferDialogProps) {
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [selectedOperatorId, setSelectedOperatorId] = useState('')
  const [transferredKwh, setTransferredKwh] = useState('')
  const [transferredKwhImage, setTransferredKwhImage] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)

  const queryClient = useQueryClient()

  // Fetch available operators
  const { data: operatorsData, isLoading: operatorsLoading } = useQuery({
    queryKey: ['availableOperators'],
    queryFn: getAvailableOperators,
    enabled: open,
  })

  // Fetch active sessions
  const { data: activeSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['operatorActiveSessions'],
    queryFn: getActiveSessions,
    enabled: open,
  })

  const operators: Operator[] = operatorsData?.operators || []
  const sessions = activeSessions || []

  // Transfer session mutation
  const transferMutation = useMutation({
    mutationFn: (data: TransferSessionData) => transferChargingSession(data),
    onSuccess: (data) => {
      // Backend will handle success messaging through api.ts interceptors
      queryClient.invalidateQueries({ queryKey: ['operatorActiveSessions'] })
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      onSuccess?.()
      onClose()
      resetForm()
    },
    onError: (error: any) => {
      // Backend will handle error messaging through api.ts interceptors
      console.error('Error transferring session:', error)
    }
  })

  const resetForm = () => {
    setSelectedSessionId('')
    setSelectedOperatorId('')
    setTransferredKwh('')
    setTransferredKwhImage('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleTransfer = async () => {
    if (!selectedSessionId || !selectedOperatorId) {
      toast.error('Please select both a session and an operator')
      return
    }

    const isRemote = selectedSession?.source === 'REMOTE'

    // Manual sessions require kWh + image; remote sessions use backend's live data
    if (!isRemote) {
      if (!transferredKwh || parseFloat(transferredKwh) <= 0) {
        toast.error('Please enter a valid kWh reading')
        return
      }
      if (!transferredKwhImage) {
        toast.error('Please upload a kWh reading image')
        return
      }
    }

    setIsTransferring(true)
    try {
      const transferData: TransferSessionData = {
        sessionId: selectedSessionId,
        newOperatorId: selectedOperatorId,
        ...(isRemote
          ? {}
          : { transferredKwh: parseFloat(transferredKwh), transferredKwhImage }),
      }

      await transferMutation.mutateAsync(transferData)
    } finally {
      setIsTransferring(false)
    }
  }

  const selectedSession = sessions.find(session => session.id === selectedSessionId)
  const selectedOperator = operators.find(operator => operator.id === selectedOperatorId)
  const isRemoteSession = selectedSession?.source === 'REMOTE'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-w-[95vw] sm:w-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Transfer Charging Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Active Session
            </label>
            <Select onValueChange={setSelectedSessionId} value={selectedSessionId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a session to transfer..." />
              </SelectTrigger>
              <SelectContent>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading sessions...
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No active sessions available
                  </div>
                ) : (
                  sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          Session {session.sessionId}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {session.vehicle?.licensePlates?.[0]?.licencePlateNumber || 'Unknown Vehicle'} - {session.vehicle?.make} {session.vehicle?.model}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Session Details */}
          {selectedSession && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Session Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Session ID:</span>
                  <span className="ml-2 text-blue-600">{selectedSession.sessionId}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Status:</span>
                  <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                    {selectedSession.sessionStatus}
                  </Badge>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Vehicle:</span>
                  <span className="ml-2 text-blue-600">
                    {selectedSession.vehicle?.make} {selectedSession.vehicle?.model}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">License Plate:</span>
                  <span className="ml-2 text-blue-600">
                    {selectedSession.vehicle?.licensePlates?.[0]?.licencePlateNumber || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Started:</span>
                  <span className="ml-2 text-blue-600">
                    {new Date(selectedSession.startTime).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">SOC:</span>
                  <span className="ml-2 text-blue-600">
                    {selectedSession.startSoc}% → {selectedSession.endSoc || 'Ongoing'}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Operator Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Transfer To Operator
            </label>
            <Select onValueChange={setSelectedOperatorId} value={selectedOperatorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an operator..." />
              </SelectTrigger>
              <SelectContent>
                {operatorsLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading operators...
                  </div>
                ) : operators.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No operators available
                  </div>
                ) : (
                  operators.map((operator) => (
                    <SelectItem key={operator.id} value={operator.id}>
                      <div className="flex items-center gap-2">
                        <span>
                          {operator.name ?? [operator.firstName, operator.lastName].filter(Boolean).join(' ') ?? 'Unknown'}
                        </span>
                        {operator.isTrainee && (
                          <Badge variant="secondary" className="text-xs">Trainee</Badge>
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
                  {selectedSession?.chargedKwh != null
                    ? `${Number(selectedSession.chargedKwh).toFixed(2)} kWh`
                    : '—'}
                </span>
              </div>
              <p className="text-xs text-green-700">
                Auto-filled from the charger. No photo required for online sessions.
              </p>
            </div>
          ) : (
            <TransferKwhFields
              kwhValue={transferredKwh}
              kwhImage={transferredKwhImage}
              onKwhChange={setTransferredKwh}
              onImageChange={setTransferredKwhImage}
              disabled={isTransferring}
            />
          )}

          {/* Transfer Preview */}
          {selectedSession && selectedOperator && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Transfer Preview</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-green-700">
                    <strong>From:</strong> Current Operator
                  </p>
                  <p className="text-sm text-green-600">
                    Session {selectedSession.sessionId}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm text-green-700">
                    <strong>To:</strong> {selectedOperator.firstName} {selectedOperator.lastName}
                  </p>
                  <p className="text-sm text-green-600">
                    Will take over this session
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">Important Notice</h4>
                <p className="text-sm text-yellow-700">
                  Once transferred, the selected operator will be responsible for this charging session. 
                  You will no longer have access to manage this session.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isTransferring}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={isTransferring || !selectedSessionId || !selectedOperatorId || (!isRemoteSession && (!transferredKwh || !transferredKwhImage)) || sessionsLoading || operatorsLoading}
          >
            {isTransferring ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {isTransferring ? 'Transferring...' : 'Transfer Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

