'use client';

/** Settings → Team & Members. Members table (assign role inline, manage/reduce
 *  access per member), invitations. TeamManagement loads its own data; the
 *  Settings shell owns the header + sub-nav. */
import React from 'react';
import { TeamManagement } from '@/components/console/team/TeamManagement';

export default function SettingsTeamPage() {
  return <TeamManagement />;
}
