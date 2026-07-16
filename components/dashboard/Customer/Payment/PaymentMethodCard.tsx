import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Wallet, CreditCard } from 'lucide-react';
import Image from 'next/image';

interface PaymentMethod {
  id: string;
  type: string;
  provider: string;
  isDefault: boolean;
  status: string;
  cardNumber?: string;
  cardHolderName?: string;
  expiryMonth?: number;
  expiryYear?: number;
  phoneNumber?: string;
  billingAddress?: string;
  billingCity?: string;
  billingCountry?: string;
  addedAt: string;
  balance?: number;
  currency?: string;
}

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onSetDefault: (id: string) => void;
  onDelete: (id: string, event: React.MouseEvent) => void;
  isSettingDefault: boolean;
}

const getCardImage = (brand: string) => {
  if (!brand) return '/payment methods/generic-card.svg';
  switch(brand.toLowerCase()) {
    case 'visa': return '/payment methods/visa.svg';
    case 'mastercard': return '/payment methods/mastercard.svg';
    case 'amex':
    case 'american express': return '/payment methods/amex.svg';
    case 'discover': return '/payment methods/discover.svg';
    case 'jcb': return '/payment methods/jcb.svg';
    default: return '/payment methods/generic-card.svg';
  }
};

const getMobileProviderImage = (provider: string) => {
  if (!provider) return '/payment methods/MobileMoney.svg';
  switch(provider.toLowerCase()) {
    case 'mtn': return '/payment methods/mtn.svg';
    case 'airtel': return '/payment methods/airtel.svg';
    default: return '/payment methods/MobileMoney.svg';
  }
};

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({ method, onSetDefault, onDelete, isSettingDefault }) => (
  <Card
    className={`overflow-hidden border ${method.isDefault ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-100'} rounded-xl hover:shadow-md transition-all cursor-pointer relative`}
    onClick={() => !method.isDefault && onSetDefault(method.id)}
  >
    {method.isDefault && (
      <div className="absolute top-3 right-10 z-20">
        <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">Default</span>
      </div>
    )}
    <button
      className="absolute top-3 right-1 z-20 flex items-center justify-center w-5 h-8 rounded-full hover:bg-red-100"
      onClick={e => { e.stopPropagation(); onDelete(method.id, e); }}
      title="Delete"
    >
      <Trash2 className="w-5 h-5 text-red-500" />
    </button>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 flex items-center justify-center overflow-hidden ">
          {method.type === 'CREDIT_CARD' ? (
            <Image src={getCardImage(method.provider)} alt={method.provider || 'Card'} width={40} height={40} className="" />
          ) : method.type === 'MOBILE_MONEY' ? (
            <Image src={getMobileProviderImage(method.provider)} alt={method.provider || 'Mobile Money'} width={40} height={40} className="" />
          ) : method.type === 'BALANCE' ? (
            <Wallet className="w-8 h-8 text-blue-500" />
          ) : (
            <CreditCard className="w-8 h-8 text-gray-500" />
          )}
        </div>
        <div>
          {/* <CardTitle className="text-base font-medium">
            {method.type === 'CREDIT_CARD' 
              ? (method.provider 
                  ? method.provider.charAt(0).toUpperCase() + method.provider.slice(1)
                  : 'Card')
              : method.type === 'MOBILE_MONEY'
                ? (method.provider
                    ? method.provider.charAt(0).toUpperCase() + method.provider.slice(1)
                    : 'Mobile Money')
                : method.type === 'BALANCE'
                  ? 'Account Balance'
                  : 'Payment Method'}
          </CardTitle> */}
          <CardDescription className="text-xs">
            Added on {new Date(method.addedAt).toLocaleDateString()}
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {method.type === 'CREDIT_CARD' ? (
          <>
            <div className="flex items-center justify-between">
              <div className="h-6">
                {method.provider && (
                  <span className="text-gray-700 font-medium">
                    {method.provider.charAt(0).toUpperCase() + method.provider.slice(1)}
                  </span>
                )}
              </div>
              <span className="text-sm bg-blue-50 text-blue-700 py-1 px-2 rounded">
                ●●●● {method.cardNumber?.slice(-4) || '****'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="text-xs text-gray-500">Card Holder</p>
                <p className="font-medium truncate">{method.cardHolderName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expires</p>
                <p className="font-medium">
                  {method.expiryMonth && method.expiryYear
                    ? `${String(method.expiryMonth).padStart(2, '0')}/${method.expiryYear}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </>
        ) : method.type === 'MOBILE_MONEY' ? (
          <div className="space-y-3">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Phone Number</p>
              <p className="font-medium text-base">{method.phoneNumber}</p>
            </div>
          </div>
        ) : method.type === 'BALANCE' ? (
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Available Amount</p>
              <p className="font-medium text-base">
                {parseFloat(method.balance?.toString() || '0').toLocaleString()} {method.currency || ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Payment Method</p>
              <p className="font-medium text-base">{method.provider || 'Other'}</p>
            </div>
          </div>
        )}
        <div className="pt-3 flex justify-between items-center">
          <span className={`px-2 py-1 text-xs rounded-full ${
            method.status === 'ACTIVE'
              ? 'bg-green-50 text-green-600'
              : method.status === 'EXPIRED'
              ? 'bg-red-50 text-red-600'
              : method.status === 'INVALID'
              ? 'bg-red-50 text-red-600'
              : 'bg-gray-50 text-gray-600'
          }`}>
            {method.status}
          </span>
          {!method.isDefault && (
            <button 
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              onClick={e => { e.stopPropagation(); onSetDefault(method.id); }}
              disabled={isSettingDefault}
            >
              Set Default
            </button>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default PaymentMethodCard; 