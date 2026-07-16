import VehicleOrder from '@/components/order/VehicleOrder';
import { db } from '@/lib/mock/db';

// Static export needs every dynamic path known at build time — this app has
// no server to render one on demand. IDs come straight from the same seed
// data the mock backend serves, so this stays in sync automatically.
export function generateStaticParams() {
  return db.shopVehicles.map((v) => ({ shopId: v.shopId }));
}

export default function OrderPage() {
  return <VehicleOrder />;
}
