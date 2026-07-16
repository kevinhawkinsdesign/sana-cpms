'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DollarSign, Plus, Trash2, Edit3, Phone, Loader2, CheckCircle, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  setVehicleDebt,
  addVehicleDebt,
  clearVehicleDebt,
  collectVehicleDebt,
  type IndividualVehicle,
  type SetVehicleDebtRequest,
  type AddVehicleDebtRequest,
} from '@/lib/api/adminIndividual'
import { checkDebtPaymentStatus, retryDebtPayment } from '@/lib/api/chargingSessions'

interface VehicleDebtManagementModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: IndividualVehicle
  onSuccess?: () => void
}

type DebtAction = 'set' | 'add' | 'clear' | 'collect'
type PaymentStatus = 'idle' | 'pending' | 'completed' | 'failed'

export function VehicleDebtManagementModal({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
}: VehicleDebtManagementModalProps) {
  const [action, setAction] = useState<DebtAction | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [collectPhone, setCollectPhone] = useState('')
  const [collectTransactionId, setCollectTransactionId] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [collectLoading, setCollectLoading] = useState(false)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
    }
  }, [])

  const currentDebt = vehicle.debtBalance ?? 0
  const currentNote = vehicle.debtNote ?? ''

  const setDebtMutation = useMutation({
    mutationFn: (data: SetVehicleDebtRequest) => setVehicleDebt(vehicle.id, data),
    onSuccess: (response) => {
      toast.success(response.message || 'Debt updated successfully')
      onSuccess?.()
      handleClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update debt')
    },
  })

  const addDebtMutation = useMutation({
    mutationFn: (data: AddVehicleDebtRequest) => addVehicleDebt(vehicle.id, data),
    onSuccess: (response) => {
      toast.success(response.message || 'Debt added successfully')
      onSuccess?.()
      handleClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add debt')
    },
  })

  const clearDebtMutation = useMutation({
    mutationFn: () => clearVehicleDebt(vehicle.id),
    onSuccess: (response) => {
      toast.success(response.message || 'Debt cleared successfully')
      onSuccess?.()
      handleClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to clear debt')
    },
  })

  const handleClose = () => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
    setAction(null)
    setAmount('')
    setNote('')
    setCollectPhone('')
    setCollectTransactionId(null)
    setPaymentStatus('idle')
    setPaymentError(null)
    setCollectLoading(false)
    onClose()
  }

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (action === 'set') {
      setDebtMutation.mutate({ debtAmount: parsedAmount, note: note || undefined })
    } else if (action === 'add') {
      addDebtMutation.mutate({ additionalDebt: parsedAmount, note: note || undefined })
    }
  }

  const handleClearDebt = () => {
    if (confirm('Are you sure you want to clear this vehicle\'s debt? This action cannot be undone.')) {
      clearDebtMutation.mutate()
    }
  }

  // ===== Payment Polling =====
  const pollPaymentStatus = useCallback((transactionId: string) => {
    let attempts = 0
    const maxAttempts = 24

    const poll = async () => {
      attempts++
      try {
        const result = await checkDebtPaymentStatus(transactionId)
        const status = result.data.status

        if (status === 'COMPLETED') {
          setPaymentStatus('completed')
          toast.success('Debt payment confirmed! Debt has been cleared.')
          queryClient.invalidateQueries({ queryKey: ['vehicles-with-debt'] })
          onSuccess?.()
          return
        }

        if (status === 'FAILED') {
          setPaymentStatus('failed')
          setPaymentError(result.data.reason || 'Payment was rejected or timed out')
          return
        }

        if (attempts >= maxAttempts) {
          setPaymentStatus('failed')
          setPaymentError('Payment confirmation timed out. You can retry the payment.')
          return
        }

        pollTimeoutRef.current = setTimeout(poll, 5000)
      } catch (error: any) {
        setPaymentStatus('failed')
        setPaymentError(error.message || 'Failed to check payment status')
      }
    }

    pollTimeoutRef.current = setTimeout(poll, 5000)
  }, [queryClient, onSuccess])

  // ===== Collect Payment Handler =====
  const handleCollectPayment = async () => {
    if (!collectPhone) {
      toast.error('Please enter a phone number')
      return
    }

    setCollectLoading(true)
    try {
      const result = await collectVehicleDebt(vehicle.id, { phone: collectPhone })
      const txnId = result.data.transactionId
      setCollectTransactionId(txnId)
      setPaymentStatus('pending')
      toast.info(`Payment of ${Math.ceil(currentDebt).toLocaleString()} RWF initiated to ${collectPhone}`)
      pollPaymentStatus(txnId)
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate payment')
    } finally {
      setCollectLoading(false)
    }
  }

  // ===== Retry Payment Handler =====
  const handleRetryPayment = async () => {
    if (!collectTransactionId || !collectPhone) {
      toast.error('Please enter a phone number')
      return
    }

    setCollectLoading(true)
    setPaymentError(null)
    try {
      const result = await retryDebtPayment(collectTransactionId, collectPhone)
      const newTxnId = result.data.transactionId
      setCollectTransactionId(newTxnId)
      setPaymentStatus('pending')
      toast.info('Payment retry initiated. Waiting for confirmation...')
      pollPaymentStatus(newTxnId)
    } catch (error: any) {
      setPaymentError(error.message || 'Failed to retry payment')
      toast.error(error.message || 'Failed to retry payment')
    } finally {
      setCollectLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount)
  }

  const isMutationPending = setDebtMutation.isPending || addDebtMutation.isPending || clearDebtMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Manage Vehicle Debt
          </DialogTitle>
          <DialogDescription>
            Manage outstanding debt for {vehicle.make} {vehicle.model} ({vehicle.kabisaId})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Debt Display — always visible except during payment states */}
          {(paymentStatus === 'idle' || action !== 'collect') && (
            <div className="rounded-lg border p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Debt</span>
                <Badge variant={currentDebt > 0 ? 'destructive' : 'secondary'}>
                  {currentDebt > 0 ? 'Has Debt' : 'No Debt'}
                </Badge>
              </div>
              <p className={`text-3xl font-bold mt-2 ${currentDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(currentDebt)}
              </p>
              {currentNote && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-xs text-gray-500">Note:</span>
                  <p className="text-sm text-gray-700 mt-1">{currentNote}</p>
                </div>
              )}
            </div>
          )}

          {/* === ACTION MENU === */}
          {!action && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Select an action:</p>
              <Button onClick={() => setAction('set')} className="w-full justify-start" variant="outline">
                <Edit3 className="h-4 w-4 mr-2" />
                Set Debt Amount
                <span className="ml-auto text-xs text-gray-500">Replace current debt</span>
              </Button>
              <Button onClick={() => setAction('add')} className="w-full justify-start" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add to Debt
                <span className="ml-auto text-xs text-gray-500">Increase current debt</span>
              </Button>
              {currentDebt > 0 && (
                <>
                  <Button
                    onClick={() => setAction('collect')}
                    className="w-full justify-start text-blue-600 border-blue-300 hover:bg-blue-50"
                    variant="outline"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Collect Payment via MOMO
                    <span className="ml-auto text-xs text-gray-500">Send payment request</span>
                  </Button>
                  <Button
                    onClick={handleClearDebt}
                    className="w-full justify-start text-green-600 border-green-300 hover:bg-green-50"
                    variant="outline"
                    disabled={isMutationPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Debt
                    <span className="ml-auto text-xs text-gray-500">Set debt to 0</span>
                  </Button>
                </>
              )}
            </div>
          )}

          {/* === SET / ADD DEBT FORM === */}
          {(action === 'set' || action === 'add') && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="amount">
                  {action === 'set' ? 'New Debt Amount' : 'Amount to Add'} (RWF)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isMutationPending}
                />
                {action === 'add' && amount && !isNaN(parseFloat(amount)) && (
                  <p className="text-sm text-gray-500">
                    New total will be: <span className="font-semibold text-red-600">
                      {formatCurrency(currentDebt + parseFloat(amount))}
                    </span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea
                  id="note"
                  placeholder="Add a note about this debt (e.g., reason, payment plan, etc.)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isMutationPending}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">This note will help track the reason for the debt</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => { setAction(null); setAmount(''); setNote('') }}
                  variant="outline"
                  className="flex-1"
                  disabled={isMutationPending}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isMutationPending || !amount || parseFloat(amount) < 0}
                >
                  {isMutationPending ? 'Processing...' : action === 'set' ? 'Set Debt' : 'Add Debt'}
                </Button>
              </div>
            </div>
          )}

          {/* === COLLECT PAYMENT FLOW === */}
          {action === 'collect' && (
            <>
              {/* IDLE — Phone input + initiate */}
              {paymentStatus === 'idle' && (
                <div className="space-y-4">
                  <Separator />
                  <div className="rounded-lg border p-4 bg-blue-50">
                    <div className="text-center">
                      <p className="text-sm text-blue-600 mb-1">Amount to Collect</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {formatCurrency(Math.ceil(currentDebt))}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="collect-phone">Phone Number</Label>
                    <Input
                      id="collect-phone"
                      type="tel"
                      placeholder="Enter phone number (e.g. 078XXXXXXX)"
                      value={collectPhone}
                      onChange={(e) => setCollectPhone(e.target.value)}
                      disabled={collectLoading}
                    />
                    <p className="text-xs text-gray-500">A MOMO payment request will be sent to this number</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => { setAction(null); setCollectPhone('') }}
                      variant="outline"
                      className="flex-1"
                      disabled={collectLoading}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleCollectPayment}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={!collectPhone || collectLoading}
                    >
                      {collectLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Phone className="h-4 w-4 mr-2" />
                      )}
                      Send Payment Request
                    </Button>
                  </div>
                </div>
              )}

              {/* PENDING — Waiting for confirmation */}
              {paymentStatus === 'pending' && (
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Waiting for Payment</h4>
                      <p className="text-sm text-gray-500">Please ask the customer to confirm on their phone</p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 bg-blue-50 text-center">
                    <p className="text-sm text-blue-600 mb-1">Amount</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {formatCurrency(Math.ceil(currentDebt))}
                    </p>
                    <p className="text-sm text-blue-500 mt-2">Sent to {collectPhone}</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking payment status...</span>
                  </div>

                  <Button variant="outline" onClick={handleClose} className="w-full">
                    Cancel
                  </Button>
                </div>
              )}

              {/* FAILED — Show error + retry */}
              {paymentStatus === 'failed' && (
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Payment Failed</h4>
                      <p className="text-sm text-gray-500">The payment was not completed</p>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-700">{paymentError}</p>
                    </div>
                  )}

                  <div className="rounded-lg border p-4 bg-gray-50 text-center">
                    <p className="text-sm text-gray-600 mb-1">Amount Due</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(Math.ceil(currentDebt))}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retry-phone">Phone Number</Label>
                    <Input
                      id="retry-phone"
                      type="tel"
                      placeholder="Enter phone number (e.g. 078XXXXXXX)"
                      value={collectPhone}
                      onChange={(e) => setCollectPhone(e.target.value)}
                      disabled={collectLoading}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRetryPayment}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={!collectPhone || collectLoading}
                    >
                      {collectLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Phone className="h-4 w-4 mr-2" />
                      )}
                      Retry Payment
                    </Button>
                  </div>
                </div>
              )}

              {/* COMPLETED — Success state */}
              {paymentStatus === 'completed' && (
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Payment Confirmed</h4>
                      <p className="text-sm text-gray-500">Debt has been cleared successfully</p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 bg-green-50 text-center">
                    <p className="text-sm text-green-600 mb-1">Amount Paid</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(Math.ceil(currentDebt))}
                    </p>
                  </div>

                  <Button onClick={handleClose} className="w-full">
                    Close
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
