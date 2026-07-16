'use client';

import { useMemo } from "react";
import { useAuth } from "@/lib/auth/authContext";
import { useBusiness } from "@/lib/providers/BusinessProvider";
import type { MenuItem } from "@/types/sidebar";
import { ALL_MENU_ITEMS } from "../constants/menuItems";

type Scope = "personal" | "business" | "any" | "invited"; // optional field on items
type UserStatus = "active" | "invited" | "pending";

const PRIV_ROLES = new Set(["ADMIN", "ORGANIZATION_ADMIN", "OPERATOR", "SUPER_ADMIN"]);

export function useMenuItems(): MenuItem[] {
  const { user } = useAuth();
  const { businesses, selectedBusiness } = useBusiness();

  // normalize role (primitive)
  const role = (user?.role ?? "").toString().trim().toUpperCase();
  const isPrivileged = PRIV_ROLES.has(role);
  const isCustomer = role === "CUSTOMER";
  
  // Check if user is invited (has pending invitations but no active business membership)
  // For now, we'll treat all customers as having access to personal features
  const isInvited = false; // We'll handle invitation logic differently

  // Decide which scopes are allowed (primitive-only deps)
  const allowedScopes = useMemo<Scope[]>(() => {
    if (isPrivileged) return ["personal", "business", "any"];            // admins/operators see both sets
    if (isCustomer) {
      const hasBusiness = (businesses?.length ?? 0) > 0 && !!selectedBusiness?.id;
      return hasBusiness ? ["personal", "business", "any"] : ["personal", "any"];    // customers always see personal, business if selected
    }
    return ["personal", "any"];                                          // others default to personal-like
  }, [isPrivileged, isCustomer, businesses?.length, selectedBusiness?.id]);

  // Tree filter: role gate + scope gate + business role gate + recurse into submenu
  const filterTree = (items: MenuItem[]): MenuItem[] => {
    const out: MenuItem[] = [];
    for (const item of items) {
      // Optional "scope" on items. If missing, treat as "any"
      const scope: Scope = (item as any).scope ?? "any";

      // Role rule: ALWAYS enforce explicit role membership
      // Privileged roles (ADMIN/OPERATOR/etc.) only broaden scopes, not role access
      const roleOk = !!item.roles?.includes(role as any);

      // Scope rule
      const scopeOk = allowedScopes.includes(scope);

      // Business role rule: Check if user has required business role
      let businessRoleOk = true;
      if (item.businessRoles && selectedBusiness?.role) {
        businessRoleOk = item.businessRoles.includes(selectedBusiness.role as any);
      }

      if (!roleOk || !scopeOk || !businessRoleOk) continue;

      // Recurse children
      const submenu = item.submenu ? filterTree(item.submenu) : undefined;

      // Drop empty sections (no path & no visible children)
      if ((!submenu || submenu.length === 0) && !item.path) continue;

      // Allow small role-based path overrides for specific items
      let adjusted = { ...item, submenu } as MenuItem;

      // For admins, make the top-level "Sessions" entry point to the admin sessions page
      if (adjusted.id === 'sessions' && role === 'ADMIN') {
        adjusted = { ...adjusted, path: '/dashboard/admin/sessions' };
      }
      // For org admins, point to org-admin sessions page
      if (adjusted.id === 'sessions' && role === 'ORGANIZATION_ADMIN') {
        adjusted = { ...adjusted, path: '/dashboard/org-admin/sessions' };
      }

      out.push(adjusted);
    }
    return out;
  };

  // Final memo: depend on primitives only
  return useMemo(() => {
    if (!role) return [];
    
    // Debug logging
    console.log('Menu filtering debug:', {
      role,
      isPrivileged,
      isCustomer,
      hasBusiness: (businesses?.length ?? 0) > 0,
      selectedBusinessId: selectedBusiness?.id,
      allowedScopes,
      businessesCount: businesses?.length ?? 0
    });
    
    // join() makes the array dep primitive-ish and order-stable
    const filteredItems = filterTree(ALL_MENU_ITEMS);
    console.log('Filtered menu items:', filteredItems.map(item => ({ id: item.id, title: item.title, scope: (item as any).scope })));
    
    return filteredItems;
  }, [role, allowedScopes.join("|"), isPrivileged, isCustomer, businesses?.length, selectedBusiness?.id]);
}
