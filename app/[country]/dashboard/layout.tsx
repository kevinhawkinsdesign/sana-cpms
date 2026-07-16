import DashboardLayout from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ country: string }>;
}

export default async function DashboardSectionLayout({ children, params }: DashboardLayoutProps) {
  const { country } = await params;
  return (
    <ProtectedRoute>
      <DashboardLayout countryCode={country}>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}