import { SectionShell } from '@/components/console/SectionShell';
import { FLEET_SECTIONS, FLEET_GROUPS } from '@/components/console/shell/nav';

/** Merges the previously-separate Fleet sidebar entries (Vehicles, Shop
 *  Vehicles, Shop Orders, Vehicles with Debt, Businesses) into one "Fleet"
 *  item with an internal sub-nav — every /admin/* page keeps its own
 *  PageHead, so the shell renders no title of its own here. Platform Admin
 *  (Organizations, Countries, Users, Audit Log, Citrine Sync) moved to
 *  /settings/* in an earlier merge, so /admin/* is Fleet-only now — this
 *  layout applies unconditionally, unlike the old conditional version. */
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionShell slug="/admin" sections={FLEET_SECTIONS} groups={FLEET_GROUPS}>
      {children}
    </SectionShell>
  );
}
