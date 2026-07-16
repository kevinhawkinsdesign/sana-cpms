'use client'

import { useState } from 'react'
import { useUserBalance, useUpdateUserBalance } from '@/lib/api/hooks/usePayments'
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PlusCircle, MinusCircle } from 'lucide-react'
import { UserSelect } from '@/components/shared/UserSelect'

export function UserBalances() {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [operation, setOperation] = useState<'add' | 'subtract'>('add')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data: balance } = useUserBalance(selectedUserId || '')
  const { mutate: updateBalance, isPending } = useUpdateUserBalance()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !amount || !description) return

    const numericAmount = operation === 'add' ? 
      Math.abs(Number(amount)) : 
      -Math.abs(Number(amount))

    updateBalance({
      userId: selectedUserId,
      data: {
        amount: numericAmount,
        description,
        currency: 'RWF'
      }
    }, {
      onSuccess: () => {
        setIsOpen(false)
        setAmount('')
        setDescription('')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
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
              onClick={() => {
                setOperation('add')
              }}
              className="flex items-center gap-2"
              disabled={!selectedUserId}
            >
              <PlusCircle className="h-4 w-4" />
              Add Balance
            </Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              onClick={() => {
                setOperation('subtract')
              }}
              className="flex items-center gap-2"
              disabled={!selectedUserId}
            >
              <MinusCircle className="h-4 w-4" />
              Subtract Balance
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {operation === 'add' ? 'Add to' : 'Subtract from'} User Balance
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount (RWF)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter reason for balance adjustment"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {operation === 'add' ? 'Add' : 'Subtract'} Balance
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedUserId && balance && (
        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance.balance.toLocaleString()} {balance.currency}
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {balance.lastTopUpDate ? new Date(balance.lastTopUpDate).toLocaleString() : 'Never'}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 