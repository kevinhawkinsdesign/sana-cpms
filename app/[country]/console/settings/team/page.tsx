'use client';

/** Settings → Team & Members. Members table (assign role inline, manage/reduce
 *  access per member), invitations. TeamManagement loads its own data. */
import React from 'react';
import { PageHead } from '@/components/console/ui';
import { TeamManagement } from '@/components/console/team/TeamManagement';

export default function SettingsTeamPage() {
  return (
    <div className="space-y-4">
      <PageHead title="Team & Members" sub="Invite teammates and manage per-member access" />
      <TeamManagement />
    </div>
  );
}
