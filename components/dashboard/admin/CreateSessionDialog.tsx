'use client'

import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChargerSelect } from '@/components/ui/ChargerSelect'
import { UserSelect } from '@/components/shared/UserSelect'
import { createSession, type CreateSessionPayload } from '@/lib/api/admin'

interface CreateSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

const STATUSES = ['COMPLETED', 'PAID', 'EBM_ISSUED', 'CANCELLED', 'REFUNDED', 'STARTED', 'PAUSED'] as const

// datetime-local value ("2026-07-10T14:30") → ISO string in the browser's timezone.
function toIso(local: string): string | undefined {
  if (!local) return undefined
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

function numOrUndef(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

export const CreateSessionDialog: React.FC<CreateSessionDialogProps> = ({ open, onOpenChange, onCreated }) => {
  const queryClient = useQueryClient()

  const [chargerId, setChargerId] = React.useState('')
  const [operatorId, setOperatorId] = React.useState<string | null>(null)
  const [licensePlate, setLicensePlate] = React.useState('')
  const [startSoc, setStartSoc] = React.useState('')
  const [endSoc, setEndSoc] = React.useState('')
  const [startTime, setStartTime] = React.useState('')
  const [endTime, setEndTime] = React.useState('')
  const [chargedKwh, setChargedKwh] = React.useState('')
  const [meterStart, setMeterStart] = React.useState('')
  const [meterEnd, setMeterEnd] = React.useState('')
  const [ratePerKwh, setRatePerKwh] = React.useState('')
  const [totalAmount, setTotalAmount] = React.useState('')
  const [status, setStatus] = React.useState<string>('COMPLETED')
  const [customerName, setCustomerName] = React.useState('')
  const [customerPhone, setCustomerPhone] = React.useState('')
  const [carModelMake, setCarModelMake] = React.useState('')
  const [description, setDescription] = React.useState('')

  const reset = () => {
    setChargerId(''); setOperatorId(null); setLicensePlate(''); setStartSoc(''); setEndSoc('')
    setStartTime(''); setEndTime(''); setChargedKwh(''); setMeterStart(''); setMeterEnd('')
    setRatePerKwh(''); setTotalAmount(''); setStatus('COMPLETED'); setCustomerName('')
    setCustomerPhone(''); setCarModelMake(''); setDescription('')
  }

  // Clear the form whenever the dialog closes (cancel, esc, overlay) so a reopen
  // starts fresh instead of showing the previous entry.
  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const socValue = numOrUndef(startSoc)
  const socValid = socValue != null && socValue >= 0 && socValue <= 100
  const endSocValue = numOrUndef(endSoc)
  const endSocValid = endSoc.trim() === '' || (endSocValue != null && endSocValue >= 0 && endSocValue <= 100)
  const endBeforeStart = !!(startTime && endTime && new Date(endTime) < new Date(startTime))
  const canSubmit = !!chargerId && !!operatorId && socValid && endSocValid && !!startTime && !endBeforeStart

  const mutation = useMutation({
    mutationFn: (payload: CreateSessionPayload) => createSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSessions'] })
      queryClient.invalidateQueries({ queryKey: ['adminSessionStats'] })
      toast.success('Session created')
      handleOpenChange(false)
      onCreated?.()
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create session'),
  })

  const submit = () => {
    const startIso = toIso(startTime)
    if (!canSubmit || !operatorId || socValue == null || !startIso) return
    mutation.mutate({
      chargerId,
      operatorId,
      licensePlate: licensePlate.trim() || undefined,
      startSoc: socValue,
      endSoc: endSocValue,
      chargedKwh: numOrUndef(chargedKwh),
      startTime: startIso,
      endTime: toIso(endTime),
      meterStart: numOrUndef(meterStart),
      meterEnd: numOrUndef(meterEnd),
      ratePerKwh: numOrUndef(ratePerKwh),
      totalAmount: numOrUndef(totalAmount),
      sessionStatus: status as CreateSessionPayload['sessionStatus'],
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      carModelMake: carModelMake.trim() || undefined,
      description: description.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create session</DialogTitle>
          <DialogDescription>
            Manually record a charging session with its start-to-end details. Amounts default
            from the meter reading and rate when left blank.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Charger <span className="text-red-500">*</span></Label>
              <ChargerSelect value={chargerId} onValueChange={setChargerId} />
            </div>
            <div className="space-y-1.5">
              <Label>Operator <span className="text-red-500">*</span></Label>
              <UserSelect userType="OPERATOR" value={operatorId} onUserSelect={setOperatorId} placeholder="Select an operator..." />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cs-start">Start time <span className="text-red-500">*</span></Label>
              <Input id="cs-start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-end">End time</Label>
              <Input id="cs-end" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              {endBeforeStart && <p className="text-xs text-red-500">End time cannot be before start time.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="cs-ssoc">Start SOC % <span className="text-red-500">*</span></Label>
              <Input id="cs-ssoc" type="number" min={0} max={100} value={startSoc} onChange={(e) => setStartSoc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-esoc">End SOC %</Label>
              <Input id="cs-esoc" type="number" min={0} max={100} value={endSoc} onChange={(e) => setEndSoc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-kwh">Charged kWh</Label>
              <Input id="cs-kwh" type="number" min={0} value={chargedKwh} onChange={(e) => setChargedKwh(e.target.value)} placeholder="or from meter" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="cs-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="cs-mstart">Meter start</Label>
              <Input id="cs-mstart" type="number" min={0} value={meterStart} onChange={(e) => setMeterStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-mend">Meter end</Label>
              <Input id="cs-mend" type="number" min={0} value={meterEnd} onChange={(e) => setMeterEnd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-rate">Rate / kWh</Label>
              <Input id="cs-rate" type="number" min={0} value={ratePerKwh} onChange={(e) => setRatePerKwh(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-amount">Total (RWF)</Label>
              <Input id="cs-amount" type="number" min={0} value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="or rate×kWh" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cs-plate">License plate</Label>
              <Input id="cs-plate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="RAD 123 A" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-cname">Customer name</Label>
              <Input id="cs-cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-cphone">Customer phone</Label>
              <Input id="cs-cphone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="7…" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cs-model">Car make / model</Label>
              <Input id="cs-model" value={carModelMake} onChange={(e) => setCarModelMake(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-desc">Description</Label>
              <Input id="cs-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional note" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button onClick={submit} disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Creating…</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Create session</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
