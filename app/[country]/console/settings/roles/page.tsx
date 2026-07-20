'use client';

/** Settings → Roles & Permissions. Roles × permissions matrix.
 *  RolesPermissions renders its own compact section header (with Save/Reset)
 *  and the matrix, so this page adds no separate PageHead. */
import React from 'react';
import { RolesPermissions } from '@/components/console/roles/RolesPermissions';

export default function SettingsRolesPage() {
  return <RolesPermissions />;
}
