import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export interface PaymentMethodType {
  type: string;
  displayName: string;
  fields: {
    name: string;
    label: string;
    type: string;
    required: boolean;
  }[];
}

interface PaymentTypeCardProps {
  type: PaymentMethodType;
  onClick: (type: PaymentMethodType) => void;
  isSelected?: boolean;
}

const PaymentTypeCard: React.FC<PaymentTypeCardProps> = ({ type, onClick, isSelected }) => {
  const getIcon = () => {
    if (type.type === 'CREDIT_CARD') return '/payment methods/visa.svg';
    if (type.type === 'MOBILE_MONEY') return '/payment methods/MobileMoney.svg';
    if (type.type === 'BALANCE') return '/payment methods/wallet.svg';
    return '/payment methods/generic-payment.svg';
  };
  return (
    <div
      className={`flex items-start p-6 cursor-pointer border rounded-xl transition-all duration-200 group ${isSelected ? 'border-blue-500 shadow-md' : 'border-gray-100 hover:shadow-md'}`}
      onClick={() => onClick(type)}
    >
      <div className="w-20 h-20 flex items-center justify-center mr-6 overflow-hidden">
        <Image src={getIcon()} alt={type.displayName} width={60} height={60} className="object-contain" />
      </div>
      <div className="flex-1">
        <h4 className="text-lg font-medium mb-1 text-gray-800">{type.displayName}</h4>
        <p className="text-sm text-gray-500 mb-3">
          {type.type === 'CREDIT_CARD'
            ? 'Add debit or credit card for online payments'
            : type.type === 'MOBILE_MONEY'
              ? 'Link your mobile money account for easy transfers'
              : type.type === 'BALANCE'
                ? 'Use your account balance for payments'
                : 'Add a payment method for transactions'}
        </p>
        <Button
          variant="default"
          size="sm"
          className="bg-[#083464] hover:bg-[#083464]/90 text-white text-sm"
        >
          Add {type.displayName}
        </Button>
      </div>
    </div>
  );
};

export default PaymentTypeCard; 