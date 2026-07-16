'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, FileText } from 'lucide-react'

interface ContractPaymentPopupProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  sessionData: any
}

export function ContractPaymentPopup({
  isOpen,
  onClose,
  onProceed,
  sessionData
}: ContractPaymentPopupProps) {
  // Helper function to format currency
  const formatCurrency = (amount: number, currency: string = 'RWF') => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Helper function to format duration
  const formatDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 'N/A'
    const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60))
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    return `${hours}h ${minutes}m`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Contract Payment
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">
              This session will be billed to the business contract. No immediate payment is required.
            </p>
          </div>

          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Payment Method:</span>
                  <span className="text-sm font-medium text-black">
                    {sessionData?.paymentInfo?.paymentMethod || 'CONTRACT'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Amount to Bill:</span>
                  <span className="text-lg font-bold text-black">
                    {formatCurrency(sessionData?.paymentInfo?.amount || 0, sessionData?.paymentInfo?.currency)}
                  </span>
                </div>

                {sessionData?.paymentInfo?.ratePerKwh && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Rate per kWh:</span>
                    <span className="text-sm font-mono text-black">
                      {formatCurrency(sessionData.paymentInfo.ratePerKwh, sessionData.paymentInfo.currency)}/kWh
                    </span>
                  </div>
                )}

                {sessionData?.session && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Energy Charged:</span>
                      <span className="text-sm font-mono text-black">
                        {sessionData.session.chargedKwh || 0} kWh
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Session Duration:</span>
                      <span className="text-sm text-black">
                        {formatDuration(sessionData.session.startTime, sessionData.session.endTime)}
                      </span>
                    </div>

                    {sessionData.session.customerName && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Customer:</span>
                        <span className="text-sm text-black">
                          {sessionData.session.customerName}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {sessionData?.isInvoicedCustomer && (
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-700">
                      This session will be included in the monthly invoice for the business.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onProceed} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
