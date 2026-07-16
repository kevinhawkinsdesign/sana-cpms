'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Battery, Clock, MapPin, Car, Zap, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import api from "@/lib/api/api"
import { EnhancedPaymentDialog } from "./EnhancedPaymentDialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'

interface SessionInfoDialogProps {
  open: boolean
  onClose: () => void
  sessionId: string
  onSessionEnd?: () => void
  onPaymentClick?: () => void
}

interface SessionData {
  id: string
  sessionId: string
  kabisaIdVehicle: string
  kabisaIdCharger: string
  startDate: string
  endDate: string | null
  charger: {
    name: string
    address: string
  }
  vehicle: {
    licencePlateNumber: string
    model: {
      model: string
      make: {
        make: string
      }
    }
  }
  startSOC: number
  endSOC: number | null
  chargedKW: number | null
  chargingDuration: number | null
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN'
  paymentMethod: string
  paymentMethodName: string
  calcRevenue: number | null
}

export function SessionInfoDialog({ 
  open, 
  onClose, 
  sessionId, 
  onSessionEnd,
  onPaymentClick 
}: SessionInfoDialogProps) {
  const router = useLocalizedRouter()
  const [showPayment, setShowPayment] = useState(false)

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const response = await api(false, true).get(`/api/charge/sessions/${sessionId}`)
      return response.data.data
    },
    enabled: !!sessionId && open
  })

  const handleEndSession = () => {
    if (session?.kabisaIdVehicle) {
      router.push(`/dashboard/charge/session?op=end&vId=${session.kabisaIdVehicle}`)
      onClose()
    }
  }

  const handlePaymentComplete = () => {
    setShowPayment(false)
    // Refresh session data
    router.refresh()
  }

  const handlePaymentClick = () => {
    if (onPaymentClick) {
      onPaymentClick()
    } else {
      setShowPayment(true)
    }
  }

  if (!session && !isLoading) return null

  const isSessionActive = !session?.endDate
  const needsPayment = session?.paymentStatus === 'PENDING'

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Session Information
            </DialogTitle>
            <DialogDescription>
              {isSessionActive ? 'Active charging session' : 'Completed charging session'}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : session ? (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex justify-end">
                <Badge variant={isSessionActive ? "secondary" : "default"}>
                  {isSessionActive ? 'In Progress' : 'Completed'}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Vehicle Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicle Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">
                        {session.vehicle.model.make.make} {session.vehicle.model.model}
                      </p>
                      <p className="text-muted-foreground">Plate: {session.vehicle.licencePlateNumber}</p>
                      <p className="text-muted-foreground">ID: {session.kabisaIdVehicle}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Charger Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Charging Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{session.charger.name}</p>
                      <p className="text-muted-foreground">ID: {session.kabisaIdCharger}</p>
                      <p className="text-muted-foreground">{session.charger.address}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Charging Details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Charging Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <p>Start: {format(new Date(session.startDate), 'PPp')}</p>
                      {session.endDate && (
                        <p>End: {format(new Date(session.endDate), 'PPp')}</p>
                      )}
                      <p className="text-muted-foreground">
                        Duration: {session.chargingDuration ? 
                          `${Math.floor(session.chargingDuration / 60)}h ${session.chargingDuration % 60}m` : 
                          'In Progress'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Battery Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Battery className="h-4 w-4" />
                      Battery Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <p>SOC: {session.startSOC}% → {session.endSOC ? `${session.endSOC}%` : 'In Progress'}</p>
                      <p className="text-muted-foreground">
                        Energy: {session.chargedKW ? `${session.chargedKW.toFixed(1)} kWh` : 'In Progress'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Info */}
              {session.calcRevenue !== null && session.calcRevenue > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm">Amount</p>
                        <p className="font-medium">{formatCurrency(session.calcRevenue)} RWF</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm">Status</p>
                        <Badge variant={
                          session.paymentStatus === 'COMPLETED' ? 'default' :
                          session.paymentStatus === 'FAILED' ? 'destructive' :
                          session.paymentStatus === 'UNKNOWN' ? 'secondary' :
                          'secondary'
                        }>
                          {session.paymentMethodName || session.paymentStatus}
                        </Badge>
                      </div>
                      {needsPayment && (
                        <Button 
                          onClick={handlePaymentClick} 
                          className="w-full"
                        >
                          Complete Payment
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {needsPayment && session.calcRevenue !== null && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Payment Required</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>This session requires payment to be completed.</span>
                    <Button 
                      onClick={handlePaymentClick}
                      size="sm"
                    >
                      Pay Now
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}

          <DialogFooter className="flex gap-2">
            {isSessionActive && (
              <Button onClick={handleEndSession} variant="destructive">
                End Session
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showPayment && session && !onPaymentClick && session.calcRevenue !== null && (
        <EnhancedPaymentDialog
          session={session}
          paymentInfo={{
            isPaid: false,
            amount: session.calcRevenue,
            currency: 'RWF',
            requiresValidation: true
          }}
          onSuccess={handlePaymentComplete}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  )
} 