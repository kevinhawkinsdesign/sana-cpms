'use client';

import React from "react";
import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaArrowUp,
  FaInstagram,
  FaFacebookF,
  FaLinkedinIn,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Link from 'next/link';
import { Phone } from "lucide-react";
import { motion } from "framer-motion";
import SubscribeSection from "./SubscribeSection";
import { LocalizedLink } from "../shared/LocalizedLink";

interface NavLink {
  label: string;
  href: string;
}

const Footer: React.FC = () => {
  const navLinks: NavLink[] = [
    { label: 'Home', href: '/' },
    { label: 'Vehicles', href: '/shop' },
    { label: 'Charging', href: '/charge' },
    { label: 'Maintenance', href: '/maintenance' },
    { label: 'Contact', href: '/contact' }
  ];

  const socialIcons = [
    {
      icon: FaInstagram,
      href: "https://www.instagram.com/gokabisa/",
      label: "Instagram",
    },
    {
      icon: FaFacebookF,
      href: "https://www.facebook.com/gokabisa/",
      label: "Facebook",
    },
    { icon: FaXTwitter, href: "https://x.com/gokabisa", label: "X" },
    {
      icon: FaLinkedinIn,
      href: "https://www.linkedin.com/company/gokabisa",
      label: "LinkedIn",
    },
  ];

  const handleAddressClick = () => {
    const exactMapLink = "https://maps.app.goo.gl/r3FGKCNbBBrDxQw26";
    window.open(exactMapLink, "_blank", "noopener,noreferrer");
  };

  return (
    <footer className="bg-[#001D3D] text-white py-12 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Contact Info Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between mb-16 space-y-8 lg:space-y-0">
          {/* Phone */}
          <div className="flex items-center md:w-1/3">
            <Link href="tel:6420" passHref>
              <motion.div 
                className="flex items-center group hover:opacity-90 transition-opacity duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="bg-[#FFD60A] rounded-full p-3 mr-4 group-hover:bg-white transition-colors duration-200">
                  <Phone className="text-[#001D3D]" />
                </div>
                <div>
                  <p className="text-xs font-light">Call us</p>
                  <p className="text-xs text-gray-300">6420</p>
                </div>
              </motion.div>
            </Link>
          </div>
          
          {/* Email */}
          <div className="flex items-center md:w-1/3">
            <Link href="mailto:info@gokabisa.com" passHref>
              <motion.div 
                className="flex items-center group hover:opacity-90 transition-opacity duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="bg-[#FFD60A] rounded-full p-3 mr-4 group-hover:bg-white transition-colors duration-200">
                  <FaEnvelope className="text-[#001D3D]" />
                </div>
                <div>
                  <p className="text-xs font-light">Write to us</p>
                  <p className="text-xs text-gray-300">info@gokabisa.com</p>
                </div>
              </motion.div>
            </Link>
          </div>
          
          {/* Address */}
          <div className="flex items-center md:w-1/3">
            <motion.button 
              onClick={handleAddressClick} 
              className="flex items-center group hover:opacity-90 transition-opacity duration-200 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="bg-[#FFD60A] rounded-full p-3 mr-4 group-hover:bg-white transition-colors duration-200">
                <FaMapMarkerAlt className="text-[#001D3D]" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-300">Kabisa EV House</p>
                <p className="text-xs text-gray-300">1 KN 77 St</p>
                <p className="text-xs text-gray-300">Kigali, Rwanda</p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row md:justify-between space-y-8 md:space-y-0">
          {/* About Section */}
          <div className="md:w-1/3 pr-8">
            <h3 className="font-bold text-base mb-4 text-[#FFD60A]">About Kabisa</h3>
            <p className="text-xs mb-3 text-gray-300">
              Find the perfect EV to match your needs at our shop.
            </p>
            <p className="text-xs mb-6 text-gray-300">
              Discover, buy, and drive away in the electric vehicle that's right for you.
            </p>
            <div className="flex space-x-4">
              {socialIcons.map(({ icon: Icon, href, label }) => (
                <Link key={label} href={href} target="_blank" rel="noopener noreferrer" passHref>
                  <motion.div
                    className="border border-[#FFD60A] rounded-full p-2 hover:bg-[#FFD60A] transition-colors duration-200"
                    whileHover={{ 
                      scale: 1.1, 
                      backgroundColor: "#FFD60A",
                      color: "#001D3D"
                    }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={label}
                  >
                    <Icon className="text-[#FFD60A] group-hover:text-[#001D3D] text-sm" />
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:w-1/3 px-8">
            <h3 className="font-bold text-base mb-3 text-[#FFD60A]">Quick Links</h3>
            <ul className="space-y-1.5">
              {navLinks.map((link) => (
                <li
                  key={link.label}
                  className="relative pl-4 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:bg-[#FFD60A] before:rounded-full"
                >
                  <motion.div whileHover={{ x: 3 }}>
                    <LocalizedLink
                      href={link.href}
                      className="text-xs text-gray-300 cursor-pointer hover:text-[#FFD60A] transition-colors duration-200"
                    >
                      {link.label}
                    </LocalizedLink>
                  </motion.div>
                </li>
              ))}
            </ul>
          </div>

          {/* Subscribe Section */}
          <div className="md:w-1/3 pl-8">
            <SubscribeSection />
          </div>
        </div>

        {/* Copyright and Scroll to Top */}
        <div className="mt-12 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} KABISA. All rights reserved.</p>
          <motion.button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="border border-[#FFD60A] rounded-full p-1.5 mt-4 md:mt-0 hover:bg-[#FFD60A] hover:text-[#001D3D] transition-colors duration-200"
            whileHover={{ 
              scale: 1.1, 
              backgroundColor: "#FFD60A" 
            }}
            whileTap={{ scale: 0.95 }}
            aria-label="Scroll to top"
          >
            <FaArrowUp className="text-[#FFD60A] hover:text-[#001D3D] text-sm" />
          </motion.button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;