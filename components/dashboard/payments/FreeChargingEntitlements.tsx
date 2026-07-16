'use client'

import { useState } from 'react'
import { useEntitlements, useAddEntitlement } from '@/lib/api/hooks/usePayments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlusCircle } from 'lucide-react'
import { UserSelect } from '@/components/shared/UserSelect'

export function FreeChargingEntitlements() {
  const [isOpen, setIsOpen] = useState(false)
  const [validUntil, setValidUntil] = useState('')
  const [reason, setReason] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data: entitlements } = useEntitlements(selectedUserId || '')
  const { mutate: addEntitlement, isPending: isAdding } = useAddEntitlement()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !validUntil || !reason) return

    addEntitlement({
      userId: selectedUserId,
      data: {
        expiryDate: validUntil,
        description: reason,
      }
    }, {
      onSuccess: () => {
        setIsOpen(false)
        setValidUntil('')
        setReason('')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="w-96">
          <UserSelect
            onUserSelect={setSelectedUserId}
            userType="CUSTOMER"
            placeholder="Select customer..."
          />
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              className="flex items-center gap-2"
              disabled={!selectedUserId}
            >
              <PlusCircle className="h-4 w-4" />
              Add Entitlement
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Free Charging Entitlement</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="datetime-local"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for free charging entitlement"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isAdding}>
                Add Entitlement
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedUserId && entitlements && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Valid Until</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entitlements.map((entitlement: { id: string; validUntil: string }) => (
              <TableRow key={entitlement.id}>
                <TableCell>
                  {new Date(entitlement.validUntil).toLocaleString()}
                </TableCell>
                <TableCell>{entitlement.validUntil}</TableCell>
                <TableCell>
                  {new Date(entitlement.validUntil) > new Date() ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Expired</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
} 