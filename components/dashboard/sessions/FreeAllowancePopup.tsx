'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

interface FreeAllowancePopupProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  sessionData: any
}

export function FreeAllowancePopup({
  isOpen,
  onClose,
  onProceed,
  sessionData
}: FreeAllowancePopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-black" />
            {sessionData?.paymentMethodName || 'Free Charging Allowance'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-black" />
            </div>
            <p className="text-sm text-gray-600">
              This session is covered by a free charging allowance. No payment is required.
            </p>
          </div>

          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Payment Method:</span>
                  <span className="text-sm font-medium text-black">
                    {sessionData?.paymentMethodName || 'Free Charging Allowance'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Amount to Pay:</span>
                  <span className="text-lg font-bold text-black">
                    {sessionData?.currency || 'RWF'} 0
                  </span>
                </div>

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
                        {sessionData.session.startTime && sessionData.session.endTime ? 
                          `${Math.round((new Date(sessionData.session.endTime).getTime() - new Date(sessionData.session.startTime).getTime()) / (1000 * 60))} minutes` : 
                          'N/A'
                        }
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={onProceed}
            className="bg-black hover:bg-gray-800 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Proceed to End Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
