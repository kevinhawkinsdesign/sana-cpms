import { SectionShell } from '@/components/console/SectionShell';
import { FEEDBACK_SECTIONS, FEEDBACK_GROUPS } from '@/components/console/shell/nav';

/** Merges the previously-separate Reviews and Reports sidebar entries into
 *  one "Feedback" item with an internal sub-nav — every /feedback/* page
 *  keeps its own PageHead, so the shell renders no title of its own here. */
export default function FeedbackLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionShell slug="/feedback" sections={FEEDBACK_SECTIONS} groups={FEEDBACK_GROUPS}>
      {children}
    </SectionShell>
  );
}
