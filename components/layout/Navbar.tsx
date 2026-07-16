"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaBars, FaSignOutAlt } from "react-icons/fa";
import { Phone, Home, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";

import { useMobileNav } from '@/lib/providers/mobile-nav-provider';
import { useAuth } from '@/lib/auth/authContext';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatEnumValue } from "@/lib/utils/formatters";
import { CountrySwitcher } from "../navbar/CountrySwitcher";
import { LogoutModal } from "../navbar/LogoutModal";
import { MobileNav } from "../navbar/MobileNav";
import { NAV_LINKS } from "../../constants/nav-constants";
import { SOCIAL_ICONS } from "../../constants/nav-constants";
import { useCountry } from "@/lib/providers/country-provider";
import { LocalizedLink } from "../shared/LocalizedLink";
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter";

export default function Navbar() {
  const { isMobileNavOpen, setMobileNavOpen } = useMobileNav();
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const router = useLocalizedRouter();
  const { countryCode } = useCountry();
  const pathname = usePathname();

  // Check if we're on the highlights listing page for transparent navbar (not detail pages)
  const isHighlightsPage = pathname?.includes('/highlights') && !pathname?.match(/\/highlights\/[^/]+/);

  const handleLogout = async () => {
    await logout();
    setLogoutModalOpen(false);
    setMobileNavOpen(false);
  };

  const handleOpenLogoutModal = () => {
    setLogoutModalOpen(true);
  };

  // Get user initials for avatar
  const getUserInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Get shortened display name
  const getShortenedName = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'User';
    
    if (firstName && lastName) {
      // If both names exist, use first initial + last name
      return `${firstName.charAt(0)}. ${lastName.toUpperCase()}`;
    } else if (firstName) {
      // If only first name exists
      return firstName.length > 10 ? `${firstName.charAt(0)}. ${firstName.split(' ')[0].toUpperCase()}` : firstName;
    } else if (lastName) {
      // If only last name exists
      return lastName.length > 10 ? `${lastName.charAt(0)}. ${lastName.toUpperCase()}` : lastName.toUpperCase();
    }
    
    return 'User';
  };

  return (
    <>
      <header className={`w-full fixed top-0 left-0 right-0 z-40 px-5 py-4 backdrop-blur-sm transition-colors duration-300 ${isHighlightsPage ? 'bg-black/20 border-b border-white/10 text-white' : 'bg-[#001D3D] border-b border-[#FFD60A]/10 text-[#FFD60A]'}`}>
        <div className="flex justify-between items-center mx-auto max-w-screen-xl">
          <LocalizedLink href="/" aria-label="Go to homepage">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Image src="/kabisa.png" alt="Kabisa Logo" width={160} height={40} className="h-10 w-auto" priority />
            </motion.div>
          </LocalizedLink>

          {/* Mobile Country Switcher - center, only on mobile and tablet */}
          <div className="flex-1 flex justify-center lg:hidden">
            <CountrySwitcher className="mx-auto" />
          </div>

          <div className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            {NAV_LINKS.map((link) => (
              link.hasDropdown && link.subLinks ? (
                <div key={link.label} className="relative group">
                  <button className="text-sm font-medium hover:text-white transition-colors flex items-center gap-1 focus:outline-none">
                    {link.label}
                  </button>
                  <div className="absolute left-0 mt-2 min-w-[180px] bg-white text-[#001D3D] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 group-hover:visible invisible transition-all z-50">
                    {link.subLinks.map((subLink) => (
                      <Link
                        key={subLink.href}
                        href={`/${countryCode}${subLink.href}`}
                        className="block px-4 py-2 text-sm hover:bg-[#FFD60A] hover:text-[#001D3D] rounded-lg transition-colors"
                      >
                        {subLink.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link key={link.href} href={`/${countryCode}${link.href}`} className="text-sm font-medium hover:text-white transition-colors">
                  {link.label}
                </Link>
              )
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-5">
            <a href="tel:6420" className="flex items-center text-sm hover:text-white transition-colors">
              <Phone className="mr-2 h-4 w-4" /> 6420
            </a>
            
            {/* Country Switcher for Desktop */}
            <CountrySwitcher />

            {/* Social Media Icons */}
            <div className="flex items-center gap-4 ml-2">
              {SOCIAL_ICONS.map(({ icon: Icon, href, label }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Visit our ${label}`}
                   className={`text-xl hover:text-white transition-all hover:scale-110 ${isHighlightsPage ? 'text-white' : 'text-[#FFD60A]'}`}>
                  <Icon />
                </a>
              ))}
            </div>

            {isAuthenticated && user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <button className="flex items-center gap-3" aria-label="User menu">
                            {user.imageUrl ? (
                              <Image
                                className={`h-9 w-9 rounded-full object-cover border-2 ${isHighlightsPage ? 'border-white' : 'border-[#FFD60A]'}`}
                                src={user.imageUrl}
                                alt={`${user.firstName} ${user.lastName}`}
                                width={36}
                                height={36}
                              />
                            ) : (
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm border-2 ${isHighlightsPage ? 'bg-white text-[#001D3D] border-white' : 'bg-[#FFD60A] text-[#001D3D] border-[#FFD60A]'}`}>
                                  {getUserInitials(user.firstName, user.lastName)}
                              </div>
                            )}
                            <div className="flex flex-col items-start">
                              <span className={`text-sm font-medium ${isHighlightsPage ? 'text-white' : 'text-[#FFD60A]'}`}>
                                {getShortenedName(user.firstName, user.lastName)}
                              </span>
                              <span className={`text-xs ${isHighlightsPage ? 'text-white/70' : 'text-[#FFD60A]/70'}`}>
                                {formatEnumValue(user.role)}
                              </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 ${isHighlightsPage ? 'text-white/70' : 'text-[#FFD60A]/70'}`} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                       <div className="px-2 py-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">{formatEnumValue(user.role)}</p>
                       </div>
                       <DropdownMenuSeparator />
                        <LocalizedLink href="/dashboard"><DropdownMenuItem><Home className="mr-2 h-4 w-4" />Dashboard</DropdownMenuItem></LocalizedLink>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600" onClick={handleOpenLogoutModal}>
                            <FaSignOutAlt className="mr-2 h-4 w-4" /> Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Link href={`/${countryCode}/auth/login`} className={`bg-transparent border px-6 py-2 text-sm font-bold rounded-full transition-colors ${isHighlightsPage ? 'border-white text-white hover:bg-white hover:text-[#001D3D]' : 'border-[#FFD60A] text-[#FFD60A] hover:bg-[#FFD60A] hover:text-[#001D3D]'}`}>
                    LOGIN
                </Link>
            )}
          </div>

          <div className="flex items-center lg:hidden">
            <motion.button onClick={() => setMobileNavOpen(true)} className={`z-50 p-2 ${isHighlightsPage ? 'text-white' : 'text-[#FFD60A]'}`} aria-label="Open navigation menu">
              <FaBars className="w-7 h-7" />
            </motion.button>
          </div>
        </div>
      </header>
      
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />

      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        user={user}
        onLogoutClick={handleOpenLogoutModal}
      />
    </>
  );
}