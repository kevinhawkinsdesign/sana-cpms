'use client';

import React from "react";
import { MenuItem } from "@/types/sidebar";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocalizedLink } from "../shared/LocalizedLink";

interface MenuItemComponentProps {
  item: MenuItem;
  isActive: (path: string) => boolean;
  isSubmenuActive?: (submenu: MenuItem[]) => boolean;
  expandedMenus: string[];
  toggleSubmenu: (id: string) => void;
  onNavigate: (path: string) => void;
  setIsOpen: (newState: boolean) => void;
}

export const MenuItemComponent: React.FC<MenuItemComponentProps> = ({
  item,
  isActive,
  isSubmenuActive,
  expandedMenus,
  toggleSubmenu,
  onNavigate,
  setIsOpen
}) => {
  if (item.submenu) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleSubmenu(item.id)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200",
            isSubmenuActive?.(item.submenu)
              ? "bg-emerald-50 text-emerald-600"
              : "text-gray-700 hover:bg-gray-50"
          )}
        >
          <div className="flex items-center">
            <item.icon className={cn(
              "w-5 h-5",
              isSubmenuActive?.(item.submenu) ? "text-emerald-600" : "text-gray-500"
            )} />
            <span className="font-medium ml-3">{item.title}</span>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            expandedMenus.includes(item.id) && "rotate-180"
          )} />
        </button>

        {expandedMenus.includes(item.id) && (
          <div className="pl-4 space-y-1">
            {item.submenu.map((subItem) => (
              <MenuItemComponent
                key={subItem.id}
                item={subItem}
                isActive={isActive}
                expandedMenus={expandedMenus}
                toggleSubmenu={toggleSubmenu}
                onNavigate={onNavigate}
                setIsOpen={setIsOpen}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <LocalizedLink
      href={item.path!}
      onClick={() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setIsOpen(false);
        }
      }
      }
      className={cn(
        "w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group",
        item.path && isActive(item.path)
          ? "bg-emerald-50 text-emerald-600"
          : "text-gray-700 hover:bg-gray-50"
      )}
    >
      <item.icon className={cn(
        "w-5 h-5 transition-colors",
        item.path && isActive(item.path)
          ? "text-emerald-600"
          : "text-gray-500 group-hover:text-emerald-600"
      )} />
      <span className="font-medium ml-3">{item.title}</span>
    </LocalizedLink>
  );
};