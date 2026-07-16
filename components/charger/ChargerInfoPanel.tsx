"use client";

import React, { useState } from "react";
import {
  MapPin,
  Plus,
  Phone,
  X,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { LocalizedLink } from "../shared/LocalizedLink";

interface InfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ isOpen, onClose, onOpen }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const infoItems = [
    {
      icon: <MapPin className="text-emerald-500" size={20} />,
      title: "Coverage",
      description:
        "Never more than 30km from a charger on major roads in Rwanda",
    },
    {
      icon: <Lightbulb className="text-emerald-500" size={20} />,
      title: "See Charging Stations",
      description: "Learn more about charging.",
      link: "/charge",
    },
    {
      icon: <Plus className="text-emerald-500" size={20} />,
      title: "Host a Charger",
      description: "Partner with us to expand Rwanda's charging network",
      link: "/contact",
    },
  ];

  const Panel = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="space-y-4">
      {/* Header */}
      <div className="w-full bg-gray-800 py-3 px-4 shadow-md rounded-lg">
        <h2 className="text-lg font-bold text-white text-center">
          KABISA Charging Network
        </h2>
      </div>

      {/* Info Items */}
      <div className="max-h-[calc(100vh-100px)] overflow-y-auto space-y-3 pr-2">
        {infoItems.map((item, index) => (
          <div
            key={index}
            className="flex gap-2 group hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            {item.link ? (
              <LocalizedLink href={item.link} className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-1">{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </LocalizedLink>
            ) : (
              <>
                <div className="flex-shrink-0 mt-1">{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="border-t pt-3">
        <LocalizedLink
          href="/contact"
          className="flex items-center gap-2 text-emerald-500 hover:text-emerald-600 font-medium text-sm px-2"
        >
          <Phone size={16} />
          Contact for partnerships
        </LocalizedLink>
      </div>
    </div>
  );

  return (
    <div>
      {/* Desktop Panel */}
      <div className="hidden lg:block absolute left-5 top-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-40 w-72 mt-7">
        <Panel />
      </div>

      {/* Mobile Panel */}
      <div className="lg:hidden">
        {!isMobileOpen ? (
          <button
            onClick={() => setIsMobileOpen(true)}
            className="fixed left-4 top-4 z-40 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-emerald-500 hover:text-emerald-600 transition-colors"
          >
            <span>Learn More</span>
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="fixed inset-0 bg-black/50 z-30">
            <div className="absolute left-4 top-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-40 w-72">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              <Panel mobile />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoPanel;