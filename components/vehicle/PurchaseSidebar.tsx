// FILE: components/vehicle/PurchaseSidebar.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Shield,
  CreditCard,
  ListChecks,
  Users,
  Info,
  X,
  CheckCircle2,
  Clock,
  BadgeDollarSign,
  Wallet,
  ArrowRight,
  PhoneCall,
} from "lucide-react";
import { LocalizedLink } from "../shared/LocalizedLink";

interface ModalContent {
  title: string;
  content: React.ReactNode;
}

const modalContents: Record<string, ModalContent> = {
  "purchase-guide": {
    title: "EV Purchase Guide",
    content: (
      <div className="space-y-4">
        <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
          <h3 className="font-semibold text-lg text-blue-900 mb-1">
            Welcome to Kabisa
          </h3>
          <p className="text-blue-800/80 text-sm">
            We're here to guide you through your electric vehicle purchase
            journey.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 border rounded-2xl bg-white/50">
            <CheckCircle2 className="w-6 h-6 text-green-500 mb-2" />
            <h4 className="font-semibold mb-1 text-sm">Expert Consultation</h4>
            <p className="text-slate-600 text-xs">
              Choose the perfect EV for your needs.
            </p>
          </div>
          <div className="p-3 border rounded-2xl bg-white/50">
            <Clock className="w-6 h-6 text-blue-500 mb-2" />
            <h4 className="font-semibold mb-1 text-sm">Quick Process</h4>
            <p className="text-slate-600 text-xs">Get on the road faster.</p>
          </div>
        </div>
        <button className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 font-semibold">
          <PhoneCall className="w-5 h-5" />
          Contact Sales
        </button>
      </div>
    ),
  },
  "buy-safely": {
    title: "Safe Purchasing at Kabisa",
    content: (
      <div className="space-y-6">
        <div className="bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
          <Shield className="w-8 h-8 text-green-600 mb-2" />
          <h3 className="font-semibold text-lg mb-2 text-green-900">Our Safety Guarantee</h3>
          <p className="text-gray-700">All our vehicles come with:</p>
          <ul className="mt-2 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Full manufacturer warranty
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Quality assurance checks
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Secure payment processing
            </li>
          </ul>
        </div>
        <div className="border-t border-white/20 pt-4">
          <h4 className="font-semibold mb-3 text-slate-800">Have Questions?</h4>
          <LocalizedLink href="/contact">
            <button className="w-full bg-slate-800 text-white py-2.5 rounded-xl hover:bg-slate-900 transition flex items-center justify-center gap-2 font-semibold">
              Speak with an Advisor
              <ArrowRight className="w-4 h-4" />
            </button>
          </LocalizedLink>
        </div>
      </div>
    ),
  },
  "buy-now": { // UPDATED "Test Drive"
    title: "Start Your EV Journey",
    content: (
      <div className="space-y-6">
        <div className="p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl text-white shadow-lg">
          <h3 className="text-xl font-bold mb-2">Ready to Go Electric?</h3>
          <p className="opacity-90">
            Our team is ready to help you make the switch to electric mobility.
          </p>
        </div>
        <div className="p-4 border rounded-2xl bg-white/50">
          <BadgeDollarSign className="w-8 h-8 text-green-500 mb-2" />
          <h4 className="font-semibold mb-1 text-slate-800">Flexible Payment Options</h4>
          <p className="text-gray-600 text-sm">
            Choose from various payment plans and financing options.
          </p>
        </div>
        <div className="space-y-3">
          <LocalizedLink href="/contact">
            <button className="w-full border border-slate-300 py-3 rounded-xl hover:bg-slate-100/50 transition flex items-center justify-center gap-2 font-semibold text-slate-800">
              <PhoneCall className="w-5 h-5" />
              Request Callback
            </button>
          </LocalizedLink>
        </div>
      </div>
    ),
  },
  "purchase-steps": { // UPDATED "Purchase Steps"
    title: "Purchase Process Steps",
    content: (
      <div className="space-y-4">
        {[
          { step: 1, title: "Initial Consultation", description: "Discuss your needs with our EV experts", icon: Users },
          { step: 2, title: "Vehicle Selection", description: "Choose your perfect EV model", icon: ShoppingBag },
          { step: 3, title: "Documentation", description: "Complete necessary paperwork", icon: ListChecks },
          { step: 4, title: "Payment Processing", description: "Secure payment handling", icon: Wallet },
          { step: 5, title: "Vehicle Delivery", description: "Receive your new EV", icon: CheckCircle2 },
        ].map((step) => (
          <div key={step.step} className="flex items-start gap-4 p-4 bg-white/50 rounded-2xl border border-white/30">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg">
              {step.step}
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">{step.title}</h4>
              <p className="text-slate-600 text-sm">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  "payment-guide": { // UPDATED "Payment Options"
    title: "Payment Options",
    content: (
      <div className="space-y-6">
        <div className="bg-slate-100/50 p-4 rounded-2xl border border-white/20">
          <h3 className="font-semibold mb-3 text-slate-800">Available Payment Methods</h3>
          <div className="space-y-3">
            {[
              { method: "Bank Transfer", description: "Direct bank transfer to our secure account", icon: CreditCard },
              { method: "Financing", description: "Flexible financing options available", icon: BadgeDollarSign },
            ].map((method) => (
              <div key={method.method} className="flex items-start gap-4 p-3 bg-white/70 rounded-xl border">
                <method.icon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-slate-800">{method.method}</h4>
                  <p className="text-sm text-slate-600">{method.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 text-center">
            <LocalizedLink href="/contact">
                <button className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 font-semibold">
                    Discuss Payment Options
                    <ArrowRight className="w-4 h-4" />
                </button>
            </LocalizedLink>
            <p className="text-sm text-slate-500 px-4">
                Our finance team is ready to assist you with any questions.
            </p>
        </div>
      </div>
    ),
  },
};

const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/80 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="p-5 border-b border-white/20 relative">
            <h2 className="text-xl font-bold text-slate-900 text-center">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-800 bg-white/30 hover:bg-white/50 rounded-full p-1.5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const PurchaseSidebar: React.FC = () => {
  const [selectedModal, setSelectedModal] = useState<string | null>(null);

  const handleItemClick = (path: string) => {
    if (path.startsWith("http")) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    const modalKey = path.startsWith("/") ? path.substring(1) : path;
    setSelectedModal(modalKey);
  };

  const menuItems = [
    { title: "Purchase Guide", path: "/purchase-guide", icon: Info },
    { title: "Buy Safely", path: "/buy-safely", icon: Shield },
    { title: "Test Drive", path: "https://airtable.com/embed/appcxJlWp5SUD3aUU/pag0abXrye6lVh9bx/form", icon: ShoppingBag },
    { title: "Purchase Steps", path: "/purchase-steps", icon: ListChecks },
    { title: "Payment Options", path: "/payment-guide", icon: CreditCard },
  ];

  return (
    <>
      <div className="w-full bg-white/40 backdrop-blur-2xl rounded-3xl shadow-xl overflow-hidden border border-white/50 p-4">
        <div className="px-2 py-2">
          <h2 className="text-xl font-bold text-slate-800">How to Buy</h2>
        </div>
        <nav className="py-2 space-y-2">
          {menuItems.map((item, index) => (
            <motion.button
              key={index}
              onClick={() => handleItemClick(item.path)}
              className="w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center gap-4 text-slate-700 hover:bg-white/50 bg-white/30 border border-white/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <item.icon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold">{item.title}</span>
            </motion.button>
          ))}
        </nav>
      </div>

      {selectedModal && modalContents[selectedModal] && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedModal(null)}
          title={modalContents[selectedModal].title}
        >
          {modalContents[selectedModal].content}
        </Modal>
      )}
    </>
  );
};
export default PurchaseSidebar;