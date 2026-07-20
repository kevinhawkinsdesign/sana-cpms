import { SectionShell } from '@/components/console/SectionShell';
import { SETTINGS_SECTIONS, SETTINGS_GROUPS } from '@/components/console/shell/nav';

/** Merges the org-scoped Settings area (General, Billing, Team, Roles, Tax)
 *  with the previously-separate Platform Admin hub (Organizations, Countries,
 *  Users, Audit Log, Citrine Sync) into one "Settings & Admin" item with an
 *  internal sub-nav — every /settings/* page keeps its own PageHead, so the
 *  shell renders no title of its own here. The Platform Admin group is
 *  gated by requirePlatformAdmin on each of those sections (see nav.ts /
 *  SectionShell), so regular org admins never see or reach it. */
export default function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionShell slug="/settings" sections={SETTINGS_SECTIONS} groups={SETTINGS_GROUPS}>
      {children}
    </SectionShell>
  );
}
