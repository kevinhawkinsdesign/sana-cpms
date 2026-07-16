import { db } from '@/lib/mock/db';
import OperatorDetailClient from './OperatorDetailClient';

// Static export needs every dynamic path known at build time — this app has
// no server to render one on demand. IDs come straight from the same seed
// data the mock backend serves, so this stays in sync automatically.
export function generateStaticParams() {
  return db.users.filter((u) => u.role === 'OPERATOR').map((o) => ({ operatorId: o.id }));
}

export default function Page() {
  return <OperatorDetailClient />;
}
