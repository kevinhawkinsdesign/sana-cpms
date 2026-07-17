import { SectionShell } from '@/components/console/SectionShell';
import { EBM_SECTIONS, EBM_GROUPS } from '@/components/console/shell/nav';

/** Merges the 10 previously-separate EBM/EBM Config sidebar entries into one
 *  "EBM & Compliance" item with an internal sub-nav — every /ebm/* page keeps
 *  its own PageHead, so the shell renders no title of its own here. */
export default function EbmLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionShell slug="/ebm" sections={EBM_SECTIONS} groups={EBM_GROUPS}>
      {children}
    </SectionShell>
  );
}
