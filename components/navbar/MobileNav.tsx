"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaChevronDown, FaSignOutAlt } from "react-icons/fa";
import { Phone, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEnumValue } from "@/lib/utils/formatters";
import { NAV_LINKS, SOCIAL_ICONS } from "../../constants/nav-constants";
import { User } from "@/lib/auth/authContext";
import { useCountry } from "@/lib/providers/country-provider";
import { LocalizedLink } from "../shared/LocalizedLink";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogoutClick: () => void;
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export function MobileNav({ isOpen, onClose, user, onLogoutClick }: MobileNavProps) {
  const [isDiscoverOpen, setDiscoverOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { countryCode } = useCountry();
  const isAuthenticated = !!user;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLinkClick = () => {
    // We don't reset discover state here, to allow for quick peeking
    onClose();
  };

  // Get user initials for avatar
  const getUserInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Don't render auth-dependent content during SSR
  if (!isClient) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-[#001D3D] text-white flex flex-col lg:hidden"
        >
          {/* === Header === */}
          <div className="flex items-center justify-between p-4 border-b border-[#FFD60A]/20 flex-shrink-0">
            <LocalizedLink href="/" onClick={handleLinkClick} aria-label="Go to homepage">
              <Image src="/kabisa.png" alt="Kabisa Logo" width={120} height={32} priority />
            </LocalizedLink>
            <motion.button
              onClick={onClose}
              className="text-[#FFD60A] p-2"
              aria-label="Close navigation menu"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaTimes className="w-6 h-6" />
            </motion.button>
          </div>

          {/* === Main Scrollable Content === */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4">
            {isAuthenticated && user && (
               <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
                <div className="flex items-center space-x-4 mb-4 p-3 bg-[#002451] rounded-xl">
                  {user.imageUrl ? (
                    <Image
                      className="h-14 w-14 rounded-full object-cover border-2 border-[#FFD60A]"
                      src={user.imageUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      width={56}
                      height={56}
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-[#FFD60A] text-[#001D3D] flex items-center justify-center font-bold text-lg border-2 border-[#FFD60A]">
                      {getUserInitials(user.firstName)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-[#FFD60A] font-bold text-lg truncate">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-gray-300">{formatEnumValue(user.role)}</p>
                  </div>
                </div>
                <LocalizedLink href="/dashboard" onClick={handleLinkClick} className="flex items-center w-full px-4 py-3 text-white bg-[#002451] hover:bg-[#FFD60A]/10 rounded-lg transition-colors font-semibold">
                    <Home className="w-5 h-5 mr-3 text-[#FFD60A]" /> Dashboard
                </LocalizedLink>
               </motion.div>
            )}

            {/* Navigation Links */}
            <motion.nav variants={listVariants} initial="hidden" animate="visible" className="flex flex-col gap-2">
              {NAV_LINKS.map((link) =>
                link.hasDropdown ? (
                  <motion.div key={link.label} variants={itemVariants}>
                    <button
                      onClick={() => setDiscoverOpen(!isDiscoverOpen)}
                      className="w-full flex justify-between items-center text-left py-3 px-4 rounded-lg bg-[#002451] text-lg font-semibold text-[#FFD60A] hover:bg-[#FFD60A]/10 transition-all"
                    >
                      <span>{link.label}</span>
                      <FaChevronDown className={cn("w-4 h-4 transition-transform", isDiscoverOpen && "rotate-180")}/>
                    </button>
                    <AnimatePresence>
                      {isDiscoverOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden pl-4 mt-1 space-y-1"
                        >
                          {link.subLinks?.map((subLink) => (
                            <Link key={subLink.href} href={`/${countryCode}${subLink.href}`} onClick={handleLinkClick} className="block py-2.5 px-4 text-gray-300 rounded hover:bg-[#FFD60A]/10 hover:text-white transition-colors font-medium">
                              {subLink.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div key={link.href} variants={itemVariants}>
                    <Link href={`/${countryCode}${link.href}`} onClick={handleLinkClick} className="block py-3 px-4 rounded-lg bg-[#002451] text-lg font-semibold text-[#FFD60A] hover:bg-[#FFD60A]/10 hover:text-white transition-all">
                      {link.label}
                    </Link>
                  </motion.div>
                )
              )}
            </motion.nav>
          </div>

          {/* === Footer === */}
          <div className="mt-auto p-4 border-t border-[#FFD60A]/20 bg-[#001D3D] flex-shrink-0">
             {isAuthenticated ? (
                <motion.button onClick={() => { onClose(); onLogoutClick(); }} className="w-full flex items-center justify-center gap-3 px-4 py-3 mb-4 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors duration-200 font-bold" aria-label="Logout">
                    <FaSignOutAlt className="w-5 h-5" />
                    Logout
                </motion.button>
             ) : (
                <Link href={`/${countryCode}/auth/login`} onClick={handleLinkClick} className="w-full block text-center bg-[#FFD60A] text-[#001D3D] font-bold py-3 rounded-lg text-lg hover:bg-white transition-colors mb-4">
                    LOGIN
                </Link>
             )}
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                {SOCIAL_ICONS.map(({ icon: Icon, href, label }) => (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="text-xl text-[#FFD60A] hover:text-white transition-all hover:scale-110" aria-label={`Visit our ${label}`}>
                    <Icon />
                  </a>
                ))}
              </div>
              <a href="tel:6420" className="flex items-center text-[#FFD60A] hover:text-white text-base font-semibold px-3 py-2 rounded-lg bg-[#002451]" aria-label="Call us at 6420">
                <Phone className="mr-2 h-4 w-4" />
                6420
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}