'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Car, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { updateChargingSession, type AdminSession, type UpdateSessionData } from '@/lib/api/admin'

interface AdminSessionLiveEditDialogProps {
  session: AdminSession | null
  open: boolean
  onClose: () => void
  onUpdated?: () => void
}

const strOrNull = (s: string) => (s.trim() === '' ? null : s.trim())
// Returns null for empty OR non-numeric input, so an invalid value (e.g. "abc" → NaN)
// can't pass the `!= null` change-detection and leak NaN into the payload.
const numOrNull = (s: string) => {
  if (s.trim() === '') return null
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

// Restricted editor for in-progress (STARTED/PAUSED) sessions: relink the vehicle
// and fix metadata only. kWh/rate/discount/recalculate stay gated to finalized
// sessions (the backend rejects them here) since the session is still streaming.
export function AdminSessionLiveEditDialog({ session, open, onClose, onUpdated }: AdminSessionLiveEditDialogProps) {
  const queryClient = useQueryClient()

  const currentPlate = session?.vehicle?.licensePlates?.[0]?.licencePlateNumber ?? ''

  const [licensePlate, setLicensePlate] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [carModelMake, setCarModelMake] = useState('')
  const [startSoc, setStartSoc] = useState('')
  const [reason, setReason] = useState('')

  // The plate value last pushed into the field from props — lets the sync effect tell
  // "prop changed underneath us" apart from "the admin edited the field".
  const syncedPlateRef = useRef('')

  // Initialize all fields when the dialog opens / the session changes.
  useEffect(() => {
    if (open && session) {
      setLicensePlate(currentPlate)
      syncedPlateRef.current = currentPlate
      setCustomerName(session.customerName ?? '')
      setCarModelMake(session.carModelMake ?? '')
      setStartSoc(session.startSoc != null ? String(session.startSoc) : '')
      setReason('')
    }
  }, [open, session?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync ONLY the plate if it changes underneath us (background refetch / concurrent
  // edit) AND the admin hasn't edited the field — so it isn't left stale, but the admin's
  // own typed plate (and other in-progress edits) are never silently overwritten.
  useEffect(() => {
    if (!open) return
    // Adopt the new prop value AND advance the ref together, only when the admin hasn't
    // edited the field. Advancing the ref unconditionally would let it drift to the admin's
    // typed value (e.g. when a concurrent edit happens to match it), after which a later
    // refetch with a different plate would read as "not edited" and overwrite their input.
    if (licensePlate === syncedPlateRef.current && currentPlate !== syncedPlateRef.current) {
      setLicensePlate(currentPlate)
      syncedPlateRef.current = currentPlate
    }
  }, [open, currentPlate]) // eslint-disable-line react-hooks/exhaustive-deps

  const plateChanged = licensePlate.trim() !== '' && licensePlate.trim().toUpperCase() !== currentPlate.toUpperCase()
  // Trim both sides so whitespace in the stored value isn't read as a change on open.
  const customerNameChanged = strOrNull(customerName) !== strOrNull(session?.customerName ?? '')
  const carModelChanged = strOrNull(carModelMake) !== strOrNull(session?.carModelMake ?? '')
  // Only count a SOC edit when a valid number is entered that differs — clearing the field
  // isn't a sendable change (the payload omits a null), so it must not enable Save.
  const startSocChanged = numOrNull(startSoc) != null && numOrNull(startSoc) !== (session?.startSoc ?? null)
  const hasChange = plateChanged || customerNameChanged || carModelChanged || startSocChanged

  const invalidate = () => {
    if (!session) return
    queryClient.invalidateQueries({ queryKey: ['session', session.sessionId] })
    queryClient.invalidateQueries({ queryKey: ['session', session.id] })
    queryClient.invalidateQueries({ queryKey: ['sessionHistory', session.id] })
    queryClient.invalidateQueries({ queryKey: ['allSessions'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['activeSessions'], exact: false })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No session selected')
      const payload: UpdateSessionData = {}
      if (plateChanged) payload.licensePlate = licensePlate.trim()
      if (customerNameChanged) payload.customerName = strOrNull(customerName)
      if (carModelChanged) payload.carModelMake = strOrNull(carModelMake)
      if (startSocChanged) payload.startSoc = Number(startSoc)
      if (reason.trim()) payload.reason = reason.trim()
      const res = await updateChargingSession(session.id, payload)
      return res.message
    },
    onSuccess: (message) => {
      invalidate()
      toast.success(message || 'Session updated')
      onUpdated?.()
      onClose()
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update session'),
  })

  if (!session) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-md p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5 shrink-0" />
            Edit live session
          </DialogTitle>
          <DialogDescription>
            Relink the vehicle or fix the details of this in-progress session. The amount is
            recalculated only after it ends. The session ID never changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="live-plate">License plate</Label>
            <Input
              id="live-plate"
              placeholder="Relink to this plate"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
            />
            {plateChanged && (
              <p className="text-xs text-blue-600">
                Relinks from {currentPlate || '—'} → {licensePlate.trim().toUpperCase()}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="live-customer">Customer name</Label>
            <Input id="live-customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="live-model">Car model / make</Label>
            <Input id="live-model" value={carModelMake} onChange={(e) => setCarModelMake(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="live-startsoc">Start SOC (%)</Label>
            <Input id="live-startsoc" type="number" min="0" max="100" value={startSoc} onChange={(e) => setStartSoc(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="live-reason">Reason (optional)</Label>
            <Textarea
              id="live-reason"
              placeholder="Why is this session being edited?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
          <Alert>
            <AlertDescription className="text-xs">
              kWh, rate and discount can only be edited once the session is ended.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!hasChange || saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
