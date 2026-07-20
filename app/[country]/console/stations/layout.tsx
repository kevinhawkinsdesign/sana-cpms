import { SectionShell } from '@/components/console/SectionShell';
import { INFRA_SECTIONS, INFRA_GROUPS } from '@/components/console/shell/nav';

/** Merges the previously-separate Stations, Sessions, and Incidents sidebar
 *  entries into one "Infrastructure" item with an internal sub-nav — every
 *  /stations/* page keeps its own PageHead, so the shell renders no title of
 *  its own here. Station detail pages (/stations/:chargerId) fall through to
 *  the Stations section via SectionShell's segment fallback, same as any
 *  unmatched sub-path. */
export default function StationsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionShell slug="/stations" sections={INFRA_SECTIONS} groups={INFRA_GROUPS}>
      {children}
    </SectionShell>
  );
}
