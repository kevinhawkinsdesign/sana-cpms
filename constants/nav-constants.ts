import { FaInstagram, FaFacebookF, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

export const DISCOVER_LINKS = [
  { label: "Press & Stories", href: "/highlights" },
  { label: "Contact", href: "/contact" },
  { label: "Careers", href: "/careers" },
  { label: "Financing", href: "/financing" },
  { label: "Test Drive", href: "/testdrive" },
  { label: "FAQS", href: "/FAQ" },
];

export const SOCIAL_ICONS = [
  { icon: FaInstagram, href: "https://www.instagram.com/gokabisa/", label: "Instagram" },
  { icon: FaFacebookF, href: "https://www.facebook.com/gokabisa/", label: "Facebook" },
  { icon: FaXTwitter, href: "https://x.com/gokabisa", label: "X/Twitter" },
  { icon: FaLinkedinIn, href: "https://www.linkedin.com/company/gokabisa", label: "LinkedIn" },
];

export const NAV_LINKS = [
  { label: "VEHICLES", href: "/shop" },
  { label: "CHARGING", href: "/charge" },
  { label: "MAINTENANCE", href: "/maintenance" },
  {
    label: "DISCOVER",
    href: "#",
    hasDropdown: true,
    subLinks: DISCOVER_LINKS,
  },
];