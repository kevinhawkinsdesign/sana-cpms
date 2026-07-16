import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, AlertCircle } from 'lucide-react';
import Image from 'next/image';

function formatCardNumber(value: string) {
  return value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function getMobileProviderImage(provider: string) {
  if (!provider) return '/payment methods/MobileMoney.svg';
  switch (provider.toLowerCase()) {
    case 'mtn': return '/payment methods/mtn.svg';
    case 'airtel': return '/payment methods/airtel.svg';
    default: return '/payment methods/MobileMoney.svg';
  }
}

function getCardImage(brand: string) {
  if (!brand) return '/payment methods/generic-card.svg';
  switch (brand.toLowerCase()) {
    case 'visa': return '/payment methods/visa.svg';
    case 'mastercard': return '/payment methods/mastercard.svg';
    case 'amex':
    case 'american express': return '/payment methods/amex.svg';
    case 'discover': return '/payment methods/discover.svg';
    case 'jcb': return '/payment methods/jcb.svg';
    default: return '/payment methods/generic-card.svg';
  }
}

const PaymentMethodForm = ({
  selectedType,
  formData,
  onChange,
  onSubmit,
  isLoading,
  cardBrand,
  isValidatingCard,
  mobileProvider,
  paymentMethods,
  balance
}: any) => {
  return (
    <form onSubmit={onSubmit} className="space-y-2 py-2">
      <div className="flex items-center justify-center mb-2">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center relative">
          {selectedType.type === 'CREDIT_CARD' ? (
            <>
              <Image
                src={getCardImage(cardBrand)}
                alt={cardBrand !== 'unknown' ? cardBrand : 'Credit Card'}
                width={48}
                height={48}
                className="object-contain rounded-full"
              />
              {isValidatingCard && (
                <div className="absolute inset-0 bg-blue-50/80 rounded-full flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </>
          ) : selectedType.type === 'MOBILE_MONEY' ? (
            <Image
              src={getMobileProviderImage(mobileProvider)}
              alt={mobileProvider || 'Mobile Money'}
              width={48}
              height={48}
              className="object-contain rounded-full"
            />
          ) : selectedType.type === 'BALANCE' ? (
            <Wallet className="w-8 h-8 text-blue-500" />
          ) : (
            <Image
              src={selectedType.type === 'CREDIT_CARD' ? '/payment methods/visa.svg' : '/payment methods/MobileMoney.svg'}
              alt={selectedType.displayName}
              width={48}
              height={48}
              className="object-contain rounded-full"
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {selectedType.type === 'CREDIT_CARD' && (
          <>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cardNumber" className="text-sm font-medium text-gray-700 flex items-center">
                Card Number <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  type="text"
                  value={formatCardNumber(formData.cardNumber || '')}
                  onChange={e => onChange('cardNumber', e.target.value)}
                  required
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-[#083464] focus-visible:border-[#083464] text-left"
                  autoComplete="cc-number"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cardHolderName" className="text-sm font-medium text-gray-700 flex items-center">
                Cardholder Name <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="cardHolderName"
                type="text"
                value={formData.cardHolderName || ''}
                onChange={e => onChange('cardHolderName', e.target.value)}
                required
                placeholder="John Doe"
                className="rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-[#083464] focus-visible:border-[#083464] text-left"
                autoComplete="cc-name"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 flex items-center">
                Phone Number <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber || ''}
                  onChange={e => onChange('phoneNumber', e.target.value)}
                  required
                  placeholder="07X XXX XXXX"
                  className="rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-[#083464] focus-visible:border-[#083464] text-left"
                  autoComplete="tel"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryMonth" className="text-sm font-medium text-gray-700 flex items-center">
                Expiry Month <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="expiryMonth"
                type="text"
                inputMode="numeric"
                value={formData.expiryMonth || ''}
                onChange={e => onChange('expiryMonth', e.target.value)}
                required
                placeholder="MM"
                maxLength={2}
                className="rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-[#083464] focus-visible:border-[#083464] text-left"
                autoComplete="cc-exp-month"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryYear" className="text-sm font-medium text-gray-700 flex items-center">
                Expiry Year <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="expiryYear"
                type="text"
                inputMode="numeric"
                value={formData.expiryYear || ''}
                onChange={e => onChange('expiryYear', e.target.value)}
                required
                placeholder="YY"
                maxLength={2}
                className="rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-[#083464] focus-visible:border-[#083464] text-left"
                autoComplete="cc-exp-year"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv" className="text-sm font-medium text-gray-700 flex items-center">
                CVV <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="cvv"
                  type="text"
                  inputMode="numeric"
                  value={formData.cvv || ''}
                  onChange={e => onChange('cvv', e.target.value)}
                  required
                  placeholder={cardBrand === 'amex' ? '4 digits' : '3 digits'}
                  maxLength={cardBrand === 'amex' ? 4 : 3}
                  className="rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-[#083464] focus-visible:border-[#083464] text-left"
                  autoComplete="cc-csc"
                />
                <button 
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title={cardBrand === 'amex' ? '4-digit security code on the front of your card' : '3-digit security code on the back of your card'}
                >
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
        {selectedType.type === 'MOBILE_MONEY' && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 flex items-center">
              Phone Number <span className="text-red-500 ml-1">*</span>
            </Label>
            <div className="relative">
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber || ''}
                onChange={e => onChange('phoneNumber', e.target.value)}
                required
                placeholder="07X XXX XXXX"
                className="rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-[#083464] focus-visible:border-[#083464] text-left"
                autoComplete="tel"
              />
            </div>
          </div>
        )}
        {selectedType.type === 'BALANCE' && (
          <>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700 flex items-center">
                Amount <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  value={formData.amount || ''}
                  onChange={e => onChange('amount', e.target.value)}
                  required
                  placeholder="Enter amount"
                  className="rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-[#083464] focus-visible:border-[#083464] text-left"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              </div>
              {balance && (
                <p className="text-xs text-blue-600 flex items-center">
                  <span className="w-3 h-3 mr-1 inline-block">•</span> Available balance: {balance.balance.toLocaleString()} {balance.currency}
                </p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="currency" className="text-sm font-medium text-gray-700 flex items-center">
                Currency <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="currency"
                type="text"
                value={formData.currency || ''}
                onChange={e => onChange('currency', e.target.value)}
                required
                placeholder="Enter currency code (e.g., USD)"
                className="rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-[#083464] focus-visible:border-[#083464] text-left"
              />
            </div>
          </>
        )}
        {selectedType.fields
          .filter((field: any) => 
            field.name !== 'cardNumber' && 
            field.name !== 'cardHolderName' && 
            field.name !== 'expiryMonth' && 
            field.name !== 'expiryYear' && 
            field.name !== 'cvv' &&
            field.name !== 'phoneNumber' &&
            field.name !== 'amount' &&
            field.name !== 'currency'
          )
          .map((field: any) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name} className="text-sm font-medium text-gray-700 flex items-center">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Input
                id={field.name}
                type={field.type}
                value={formData[field.name] || ''}
                onChange={e => onChange(field.name, e.target.value)}
                required={field.required}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                className="rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-[#083464] focus-visible:border-[#083464] text-left"
              />
            </div>
          ))}
      </div>
      <div className="flex items-center space-x-2 mt-6">
        <input
          type="checkbox"
          id="isDefault"
          checked={paymentMethods.length === 0 || formData.isDefault}
          onChange={e => onChange('isDefault', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-[#083464] focus:ring-[#083464]"
        />
        <Label htmlFor="isDefault" className="text-sm text-gray-700">
          {paymentMethods.length === 0 
            ? "This will be your default payment method" 
            : "Set as default payment method"}
        </Label>
      </div>
      <div className="pt-4">
        <Button
          type="submit"
          className="w-full py-3 rounded-lg bg-[#083464] hover:bg-[#083464]/90 transition-colors text-white font-medium text-base"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Add Payment Method'}
        </Button>
        <p className="text-xs text-center text-gray-500 mt-3 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Your payment information is secure and encrypted
        </p>
      </div>
    </form>
  );
};

export default PaymentMethodForm; 