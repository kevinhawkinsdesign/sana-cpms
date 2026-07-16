import { db } from '@/lib/mock/db';
import StationDetailClient from './StationDetailClient';

// Static export needs every dynamic path known at build time — this app has
// no server to render one on demand. IDs come straight from the same seed
// data the mock backend serves, so this stays in sync automatically.
export function generateStaticParams() {
  return db.chargers.map((c) => ({ chargerId: c.id }));
}

export default function Page() {
  return <StationDetailClient />;
}
