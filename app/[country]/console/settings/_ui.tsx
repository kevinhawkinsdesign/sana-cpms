'use client';

/** Settings form primitives now live in the shared console form module
 *  (also used by the Account area). Re-exported here so existing
 *  `../_ui` imports across the Settings sections keep working. */
export { Field, Row, inputStyle, readonlyStyle, SectionPlaceholder } from '@/components/console/form';
