'use client';

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { X, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/authContext";
import { useBusiness } from "@/lib/providers/BusinessProvider";
import { useMenuItems } from "@/lib/hooks/useMenuItems";
import type { MenuItem, SidebarProps } from "@/types/sidebar";
import { MenuItemComponent } from "@/components/layout/MenuItemComponent";
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter";

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useLocalizedRouter();
  const { user } = useAuth();
  const { selectedBusiness } = useBusiness();
  const menuItems = useMenuItems();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const isActive = (path: string) => {
    if (!path) return false;

    // Strip optional country prefix like /rw or /ke
    const pathWithoutCountry = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");

    if (path === "/dashboard") return pathWithoutCountry === "/dashboard";
    if (path === "/dashboard/stations") return pathWithoutCountry === "/dashboard/stations";
    if (path === "/dashboard/scan") return pathWithoutCountry === "/dashboard/scan";

    const [basePath, queryString] = path.split("?");
    if (queryString) {
      const menuParams = new URLSearchParams(queryString);
      return (
        pathWithoutCountry === basePath &&
        Array.from(menuParams.entries()).every(([key, value]) => searchParams?.get(key) === value)
      );
    }

    return pathWithoutCountry === path;
  };

  const isSubmenuActive = (submenuItems: MenuItem[]) =>
    submenuItems.some(item => isActive(item.path || ""));

  if (!user) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 xl:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-0 top-4 z-50 hidden xl:flex items-center justify-center w-8 h-12 bg-gray-900 border border-l-0 border-gray-700 rounded-r-md hover:bg-gray-800 transition-all duration-200 shadow-lg"
        style={{ left: isOpen ? "17.5rem" : "0" }}
        aria-label="Toggle sidebar"
      >
        <Image
          src="/favicon.ico"
          alt="Kabisa"
          width={20}
          height={20}
          className={`w-5 h-5 object-contain transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 bottom-0 z-30
          w-72 bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          shadow-lg
        `}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 border-b">
          <Image
            src="/kabisaaa.png"
            alt="Kabisa"
            width={96}
            height={32}
            className="h-8 w-auto cursor-pointer"
            onClick={() => handleNavigate("/dashboard")}
            priority
          />
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden ml-auto text-gray-500 hover:text-gray-700"
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>


        {/* Menu Items */}
        <div className="px-4 py-6 space-y-2 overflow-y-auto h-[calc(100vh-8rem)]">
          {menuItems.map(item => (
            <MenuItemComponent
              key={item.id}
              item={item}
              isActive={isActive}
              isSubmenuActive={isSubmenuActive}
              expandedMenus={expandedMenus}
              toggleSubmenu={toggleSubmenu}
              onNavigate={handleNavigate}
              setIsOpen={setIsOpen}
            />
          ))}
        </div>

        {/* Leave Dashboard Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <button
            onClick={() => {
              handleNavigate("/");
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Leave Dashboard</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
