'use client';

import { useMemo } from "react";
import { useAuth } from "@/lib/auth/authContext";
import { 
  Home,
  Car,
  History,
  Star,
  CreditCard,
  User,
  Settings,
  Users2,
  Battery,
  Timer,
  IdCard,
  BatteryCharging,
  LogIn,
  LogOut,
  QrCode,
  ClipboardList,
  Building2,
  ArrowLeftRight,
  Zap,
  BarChart3
} from "lucide-react";
import { MenuItem } from "@/types/sidebar";
import { UserRole } from "@/lib/utils/roleRedirect";

export const usePersonalMenuItems = () => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user?.role) return [];

    // Define role-specific menu items
    const customerMenuItems: MenuItem[] = [
      {
        id: "dashboard",
        title: "Dashboard",
        path: "/dashboard/customer",
        icon: Home,
        roles: [UserRole.CUSTOMER],
      },
      {
        id: "customerVehicles",
        title: "My Vehicles",
        path: "/dashboard/customer/vehicles",
        icon: Car,
        roles: [UserRole.CUSTOMER],
      },
      {
        id: "customerSessions",
        title: "My Sessions",
        path: "/dashboard/customer/sessions",
        icon: History,
        roles: [UserRole.CUSTOMER],
      },
      {
        id: "customerEntitlements",
        title: "Entitlements",
        path: "/dashboard/customer/entitlements",
        icon: Star,
        roles: [UserRole.CUSTOMER],
      },
      {
        id: "customerPayments",
        title: "Payment Methods",
        path: "/dashboard/customer/payments",
        icon: CreditCard,
        roles: [UserRole.CUSTOMER],
      },
      {
        id: "profile",
        title: "Profile",
        path: "/dashboard/profile",
        icon: User,
        roles: [UserRole.CUSTOMER],
      },
      {
        id: "settings",
        title: "Settings",
        path: "/dashboard/settings",
        icon: Settings,
        roles: [UserRole.CUSTOMER],
      },
    ];

    const operatorMenuItems: MenuItem[] = [
      {
        id: "dashboard",
        title: "Dashboard",
        path: "/dashboard/operator",
        icon: Home,
        roles: [UserRole.OPERATOR],
      },
      {
        id: "chargingSession",
        title: "Charging Session",
        icon: BatteryCharging,
        roles: [UserRole.OPERATOR],
        submenu: [
          {
            id: "sessionStart",
            title: "Start Session",
            path: "/dashboard/charge/session?op=start",
            icon: LogIn,
            roles: [UserRole.OPERATOR],
          },
          {
            id: "sessionEnd",
            title: "End Session",
            path: "/dashboard/charge/session?op=end",
            icon: LogOut,
            roles: [UserRole.OPERATOR],
          },
        ],
      },
      {
        id: "scan",
        title: "Scan",
        path: "/dashboard/scan",
        icon: QrCode,
        roles: [UserRole.OPERATOR],
      },
      {
        id: "sessions",
        title: "Sessions",
        path: "/dashboard/charge/sessions",
        icon: History,
        roles: [UserRole.OPERATOR],
      },
      {
        id: "sessionManagement",
        title: "Session Management",
        path: "/dashboard/sessions",
        icon: Zap,
        roles: [UserRole.OPERATOR],
      },
      {
        id: "shift",
        title: "My Shifts",
        icon: Timer,
        path: "/dashboard/shifts",
        roles: [UserRole.OPERATOR],
      },
      {
        id: "shiftSwaps",
        title: "Shift Swaps",
        icon: ArrowLeftRight,
        path: "/dashboard/shifts/swaps",
        roles: [UserRole.OPERATOR],
      },
      {
        id: "inspect",
        title: "Inspect",
        icon: ClipboardList,
        roles: [UserRole.OPERATOR],
        path: "/dashboard/charge/inspect",
      },
      {
        id: "profile",
        title: "Profile",
        path: "/dashboard/profile",
        icon: User,
        roles: [UserRole.OPERATOR],
      },
      {
        id: "settings",
        title: "Settings",
        path: "/dashboard/settings",
        icon: Settings,
        roles: [UserRole.OPERATOR],
      },
    ];

    const adminMenuItems: MenuItem[] = [
      {
        id: "dashboard",
        title: "Dashboard",
        path: "/dashboard/admin",
        icon: Home,
        roles: [UserRole.ADMIN],
      },
      {
        id: "adminManagement",
        title: "Admin Management",
        icon: Users2,
        roles: [UserRole.ADMIN],
        submenu: [
          {
            id: "shifts",
            title: "Shift Management",
            path: "/dashboard/admin/shifts",
            icon: Timer,
            roles: [UserRole.ADMIN],
          },
          {
            id: "shiftReports",
            title: "Shift Reports",
            path: "/dashboard/admin/shifts/reports",
            icon: BarChart3,
            roles: [UserRole.ADMIN],
          },
          {
            id: "users",
            title: "Users",
            path: "/dashboard/admin/users",
            icon: Users2,
            roles: [UserRole.ADMIN],
          },
          {
            id: "businesses",
            title: "Business Management",
            path: "/dashboard/admin/businesses",
            icon: Building2,
            roles: [UserRole.ADMIN],
          },
          {
            id: "chargers",
            title: "Chargers",
            path: "/dashboard/admin/chargers",
            icon: Battery,
            roles: [UserRole.ADMIN],
          },
          {
            id: "kabisaIds",
            title: "Kabisa IDs",
            path: "/dashboard/admin/kabisa-ids",
            icon: IdCard,
            roles: [UserRole.ADMIN],
          },
        ],
      },
      {
        id: "chargingSession",
        title: "Charging Session",
        icon: BatteryCharging,
        roles: [UserRole.ADMIN],
        submenu: [
          {
            id: "sessionStart",
            title: "Start Session",
            path: "/dashboard/charge/session?op=start",
            icon: LogIn,
            roles: [UserRole.ADMIN],
          },
          {
            id: "sessionEnd",
            title: "End Session",
            path: "/dashboard/charge/session?op=end",
            icon: LogOut,
            roles: [UserRole.ADMIN],
          },
        ],
      },
      {
        id: "scan",
        title: "Scan",
        path: "/dashboard/scan",
        icon: QrCode,
        roles: [UserRole.ADMIN],
      },
      {
        id: "sessions",
        title: "Sessions",
        path: "/dashboard/charge/sessions",
        icon: History,
        roles: [UserRole.ADMIN],
      },
      {
        id: "inspect",
        title: "Inspect",
        icon: ClipboardList,
        roles: [UserRole.ADMIN],
        path: "/dashboard/charge/inspect",
      },
      {
        id: "profile",
        title: "Profile",
        path: "/dashboard/profile",
        icon: User,
        roles: [UserRole.ADMIN],
      },
      {
        id: "settings",
        title: "Settings",
        path: "/dashboard/settings",
        icon: Settings,
        roles: [UserRole.ADMIN],
      },
    ];

    // Return the appropriate menu items based on user role
    switch (user.role) {
      case UserRole.CUSTOMER:
        return customerMenuItems;
      case UserRole.OPERATOR:
        return operatorMenuItems;
      case UserRole.ADMIN:
        return adminMenuItems;
      default:
        return [];
    }
  }, [user?.role]);
};