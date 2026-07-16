'use client'

import React, { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, PlugZap, Radio } from 'lucide-react'
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
import ImageUpload from '@/components/ui/image-upload'
import { adminEndSession, adminForceEndRemoteSession, type AdminSession } from '@/lib/api/admin'

interface AdminEndSessionDialogProps {
  session: AdminSession | null
  open: boolean
  onClose: () => void
  onEnded?: () => void
}

const numOrNaN = (s: string) => (s.trim() === '' ? NaN : Number(s))

export function AdminEndSessionDialog({ session, open, onClose, onEnded }: AdminEndSessionDialogProps) {
  const queryClient = useQueryClient()
  const isRemote = session?.source === 'REMOTE'

  const [chargedKwh, setChargedKwh] = useState('')
  const [endSoc, setEndSoc] = useState('')
  const [chargerScreen, setChargerScreen] = useState<string | null>(null)
  const [discountRate, setDiscountRate] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setChargedKwh('')
      setEndSoc('')
      setChargerScreen(null)
      setDiscountRate('')
      setReason('')
    }
  }, [open, session?.id])

  const invalidate = () => {
    if (!session) return
    queryClient.invalidateQueries({ queryKey: ['session', session.sessionId] })
    queryClient.invalidateQueries({ queryKey: ['session', session.id] })
    queryClient.invalidateQueries({ queryKey: ['sessionHistory', session.id] })
    queryClient.invalidateQueries({ queryKey: ['allSessions'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['activeSessions'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['adminSessionStats'] })
  }

  const kwhNum = numOrNaN(chargedKwh)
  const socNum = numOrNaN(endSoc)
  const discountNum = numOrNaN(discountRate)
  const kwhValid = !Number.isNaN(kwhNum) && kwhNum > 0 && kwhNum <= 1000
  const socValid = !Number.isNaN(socNum) && socNum >= 0 && socNum <= 100
  const discountValid = discountRate.trim() === '' || (!Number.isNaN(discountNum) && discountNum >= 0 && discountNum <= 100)
  const endFormValid = kwhValid && socValid && discountValid

  const endMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No session selected')
      const res = await adminEndSession(session.id, {
        chargedKwh: kwhNum,
        endSoc: socNum,
        chargerScreen: chargerScreen ?? undefined,
        discountRate: discountRate.trim() !== '' ? discountNum : undefined,
      })
      return res.message
    },
    onSuccess: (message) => {
      invalidate()
      toast.success(message || 'Session ended')
      onEnded?.()
      onClose()
    },
    onError: (error: any) => toast.error(error.message || 'Failed to end session'),
  })

  const forceEndMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No session selected')
      const res = await adminForceEndRemoteSession(session.id, reason.trim() || undefined)
      return res
    },
    onSuccess: (res) => {
      invalidate()
      if (res.data?.closedLocally) toast.warning(res.message)
      else toast.success(res.message)
      onEnded?.()
      onClose()
    },
    onError: (error: any) => toast.error(error.message || 'Failed to force-end session'),
  })

  if (!session) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-md p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isRemote ? <Radio className="h-5 w-5 shrink-0" /> : <PlugZap className="h-5 w-5 shrink-0" />}
            {isRemote ? 'Force-end remote session' : 'End session'}
          </DialogTitle>
          <DialogDescription>
            {isRemote
              ? 'Stops the transaction on Citrine. If Citrine is unreachable the session is force-closed locally — verify the kWh/amount and settle payment afterwards.'
              : 'Ends this in-progress session like an operator would. Pricing, payment and EBM run automatically; settle any unpaid amount afterwards from the payment tools.'}
          </DialogDescription>
        </DialogHeader>

        {isRemote ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Force-ending bypasses the stale-session guard. The session ID never changes.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="force-end-reason">Reason (optional)</Label>
              <Textarea
                id="force-end-reason"
                placeholder="Why is this remote session being force-ended?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="end-kwh">Energy charged (kWh) <span className="text-red-500">*</span></Label>
              <Input
                id="end-kwh"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                max="1000"
                placeholder="e.g. 24.5"
                value={chargedKwh}
                onChange={(e) => setChargedKwh(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-soc">End SOC (%) <span className="text-red-500">*</span></Label>
              <Input
                id="end-soc"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                placeholder="0 – 100"
                value={endSoc}
                onChange={(e) => setEndSoc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-discount">Discount rate (%) — optional</Label>
              <Input
                id="end-discount"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                placeholder="0"
                value={discountRate}
                onChange={(e) => setDiscountRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Charger screen photo (optional)</Label>
              <ImageUpload
                name="admin-end-charger-screen"
                label="Capture charger screen"
                currentImage={chargerScreen ?? undefined}
                onImageChange={(_name, url) => setChargerScreen(url)}
                isRequired={false}
                classNames="w-full"
                uploadContext="session-photo"
                entityId={session.id}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {isRemote ? (
            <Button
              variant="destructive"
              onClick={() => forceEndMutation.mutate()}
              disabled={forceEndMutation.isPending}
            >
              {forceEndMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Force-end session
            </Button>
          ) : (
            <Button onClick={() => endMutation.mutate()} disabled={!endFormValid || endMutation.isPending}>
              {endMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              End session
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
