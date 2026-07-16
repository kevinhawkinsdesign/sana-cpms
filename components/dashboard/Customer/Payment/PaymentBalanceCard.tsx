import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

interface PaymentBalanceCardProps {
  balance: {
    balance: number;
    currency: string;
  };
}

const PaymentBalanceCard: React.FC<PaymentBalanceCardProps> = ({ balance }) => (
  <div className="w-full md:w-80">
    <Card className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg border-0 rounded-2xl">
      <CardContent className="p-6 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-white/90" />
            <span className="font-semibold text-lg">Balance</span>
          </div>
          <span className="bg-white/20 text-xs font-medium px-2 py-1 rounded-full">{balance.currency}</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl md:text-4xl font-bold tracking-tight">{balance.balance.toLocaleString()}</span>
          <span className="text-lg font-medium">{balance.currency}</span>
        </div>
        <div className="mt-2 flex justify-between items-center text-xs text-white/80">
          <span>Available for payments</span>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default PaymentBalanceCard; 