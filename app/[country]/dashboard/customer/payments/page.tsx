'use client';

import { useAuth } from "@/lib/auth/authContext";
import { PaymentMethodsSection } from "@/components/dashboard/Customer/Others/PaymentMethodsSection";

export default function CustomerPaymentsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
        <p className="text-muted-foreground">
          Manage your payment methods and billing preferences.
        </p>
      </div>

      <PaymentMethodsSection />
    </div>
  );
}
