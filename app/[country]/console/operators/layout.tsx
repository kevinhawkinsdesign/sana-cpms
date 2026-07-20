import { SectionShell } from '@/components/console/SectionShell';
import { PEOPLE_SECTIONS, PEOPLE_GROUPS } from '@/components/console/shell/nav';

/** Merges the previously-separate Operators, Schedule, and Shift Reports
 *  sidebar entries into one "People & Shifts" item with an internal sub-nav
 *  — every /operators/* page keeps its own PageHead, so the shell renders no
 *  title of its own here. Operator detail pages (/operators/:operatorId)
 *  fall through to the Operators section via SectionShell's segment
 *  fallback, same as any unmatched sub-path. */
export default function OperatorsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionShell slug="/operators" sections={PEOPLE_SECTIONS} groups={PEOPLE_GROUPS}>
      {children}
    </SectionShell>
  );
}
