'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, CheckCircle, AlertCircle } from "lucide-react"

interface InvoiceCustomerPopupProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  sessionData: any
}

export function InvoiceCustomerPopup({
  isOpen,
  onClose,
  onProceed,
  sessionData
}: InvoiceCustomerPopupProps) {
  // Helper function to format duration
  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Invoice Customer
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">
                  Monthly Invoice Customer
                </h4>
                <p className="text-sm text-blue-700">
                  This customer will be invoiced monthly through their business contract. 
                  No immediate payment is required.
                </p>
              </div>
            </div>
          </div>

          {/* Session Summary */}
          {sessionData?.session && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h5 className="font-medium text-gray-900">Session Summary</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {/* <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="ml-2 font-medium">
                    {formatDuration(sessionData.session.totalDuration)}
                  </span>
                </div> */}
                <div>
                  <span className="text-gray-500">Energy:</span>
                  <span className="ml-2 font-medium">
                    {sessionData.session.chargedKwh} kWh
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(sessionData.session.totalAmount || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <span className="ml-2 font-medium">
                    {sessionData.session.customerName || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        <DialogFooter className="gap-2">
          <Button onClick={onProceed} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Proceed & Complete Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
