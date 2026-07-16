import { db } from '@/lib/mock/db';
import DashboardBusinessDetailClient from './DashboardBusinessDetailClient';

// Static export needs every dynamic path known at build time — this app has
// no server to render one on demand. IDs come straight from the same seed
// data the mock backend serves, so this stays in sync automatically.
export function generateStaticParams() {
  return db.businesses.map((b) => ({ businessId: b.id }));
}

export default function Page() {
  return <DashboardBusinessDetailClient />;
}
