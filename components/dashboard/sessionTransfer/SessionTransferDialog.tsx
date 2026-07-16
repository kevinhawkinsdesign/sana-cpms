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
import { Input } from '@/components/ui/input'
import ImageUpload from '@/components/ui/image-upload'
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
  transferSession,
  getAvailableOperators,
  type ChargingSession,
  type Operator,
  type TransferSessionData,
  formatSessionDuration,
  getSessionStatusColor,
  getSessionStatusIcon
} from '@/lib/api/sessionTransfer'
import { useOperatorWs } from '@/lib/hooks/useOperatorWs'

interface SessionTransferDialogProps {
  session: ChargingSession | null
  isOpen: boolean
  onClose: () => void
  onTransferComplete?: (data: any) => void
}

export function SessionTransferDialog({ 
  session, 
  isOpen, 
  onClose, 
  onTransferComplete 
}: SessionTransferDialogProps) {
  const [selectedOperatorId, setSelectedOperatorId] = useState('')
  const [transferredKwh, setTransferredKwh] = useState('')
  const [transferredKwhImage, setTransferredKwhImage] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  // Live kWh from WS telemetry. Starts from the prop value, then overwritten
  // in-place whenever the backend ships a session:telemetry event for this
  // same sessionId so the "kWh at Transfer" readout stays fresh while the
  // operator is still deciding who to hand the session to.
  const [liveKwh, setLiveKwh] = useState<number | null>(session?.chargedKwh ?? null)
  const queryClient = useQueryClient()

  const isRemoteSession = session?.source === 'REMOTE'

  // Reset the live value whenever the dialog opens a different session
  useEffect(() => {
    setLiveKwh(session?.chargedKwh ?? null)
  }, [session?.id, session?.chargedKwh])

  useOperatorWs({
    onSessionTelemetry: ({ sessionId, chargedKwh }) => {
      if (!session || sessionId !== session.id) return
      if (chargedKwh != null) setLiveKwh(chargedKwh)
    },
  })

  // Fetch available operators
  const { data: operatorsData, isLoading: operatorsLoading, error: operatorsError } = useQuery({
    queryKey: ['availableOperators'],
    queryFn: getAvailableOperators,
    enabled: isOpen,
  })

  const operators = operatorsData?.operators || []

  // Transfer session mutation
  const transferMutation = useMutation({
    mutationFn: (data: TransferSessionData) => transferSession(data),
    onSuccess: (data) => {
      // Backend will handle success messaging through api.ts interceptors
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['availableOperators'] })
      onTransferComplete?.(data)
      handleClose()
    },
    onError: (error: any) => {
      // Backend will handle error messaging through api.ts interceptors
      console.error('Error transferring session:', error)
    }
  })

  const handleClose = () => {
    setSelectedOperatorId('')
    setTransferredKwh('')
    setTransferredKwhImage('')
    setShowConfirmation(false)
    onClose()
  }

  const handleTransfer = () => {
    if (!session || !selectedOperatorId) return

    if (isRemoteSession) {
      // Remote sessions: backend reads live chargedKwh from DB, no image needed
      const transferData: TransferSessionData = {
        sessionId: session.id,
        newOperatorId: selectedOperatorId,
      }
      transferMutation.mutate(transferData)
    } else {
      // Manual sessions require operator-entered kWh + image
      if (!transferredKwh || parseFloat(transferredKwh) <= 0) return
      if (!transferredKwhImage) return

      const transferData: TransferSessionData = {
        sessionId: session.id,
        newOperatorId: selectedOperatorId,
        transferredKwh: parseFloat(transferredKwh),
        transferredKwhImage: transferredKwhImage,
      }
      transferMutation.mutate(transferData)
    }
  }

  const selectedOperator = operators.find(op => op.id === selectedOperatorId)

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
            Transfer this charging session to another operator. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Vehicle</span>
                <span className="font-medium">
                  {session.vehicle.make} {session.vehicle.model}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">License Plate</span>
                <span className="font-medium">
                  {session.vehicle.licensePlates[0]?.licencePlateNumber || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Charger</span>
                <span className="font-medium">{session.charger.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">SOC</span>
                <span className="font-medium">{session.currentSoc}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Duration</span>
                <span className="font-medium">{formatSessionDuration(session.startTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge className={getSessionStatusColor(session.sessionStatus)}>
                  {session.sessionStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Operator Selection */}
          <div className="space-y-2">
            <Label htmlFor="operator-select">Transfer to Operator</Label>
            <Select
              value={selectedOperatorId}
              onValueChange={setSelectedOperatorId}
              disabled={operatorsLoading || transferMutation.isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an operator..." />
              </SelectTrigger>
              <SelectContent>
                {operators.map((operator) => (
                  <SelectItem key={operator.id} value={operator.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        {operator.name ?? [operator.firstName, operator.lastName].filter(Boolean).join(' ') ?? 'Unknown'}
                      </span>
                      {operator.isTrainee && (
                        <Badge variant="secondary" className="ml-1 text-xs">Trainee</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {operatorsError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load operators. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Selected Operator Info */}
          {selectedOperator && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 flex items-center gap-2">
                      {selectedOperator.name ?? [selectedOperator.firstName, selectedOperator.lastName].filter(Boolean).join(' ') ?? 'Unknown'}
                      {selectedOperator.isTrainee && (
                        <Badge variant="secondary" className="text-xs">Trainee</Badge>
                      )}
                    </p>
                    {selectedOperator.email && (
                      <p className="text-sm text-blue-700">{selectedOperator.email}</p>
                    )}
                    {selectedOperator.phone && (
                      <p className="text-sm text-blue-700">{selectedOperator.phone}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* kWh Reading at Transfer */}
          {isRemoteSession ? (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-800 font-medium">kWh at Transfer</span>
                  <span className="text-lg font-bold text-green-900">
                    {liveKwh != null ? `${liveKwh.toFixed(2)} kWh` : '—'}
                  </span>
                </div>
                <p className="text-xs text-green-700">
                  Auto-filled from the charger, updates live. No photo required for online sessions.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="transferredKwh" className="text-sm font-medium">
                  kWh Reading at Transfer <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="transferredKwh"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter kWh reading (e.g., 25.5)"
                  value={transferredKwh}
                  onChange={(e) => setTransferredKwh(e.target.value)}
                  className="mt-2"
                  disabled={transferMutation.isPending}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Record the current kWh reading from the charger at the time of transfer
                </p>
              </div>

              <div>
                <ImageUpload
                  name="transferredKwhImage"
                  label="kWh Reading Image"
                  currentImage={transferredKwhImage}
                  onImageChange={(name, url) => setTransferredKwhImage(url)}
                  isRequired={true}
                  uploadContext="session-kwh-meter"
                  entityId={session?.id}
                />
              </div>
            </div>
          )}

          {/* Confirmation Step */}
          {selectedOperatorId && !showConfirmation && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Are you sure you want to transfer this session to{' '}
                <strong>
                  {selectedOperator?.name ?? [selectedOperator?.firstName, selectedOperator?.lastName].filter(Boolean).join(' ') ?? 'Unknown'}
                </strong>?
                This action cannot be undone.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={transferMutation.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          
          {selectedOperatorId && !showConfirmation ? (
            <Button
              onClick={() => setShowConfirmation(true)}
              disabled={transferMutation.isPending}
              className="w-full sm:w-auto"
            >
              Confirm Transfer
            </Button>
          ) : selectedOperatorId && showConfirmation ? (
            <Button
              onClick={handleTransfer}
              disabled={transferMutation.isPending || (!isRemoteSession && (!transferredKwh || !transferredKwhImage))}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
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
          ) : (
            <Button
              disabled
              className="w-full sm:w-auto"
            >
              Select Operator
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
