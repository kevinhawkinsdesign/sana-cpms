import { db } from '@/lib/mock/db';
import IndividualVehicleDetailClient from './IndividualVehicleDetailClient';

// Static export needs every dynamic path known at build time — this app has
// no server to render one on demand. IDs come straight from the same seed
// data the mock backend serves, so this stays in sync automatically.
export function generateStaticParams() {
  return db.vehicles.map((v) => ({ vehicleId: v.id }));
}

export default function Page() {
  return <IndividualVehicleDetailClient />;
}
