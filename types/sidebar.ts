import { LucideIcon } from "lucide-react";
import { UserRole } from "@/lib/utils/roleRedirect";

export interface MenuItem {
  id: string;
  title: string;
  path?: string;
  icon: LucideIcon;
  roles: UserRole[];
  scope?: 'personal' | 'business' | 'any';
  businessRoles?: ('OWNER' | 'FINANCE' | 'DRIVER')[]; // Business-specific role restrictions
  submenu?: MenuItem[];
}

export interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
} 