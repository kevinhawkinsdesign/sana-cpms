import { allShiftReports } from '@/lib/mock/db';
import ShiftDetailClient from './ShiftDetailClient';

// Static export needs every dynamic path known at build time — this app has
// no server to render one on demand. IDs come from the same derived shift
// reports the mock backend serves (see db.ts's allShiftReports), so this
// stays in sync automatically as the underlying session data changes.
export function generateStaticParams() {
  return allShiftReports().map((r) => ({ shiftId: r.id }));
}

export default function Page() {
  return <ShiftDetailClient />;
}
