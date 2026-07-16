'use client';

import { useAuth } from "@/lib/auth/authContext";
import { useUserDashboardEntitlements } from "@/lib/api/hooks/useUserDashboard";
import { EntitlementsTable } from "@/components/dashboard/Customer/Others/EntitlementsTable";

export default function CustomerEntitlementsPage() {
  const { user } = useAuth();
  const { data: entitlementsData, isLoading: loadingEntitlements } = useUserDashboardEntitlements();

  // Ensure entitlementsData is always an array
  const entitlements = Array.isArray(entitlementsData) ? entitlementsData : [];

  if (loadingEntitlements) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Entitlements</h1>
        <p className="text-muted-foreground">
          Manage your charging entitlements and free sessions.
        </p>
      </div>

      <EntitlementsTable entitlements={entitlements} />
    </div>
  );
}
