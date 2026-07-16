'use client';

import { useMemo } from "react";
import { useAuth } from "@/lib/auth/authContext";
import { 
  LayoutDashboard,
  Car,
  Users2,
  CreditCard,
  BarChart3,
  FileText,
  Settings,
  User,
  PlusCircle
} from "lucide-react";
import { MenuItem } from "@/types/sidebar";
import { UserRole } from "@/lib/utils/roleRedirect";

export const useBusinessMenuItems = () => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user?.role) return [];

    const businessMenuItems: MenuItem[] = [
      // Business Dashboard - Overview
      {
        id: "businessDashboard",
        title: "Overview",
        path: "/dashboard",
        icon: LayoutDashboard,
        roles: [UserRole.CUSTOMER, UserRole.OPERATOR, UserRole.ADMIN],
      },

      // Fleet Management
      {
        id: "fleetManagement",
        title: "Fleet Management",
        path: "/dashboard/customer/business/fleet",
        icon: Car,
        roles: [UserRole.CUSTOMER],
      },

      // Team Management
      {
        id: "teamManagement",
        title: "Team Management",
        path: "/dashboard/customer/business/team",
        icon: Users2,
        roles: [UserRole.CUSTOMER],
      },

      // Business Contracts
      {
        id: "businessContracts",
        title: "Contracts",
        path: "/dashboard/customer/business/contracts",
        icon: FileText,
        roles: [UserRole.CUSTOMER, UserRole.ADMIN],
      },

      // Business Analytics
      {
        id: "businessAnalytics",
        title: "Analytics",
        path: "/dashboard/customer/business/analytics",
        icon: BarChart3,
        roles: [UserRole.CUSTOMER],
      },

      // Business Billing
      {
        id: "businessBilling",
        title: "Billing",
        path: "/dashboard/customer/business/billing",
        icon: CreditCard,
        roles: [UserRole.CUSTOMER],
      },

      // Business Settings
      {
        id: "businessSettings",
        title: "Business Settings",
        icon: Settings,
        roles: [UserRole.CUSTOMER],
        submenu: [
          {
            id: "createBusiness",
            title: "Create Business",
            path: "/dashboard/customer/business/create",
            icon: PlusCircle,
            roles: [UserRole.CUSTOMER],
          },
          {
            id: "businessProfile",
            title: "Business Profile",
            path: "/dashboard/customer/business/profile",
            icon: Settings,
            roles: [UserRole.CUSTOMER],
          },
        ],
      },

      // Profile
      {
        id: "profile",
        title: "Profile",
        path: "/dashboard/profile",
        icon: User,
        roles: [UserRole.CUSTOMER, UserRole.OPERATOR, UserRole.ADMIN],
      },
    ];

    // Filter menu items based on user role and ensure submenus are also filtered
    const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter(item => item.roles.includes(user.role!))
        .map(item => ({
          ...item,
          submenu: item.submenu ? filterMenuItems(item.submenu) : undefined
        }))
        .filter(item => !item.submenu || item.submenu.length > 0);
    };

    return filterMenuItems(businessMenuItems);
  }, [user?.role]);
};