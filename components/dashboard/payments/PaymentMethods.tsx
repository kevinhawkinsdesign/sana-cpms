'use client'

import { useState } from 'react'
import { usePaymentMethods, useAddPaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod, PaymentMethod } from '@/lib/api/hooks/usePayments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { PlusCircle, Edit2, Trash2 } from 'lucide-react'
import { UserSelect } from '@/components/shared/UserSelect'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type PaymentMethodType = "MOBILE_MONEY" | "CREDIT_CARD" | "BANK_ACCOUNT" | "VOUCHER" | "OTHER"
type PaymentMethodStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "INVALID"

const PAYMENT_METHOD_TYPES: PaymentMethodType[] = ["MOBILE_MONEY", "CREDIT_CARD", "BANK_ACCOUNT", "VOUCHER", "OTHER"]
const PAYMENT_METHOD_STATUSES: PaymentMethodStatus[] = ["ACTIVE", "INACTIVE", "EXPIRED", "INVALID"]

export function PaymentMethods() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [methodId, setMethodId] = useState<string | null>(null)
  const [type, setType] = useState<PaymentMethodType>("MOBILE_MONEY")
  const [provider, setProvider] = useState('')
  const [details, setDetails] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [lastFourDigits, setLastFourDigits] = useState('')
  const [paymentGatewayToken, setPaymentGatewayToken] = useState('')

  const { data: methods, refetch: fetchPaymentMethods } = usePaymentMethods(selectedUserId || '')
  const { mutate: addPaymentMethod, isPending: isAdding } = useAddPaymentMethod()
  const { mutate: updatePaymentMethod, isPending: isUpdating } = useUpdatePaymentMethod()
  const { mutate: deletePaymentMethod, isPending: isDeleting } = useDeletePaymentMethod()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const methodData = {
        userId: selectedUserId || '',
        data: {
          type,
          provider,
          details,
          isDefault,
          ...(type === "CREDIT_CARD" && {
            expiryMonth: parseInt(expiryMonth),
            expiryYear: parseInt(expiryYear),
            lastFourDigits
          }),
          paymentGatewayToken
        }
      }

      if (methodId) {
        await updatePaymentMethod({
          id: methodId,
          data: methodData.data
        })
      } else {
        await addPaymentMethod(methodData)
      }
      resetForm()
      setIsOpen(false)
      await fetchPaymentMethods()
    } catch (error) {
      console.error('Error saving payment method:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePaymentMethod(id)
      await fetchPaymentMethods()
    } catch (error) {
      console.error('Error deleting payment method:', error)
    }
  }

  const resetForm = () => {
    setMethodId(null)
    setType("MOBILE_MONEY")
    setProvider('')
    setDetails('')
    setIsDefault(false)
    setExpiryMonth('')
    setExpiryYear('')
    setLastFourDigits('')
    setPaymentGatewayToken('')
  }

  const handleEdit = (method: PaymentMethod) => {
    setMethodId(method.id)
    setType(method.type as PaymentMethodType)
    setProvider(method.provider)
    setDetails(method.details)
    setIsDefault(method.isDefault)
    if (method.type === "CREDIT_CARD") {
      setExpiryMonth(method.expiryMonth?.toString() || '')
      setExpiryYear(method.expiryYear?.toString() || '')
      setLastFourDigits(method.lastFourDigits || '')
    }
    setPaymentGatewayToken(method.paymentGatewayToken || '')
    setIsOpen(true)
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
                resetForm()
              }}
              className="flex items-center gap-2"
              disabled={!selectedUserId}
            >
              <PlusCircle className="h-4 w-4" />
              Add Payment Method
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {methodId ? 'Edit' : 'Add'} Payment Method
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as PaymentMethodType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="e.g. MTN, VISA, etc."
                  required
                />
              </div>

              <div>
                <Label htmlFor="details">Details</Label>
                <Input
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Enter payment details"
                  required
                />
              </div>

              {type === "CREDIT_CARD" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryMonth">Expiry Month</Label>
                      <Input
                        id="expiryMonth"
                        type="number"
                        min="1"
                        max="12"
                        value={expiryMonth}
                        onChange={(e) => setExpiryMonth(e.target.value)}
                        placeholder="MM"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiryYear">Expiry Year</Label>
                      <Input
                        id="expiryYear"
                        type="number"
                        min={new Date().getFullYear()}
                        value={expiryYear}
                        onChange={(e) => setExpiryYear(e.target.value)}
                        placeholder="YYYY"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lastFourDigits">Last 4 Digits</Label>
                    <Input
                      id="lastFourDigits"
                      value={lastFourDigits}
                      onChange={(e) => setLastFourDigits(e.target.value)}
                      placeholder="1234"
                      maxLength={4}
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="paymentGatewayToken">Payment Gateway Token</Label>
                <Input
                  id="paymentGatewayToken"
                  value={paymentGatewayToken}
                  onChange={(e) => setPaymentGatewayToken(e.target.value)}
                  placeholder="Enter payment gateway token if applicable"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isDefault">Set as default payment method</Label>
              </div>

              <Button type="submit" className="w-full" disabled={isAdding || isUpdating}>
                {methodId ? 'Update' : 'Add'} Payment Method
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedUserId && methods && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {methods.map((method: PaymentMethod) => (
            <Card key={method.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{method.type.replace('_', ' ')}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(method)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(method.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Provider:</span> {method.provider}
                  </div>
                  <div>
                    <span className="font-medium">Details:</span> {method.details}
                  </div>
                  {method.type === "CREDIT_CARD" && (
                    <>
                      <div>
                        <span className="font-medium">Expiry:</span> {method.expiryMonth}/{method.expiryYear}
                      </div>
                      <div>
                        <span className="font-medium">Last 4 Digits:</span> {method.lastFourDigits}
                      </div>
                    </>
                  )}
                  {method.paymentGatewayToken && (
                    <div>
                      <span className="font-medium">Gateway Token:</span> {method.paymentGatewayToken}
                    </div>
                  )}
                  {method.isDefault && (
                    <div className="text-sm text-primary">Default Payment Method</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 