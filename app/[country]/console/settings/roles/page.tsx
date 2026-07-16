'use client';

/** Settings → Roles & Permissions. Roles × permissions matrix. The Settings
 *  shell owns the header + sub-nav; RolesPermissions renders its own section
 *  header (with Save/Reset) and the matrix. */
import React from 'react';
import { RolesPermissions } from '@/components/console/roles/RolesPermissions';

export default function SettingsRolesPage() {
  return <RolesPermissions />;
}
