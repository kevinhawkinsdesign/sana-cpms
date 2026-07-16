'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Edit,
  MoreHorizontal,
  Battery,
  CheckCircle,
  XCircle,
  Wrench,
  Loader2,
  Cpu,
  Cable,
  ChevronDown,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getChargerWithGuns,
  addPedestalToCharger,
  addGunToCharger,
  updateGun,
  updateGunStatus,
  updatePedestal,
  deleteGun,
  deletePedestal,
  type Gun,
  type Pedestal,
  type PedestalCreateData,
  type GunCreateData,
  type GunUpdateData,
  type GunStatusUpdateData,
  type PedestalUpdateData,
} from '@/lib/api/admin'

interface GunManagementProps {
  chargerId: string
  chargerName: string
  isOpen: boolean
  onClose: () => void
}

const GunManagement: React.FC<GunManagementProps> = ({
  chargerId,
  chargerName,
  isOpen,
  onClose
}) => {
  const queryClient = useQueryClient()

  // --- Sub-dialog state ---
  const [addPedestalOpen, setAddPedestalOpen] = useState(false)
  const [addPedestalForm, setAddPedestalForm] = useState({ name: '', onlineStatus: 'OFFLINE' as 'OFFLINE' | 'ONLINE', citrineChargerId: '' })

  const [addGunOpen, setAddGunOpen] = useState(false)
  const [addGunForm, setAddGunForm] = useState({ name: '', pedestalId: '', gunNumber: '', citrineConnectorId: '' })

  const [editGunOpen, setEditGunOpen] = useState(false)
  const [editGunTarget, setEditGunTarget] = useState<Gun | null>(null)
  const [editGunForm, setEditGunForm] = useState({ name: '', gunNumber: '', citrineConnectorId: '' })

  const [editPedestalOpen, setEditPedestalOpen] = useState(false)
  const [editPedestalTarget, setEditPedestalTarget] = useState<Pedestal | null>(null)
  const [editPedestalForm, setEditPedestalForm] = useState({ name: '', onlineStatus: 'OFFLINE' as 'OFFLINE' | 'ONLINE', citrineChargerId: '' })

  const [deleteGunOpen, setDeleteGunOpen] = useState(false)
  const [deleteGunTarget, setDeleteGunTarget] = useState<Gun | null>(null)
  const [deleteGunTargetId, setDeleteGunTargetId] = useState('')

  const [deletePedestalOpen, setDeletePedestalOpen] = useState(false)
  const [deletePedestalTarget, setDeletePedestalTarget] = useState<Pedestal | null>(null)
  const [deletePedestalTargetId, setDeletePedestalTargetId] = useState('')

  const [expandedPedestals, setExpandedPedestals] = useState<Set<string>>(new Set())

  // --- Data ---
  const { data: chargerData, isLoading } = useQuery({
    queryKey: ['chargerWithGuns', chargerId],
    queryFn: () => getChargerWithGuns(chargerId),
    enabled: isOpen && !!chargerId
  })

  const pedestals: Pedestal[] = chargerData?.data?.pedestals || []

  // Auto-expand all pedestals on load
  useEffect(() => {
    if (pedestals.length > 0) {
      setExpandedPedestals(new Set(pedestals.map(p => p.id)))
    }
  }, [pedestals.length])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['chargerWithGuns', chargerId] })
    queryClient.invalidateQueries({ queryKey: ['chargers'] })
    queryClient.invalidateQueries({ queryKey: ['charger', chargerId] })
  }

  // --- Mutations ---
  const addPedestalMutation = useMutation({
    mutationFn: (data: PedestalCreateData) => addPedestalToCharger(chargerId, data),
    onSuccess: () => {
      invalidateAll()
      toast.success('Pedestal added')
      setAddPedestalOpen(false)
      setAddPedestalForm({ name: '', onlineStatus: 'OFFLINE', citrineChargerId: '' })
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add pedestal')
  })

  const addGunMutation = useMutation({
    mutationFn: (data: GunCreateData) => addGunToCharger(chargerId, data),
    onSuccess: () => { invalidateAll(); toast.success('Gun added'); setAddGunOpen(false); setAddGunForm({ name: '', pedestalId: '', gunNumber: '', citrineConnectorId: '' }) },
    onError: (e: any) => toast.error(e.message || 'Failed to add gun')
  })

  const updateGunMutation = useMutation({
    mutationFn: ({ gunId, data }: { gunId: string; data: GunUpdateData }) => updateGun(chargerId, gunId, data),
    onSuccess: () => { invalidateAll(); toast.success('Gun updated'); setEditGunOpen(false); setEditGunTarget(null) },
    onError: (e: any) => toast.error(e.message || 'Failed to update gun')
  })

  const updateGunStatusMutation = useMutation({
    mutationFn: ({ gunId, data }: { gunId: string; data: GunStatusUpdateData }) => updateGunStatus(gunId, data),
    onSuccess: () => { invalidateAll(); toast.success('Status updated') },
    onError: (e: any) => toast.error(e.message || 'Failed to update status')
  })

  const updatePedestalMutation = useMutation({
    mutationFn: ({ pedestalId, data }: { pedestalId: string; data: PedestalUpdateData }) => updatePedestal(pedestalId, data),
    onSuccess: () => { invalidateAll(); toast.success('Pedestal updated'); setEditPedestalOpen(false); setEditPedestalTarget(null) },
    onError: (e: any) => toast.error(e.message || 'Failed to update pedestal')
  })

  const deleteGunMutation = useMutation({
    mutationFn: ({ gunId, targetGunId }: { gunId: string; targetGunId: string }) => deleteGun(gunId, targetGunId),
    onSuccess: () => { invalidateAll(); toast.success('Gun deleted'); setDeleteGunOpen(false); setDeleteGunTarget(null); setDeleteGunTargetId('') },
    onError: (e: any) => toast.error(e.message || 'Failed to delete gun')
  })

  const deletePedestalMutation = useMutation({
    mutationFn: ({ pedestalId, targetPedestalId }: { pedestalId: string; targetPedestalId: string | null }) => deletePedestal(pedestalId, targetPedestalId),
    onSuccess: () => { invalidateAll(); toast.success('Pedestal deleted'); setDeletePedestalOpen(false); setDeletePedestalTarget(null); setDeletePedestalTargetId('') },
    onError: (e: any) => toast.error(e.message || 'Failed to delete pedestal')
  })

  // --- Handlers ---
  const openEditGun = (gun: Gun, pedestal?: Pedestal) => {
    setEditGunTarget(gun)
    setEditGunForm({
      name: gun.name || '',
      gunNumber: gun.gunNumber ?? '',
      citrineConnectorId: gun.citrineConnectorId ?? '',
    })
    setEditGunOpen(true)
  }

  const openEditPedestal = (p: Pedestal) => {
    setEditPedestalTarget(p)
    setEditPedestalForm({
      name: p.name ?? '',
      onlineStatus: p.onlineStatus ?? 'OFFLINE',
      citrineChargerId: p.citrineChargerId ?? '',
    })
    setEditPedestalOpen(true)
  }

  const handleSaveGun = () => {
    if (!editGunTarget) return
    const data: GunUpdateData = {}
    if (editGunForm.name.trim() !== (editGunTarget.name || '')) data.name = editGunForm.name.trim()
    if (editGunForm.gunNumber.trim() !== (editGunTarget.gunNumber ?? '')) data.gunNumber = editGunForm.gunNumber.trim()
    if (editGunForm.citrineConnectorId.trim() !== (editGunTarget.citrineConnectorId ?? '')) data.citrineConnectorId = editGunForm.citrineConnectorId.trim()
    if (Object.keys(data).length === 0) { toast.info('No changes'); return }
    updateGunMutation.mutate({ gunId: editGunTarget.id, data })
  }

  const handleSavePedestal = () => {
    if (!editPedestalTarget) return
    const data: PedestalUpdateData = {
      name: editPedestalForm.name.trim(),
      onlineStatus: editPedestalForm.onlineStatus,
      citrineChargerId: editPedestalForm.citrineChargerId.trim(),
    }
    updatePedestalMutation.mutate({ pedestalId: editPedestalTarget.id, data })
  }

  const togglePedestal = (id: string) => {
    setExpandedPedestals(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // --- Helpers ---
  const statusColor = (s: string) => {
    if (s === 'AVAILABLE') return 'bg-green-100 text-green-800'
    if (s === 'IN_USE') return 'bg-blue-100 text-blue-800'
    if (s === 'UNDER_MAINTENANCE') return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }
  const statusIcon = (s: string) => {
    if (s === 'AVAILABLE') return <CheckCircle className="h-3.5 w-3.5 text-green-500" />
    if (s === 'IN_USE') return <Battery className="h-3.5 w-3.5 text-blue-500" />
    if (s === 'UNDER_MAINTENANCE') return <Wrench className="h-3.5 w-3.5 text-yellow-500" />
    return <XCircle className="h-3.5 w-3.5 text-gray-500" />
  }
  const nextStatuses = (cur: string) => {
    if (cur === 'AVAILABLE') return ['IN_USE', 'UNDER_MAINTENANCE']
    if (cur === 'IN_USE') return ['AVAILABLE']
    if (cur === 'UNDER_MAINTENANCE') return ['AVAILABLE']
    return ['AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE']
  }

  return (
    <>
      {/* === Main Dialog === */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Pedestals &amp; Guns - {chargerName}
            </DialogTitle>
            <DialogDescription>
              Manage pedestals and guns for this charger. Click a pedestal to expand its guns.
            </DialogDescription>
          </DialogHeader>

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { setAddPedestalForm({ name: '', onlineStatus: 'OFFLINE', citrineChargerId: '' }); setAddPedestalOpen(true) }}>
              <Plus className="h-4 w-4 mr-1" /> Add Pedestal
            </Button>
            <Button size="sm" onClick={() => { setAddGunForm({ name: '', pedestalId: '', gunNumber: '', citrineConnectorId: '' }); setAddGunOpen(true) }}>
              <Plus className="h-4 w-4 mr-1" /> Add Gun
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pedestals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Cpu className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="mb-3">No pedestals yet.</p>
              <Button size="sm" variant="outline" onClick={() => { setAddPedestalForm({ name: '', onlineStatus: 'OFFLINE', citrineChargerId: '' }); setAddPedestalOpen(true) }}>
                <Plus className="h-4 w-4 mr-1" /> Add Pedestal
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {pedestals.map((pedestal) => {
                const guns = pedestal.guns ?? []
                const isExpanded = expandedPedestals.has(pedestal.id)
                return (
                  <div key={pedestal.id} className="border rounded-lg overflow-hidden">
                    {/* Pedestal header */}
                    <div className="flex w-full items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                        onClick={() => togglePedestal(pedestal.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePedestal(pedestal.id) } }}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                        <Cpu className="h-4 w-4 text-purple-500 shrink-0" />
                        <span className="font-medium text-sm flex-1 truncate">{pedestal.name || 'Unnamed Pedestal'}</span>
                        <Badge variant={pedestal.onlineStatus === 'ONLINE' ? 'default' : 'secondary'} className="text-xs">
                          {pedestal.onlineStatus}
                        </Badge>
                        {pedestal.citrineChargerId && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">Citrine: {pedestal.citrineChargerId}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{guns.length} gun{guns.length !== 1 ? 's' : ''}</span>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2"
                        onClick={() => openEditPedestal(pedestal)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-red-500 hover:text-red-700"
                        onClick={() => { setDeletePedestalTarget(pedestal); setDeletePedestalTargetId(''); setDeletePedestalOpen(true) }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Guns list */}
                    {isExpanded && (
                      <div className="px-4 py-2 space-y-1.5 bg-white">
                        {guns.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No guns on this pedestal</p>
                        ) : (
                          guns.map((gun) => (
                            <div key={gun.id} className="flex items-center gap-3 rounded-md border px-3 py-2 hover:bg-gray-50 transition-colors">
                              <Cable className="h-4 w-4 text-blue-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{gun.name || 'Unnamed Gun'}</span>
                                  {gun.gunNumber && <span className="text-xs text-muted-foreground">#{gun.gunNumber}</span>}
                                  <span className="text-xs text-muted-foreground">({gun.kabisaId})</span>
                                </div>
                                {gun.citrineConnectorId && (
                                  <p className="text-xs text-muted-foreground">Citrine connector: {gun.citrineConnectorId}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {statusIcon(gun.chargingStatus)}
                                <Badge className={`text-xs ${statusColor(gun.chargingStatus)}`}>
                                  {gun.chargingStatus.replace('_', ' ')}
                                </Badge>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditGun(gun, pedestal)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit Gun
                                  </DropdownMenuItem>
                                  {nextStatuses(gun.chargingStatus).map((s) => (
                                    <DropdownMenuItem key={s} onClick={() => updateGunStatusMutation.mutate({ gunId: gun.id, data: { chargingStatus: s as any } })}>
                                      {statusIcon(s)}
                                      <span className="ml-2">Set {s.replace('_', ' ')}</span>
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => { setDeleteGunTarget(gun); setDeleteGunTargetId(''); setDeleteGunOpen(true) }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete Gun
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Add Pedestal Dialog === */}
      <Dialog open={addPedestalOpen} onOpenChange={(open) => { if (!open) { setAddPedestalOpen(false); setAddPedestalForm({ name: '', onlineStatus: 'OFFLINE', citrineChargerId: '' }) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" /> Add Pedestal to {chargerName}
            </DialogTitle>
            <DialogDescription>
              Create a new pedestal. You can add guns to it afterwards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="add-pedestal-name" className="text-sm font-medium">Name</label>
              <Input
                id="add-pedestal-name"
                placeholder="e.g. Pedestal A, Left Side"
                value={addPedestalForm.name}
                onChange={(e) => setAddPedestalForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="add-pedestal-status" className="text-sm font-medium">Online Status</label>
              <Select
                value={addPedestalForm.onlineStatus}
                onValueChange={(v: 'OFFLINE' | 'ONLINE') => setAddPedestalForm(f => ({ ...f, onlineStatus: v }))}
              >
                <SelectTrigger id="add-pedestal-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFLINE">OFFLINE</SelectItem>
                  <SelectItem value="ONLINE">ONLINE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="add-pedestal-citrine" className="text-sm font-medium">
                Citrine Charger ID
                {addPedestalForm.onlineStatus === 'ONLINE'
                  ? <span className="text-xs text-muted-foreground ml-1">(recommended for session sync)</span>
                  : <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
              </label>
              <Input
                id="add-pedestal-citrine"
                placeholder={addPedestalForm.onlineStatus === 'ONLINE' ? 'Remote charger ID for Citrine sync' : 'Optional'}
                value={addPedestalForm.citrineChargerId}
                onChange={(e) => setAddPedestalForm(f => ({ ...f, citrineChargerId: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPedestalOpen(false)}>Cancel</Button>
            <Button
              disabled={addPedestalMutation.isPending}
              onClick={() => {
                const payload: PedestalCreateData = { onlineStatus: addPedestalForm.onlineStatus }
                if (addPedestalForm.name.trim()) payload.name = addPedestalForm.name.trim()
                if (addPedestalForm.citrineChargerId.trim()) payload.citrineChargerId = addPedestalForm.citrineChargerId.trim()
                addPedestalMutation.mutate(payload)
              }}
            >
              {addPedestalMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Adding...</>
                : <><Plus className="h-4 w-4 mr-1" /> Add Pedestal</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Add Gun Dialog === */}
      <Dialog open={addGunOpen} onOpenChange={setAddGunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Gun to {chargerName}</DialogTitle>
            <DialogDescription>Fill in gun details and select the pedestal.</DialogDescription>
          </DialogHeader>
          {(() => {
            const selectedPedestal = pedestals.find(p => p.id === addGunForm.pedestalId)
            const isOnlinePedestal = selectedPedestal?.onlineStatus === 'ONLINE'
            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="add-gun-pedestal" className="text-sm font-medium">Pedestal <span className="text-red-500">*</span></label>
                  <Select
                    value={addGunForm.pedestalId}
                    onValueChange={(v) => setAddGunForm(f => ({ ...f, pedestalId: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a pedestal" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (first available)</SelectItem>
                      {pedestals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name || 'Unnamed'} — {p.onlineStatus}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="add-gun-name" className="text-sm font-medium">Gun Name</label>
                    <Input
                      id="add-gun-name"
                      placeholder="e.g. Gun 1, CCS-A"
                      value={addGunForm.name}
                      onChange={(e) => setAddGunForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="add-gun-number" className="text-sm font-medium">Gun Number (label)</label>
                    <Input
                      id="add-gun-number"
                      placeholder="e.g. 1, A, GBT-B"
                      value={addGunForm.gunNumber}
                      onChange={(e) => setAddGunForm(f => ({ ...f, gunNumber: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="add-gun-citrine" className="text-sm font-medium">
                    Citrine Connector ID
                    {isOnlinePedestal ? <span className="text-red-500 ml-0.5">*</span> : <span className="text-xs text-muted-foreground ml-1">(optional for offline)</span>}
                  </label>
                  <Input
                    id="add-gun-citrine"
                    placeholder="Remote connector ID for session sync"
                    value={addGunForm.citrineConnectorId}
                    onChange={(e) => setAddGunForm(f => ({ ...f, citrineConnectorId: e.target.value }))}
                  />
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGunOpen(false)}>Cancel</Button>
            <Button disabled={addGunMutation.isPending} onClick={() => {
              const payload: GunCreateData = {}
              if (addGunForm.name.trim()) payload.name = addGunForm.name.trim()
              if (addGunForm.gunNumber.trim()) payload.gunNumber = addGunForm.gunNumber.trim()
              if (addGunForm.citrineConnectorId.trim()) payload.citrineConnectorId = addGunForm.citrineConnectorId.trim()
              if (addGunForm.pedestalId && addGunForm.pedestalId !== 'auto') payload.pedestalId = addGunForm.pedestalId
              addGunMutation.mutate(payload)
            }}>
              {addGunMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Adding...</> : <><Plus className="h-4 w-4 mr-1" /> Add Gun</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Edit Gun Dialog === */}
      <Dialog open={editGunOpen} onOpenChange={setEditGunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gun</DialogTitle>
            <DialogDescription>
              {editGunTarget && <>Kabisa ID: {editGunTarget.kabisaId}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="edit-gun-name" className="text-sm font-medium">Name</label>
              <Input id="edit-gun-name" value={editGunForm.name} onChange={(e) => setEditGunForm(f => ({ ...f, name: e.target.value }))} placeholder="Gun name" />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-gun-number" className="text-sm font-medium">Gun Number (display label)</label>
              <Input id="edit-gun-number" value={editGunForm.gunNumber} onChange={(e) => setEditGunForm(f => ({ ...f, gunNumber: e.target.value }))} placeholder="e.g. 1, A, CCS-B" />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-gun-citrine" className="text-sm font-medium">Citrine Connector ID</label>
              <Input id="edit-gun-citrine" value={editGunForm.citrineConnectorId} onChange={(e) => setEditGunForm(f => ({ ...f, citrineConnectorId: e.target.value }))} placeholder="Remote connector ID" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGunOpen(false)}>Cancel</Button>
            <Button disabled={updateGunMutation.isPending} onClick={handleSaveGun}>
              {updateGunMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Edit Pedestal Dialog (with guns preview) === */}
      <Dialog open={editPedestalOpen} onOpenChange={(open) => { if (!open) { setEditPedestalOpen(false); setEditPedestalTarget(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Pedestal</DialogTitle>
            <DialogDescription>
              Update pedestal settings. Citrine ID is optional for offline pedestals.
            </DialogDescription>
          </DialogHeader>
          {editPedestalTarget && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="edit-pedestal-name" className="text-sm font-medium">Name</label>
                <Input id="edit-pedestal-name" value={editPedestalForm.name} onChange={(e) => setEditPedestalForm(f => ({ ...f, name: e.target.value }))} placeholder="Pedestal name" />
              </div>
              <div className="space-y-1">
                <label htmlFor="edit-pedestal-status" className="text-sm font-medium">Online Status</label>
                <Select value={editPedestalForm.onlineStatus} onValueChange={(v: 'OFFLINE' | 'ONLINE') => setEditPedestalForm(f => ({ ...f, onlineStatus: v }))}>
                  <SelectTrigger id="edit-pedestal-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFLINE">OFFLINE</SelectItem>
                    <SelectItem value="ONLINE">ONLINE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="edit-pedestal-citrine" className="text-sm font-medium">
                  Citrine Charger ID
                  {editPedestalForm.onlineStatus === 'OFFLINE' && <span className="text-xs text-muted-foreground ml-1">(optional for offline)</span>}
                </label>
                <Input
                  id="edit-pedestal-citrine"
                  value={editPedestalForm.citrineChargerId}
                  onChange={(e) => setEditPedestalForm(f => ({ ...f, citrineChargerId: e.target.value }))}
                  placeholder={editPedestalForm.onlineStatus === 'OFFLINE' ? 'Optional' : 'Required for session sync'}
                />
              </div>

              {/* Guns on this pedestal */}
              <div>
                <label className="text-sm font-medium mb-2 block">Guns on this pedestal</label>
                {(editPedestalTarget.guns ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No guns</p>
                ) : (
                  <div className="space-y-1.5">
                    {(editPedestalTarget.guns ?? []).map((gun) => (
                      <div key={gun.id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                        <Cable className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="flex-1 truncate">{gun.name || gun.kabisaId}</span>
                        {gun.gunNumber && <span className="text-xs text-muted-foreground">#{gun.gunNumber}</span>}
                        <Badge className={`text-xs ${statusColor(gun.chargingStatus)}`}>{gun.chargingStatus.replace('_', ' ')}</Badge>
                        <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => { setEditPedestalOpen(false); setEditPedestalTarget(null); openEditGun(gun, editPedestalTarget) }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditPedestalOpen(false); setEditPedestalTarget(null) }}>Cancel</Button>
            <Button disabled={updatePedestalMutation.isPending} onClick={handleSavePedestal}>
              {updatePedestalMutation.isPending ? 'Saving...' : 'Save Pedestal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Delete Gun Dialog === */}
      <Dialog open={deleteGunOpen} onOpenChange={(open) => { if (!open) { setDeleteGunOpen(false); setDeleteGunTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Delete Gun
            </DialogTitle>
            <DialogDescription>
              All sessions from <strong>{deleteGunTarget?.name || deleteGunTarget?.kabisaId}</strong> will be reassigned to the selected gun. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">Reassign sessions to:</label>
            <Select value={deleteGunTargetId} onValueChange={setDeleteGunTargetId}>
              <SelectTrigger><SelectValue placeholder="Select a gun to receive sessions" /></SelectTrigger>
              <SelectContent>
                {pedestals.flatMap(p => (p.guns ?? [])
                  .filter(g => g.id !== deleteGunTarget?.id)
                  .map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name || g.kabisaId} ({p.name || 'Unnamed Pedestal'})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteGunOpen(false); setDeleteGunTarget(null) }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!deleteGunTargetId || deleteGunMutation.isPending}
              onClick={() => deleteGunTarget && deleteGunMutation.mutate({ gunId: deleteGunTarget.id, targetGunId: deleteGunTargetId })}
            >
              {deleteGunMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4 mr-1" /> Delete Gun</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Delete Pedestal Dialog === */}
      <Dialog open={deletePedestalOpen} onOpenChange={(open) => { if (!open) { setDeletePedestalOpen(false); setDeletePedestalTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Delete Pedestal
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const otherPedestals = pedestals.filter(p => p.id !== deletePedestalTarget?.id)
                const gunCount = (deletePedestalTarget?.guns ?? []).length
                if (otherPedestals.length === 0) {
                  return <>This is the only pedestal on this charger. Deleting it will also remove its {gunCount} gun{gunCount !== 1 ? 's' : ''}. Sessions linked to this pedestal will remain in history but will no longer reference active equipment.</>
                }
                return <>All sessions and guns from <strong>{deletePedestalTarget?.name || 'this pedestal'}</strong> ({gunCount} gun{gunCount !== 1 ? 's' : ''}) will be reassigned to the selected pedestal. This action cannot be undone.</>
              })()}
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const otherPedestals = pedestals.filter(p => p.id !== deletePedestalTarget?.id)
            const isLastPedestal = otherPedestals.length === 0
            return (
              <>
                {!isLastPedestal && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Reassign sessions to pedestal:</label>
                    <Select value={deletePedestalTargetId} onValueChange={setDeletePedestalTargetId}>
                      <SelectTrigger><SelectValue placeholder="Select a pedestal to receive sessions" /></SelectTrigger>
                      <SelectContent>
                        {otherPedestals.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name || 'Unnamed Pedestal'} ({(p.guns ?? []).length} gun{(p.guns ?? []).length !== 1 ? 's' : ''})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {deletePedestalTargetId && (pedestals.find(p => p.id === deletePedestalTargetId)?.guns ?? []).length === 0 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Target pedestal has no guns. Pedestal-level sessions will be reassigned, but gun-level session references cannot be remapped.
                      </p>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setDeletePedestalOpen(false); setDeletePedestalTarget(null) }}>Cancel</Button>
                  <Button
                    variant="destructive"
                    disabled={(!isLastPedestal && !deletePedestalTargetId) || deletePedestalMutation.isPending}
                    onClick={() => deletePedestalTarget && deletePedestalMutation.mutate({
                      pedestalId: deletePedestalTarget.id,
                      targetPedestalId: isLastPedestal ? null : deletePedestalTargetId
                    })}
                  >
                    {deletePedestalMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4 mr-1" /> Delete Pedestal</>}
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default GunManagement
