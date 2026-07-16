// components/vehicle/CompactDealerInfo.tsx

'use client';

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import ReactDOM from "react-dom";
import {
  MapPin,
  Phone,
  Shield,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

// --- START: Reusable and Responsive Modal Component ---
// I've extracted the Modal logic into its own component for clarity and reusability.
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  // Effect to handle closing the modal with the 'Escape' key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative bg-white rounded-2xl w-full max-w-xs sm:max-w-sm md:max-w-md max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-2 right-2 z-10 p-1.5 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors"
              aria-label="Close image view"
            >
              <X className="w-5 h-5" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window !== "undefined") {
    return ReactDOM.createPortal(modalContent, document.body);
  }
  return null;
};
// --- END: Reusable and Responsive Modal Component ---

interface Dealer {
  id: number;
  name: string;
  location: string;
  city: string;
  phone: string;
  rating: string;
  imageUrl: string;
}

const dealersData: Dealer[] = [
    { id: 1, name: 'Remy Ruberambuga', location: 'Kabisa EV House', city: 'Kigali, Rwanda', phone: '+250 786295127', rating: 'Sales Agent', imageUrl: '/images/content/remy.jpg', },
    { id: 2, name: 'David Ntwari', location: 'Kabisa EV House', city: 'Kigali, Rwanda', phone: '+250 781 851 157', rating: 'Sales Agent', imageUrl: '/images/content/david.jpg', },
    { id: 3, name: 'Rodrigue Mucyo', location: 'Kabisa EV House', city: 'Kigali, Rwanda', phone: '+250 781122519', rating: 'Sales Agent', imageUrl: '/images/content/rodrigue.jpg', },
    { id: 4, name: 'Fidelis Karangwa', location: 'Kabisa EV House', city: 'Kigali, Rwanda', phone: '+250 783373372', rating: 'Sales Agent', imageUrl: '/images/content/fidelis.png', },
];


const CompactDealerInfo: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const currentDealer = dealersData[currentIndex];

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * dealersData.length);
    setCurrentIndex(randomIndex);
  }, []);

  const goToPrevious = () => setCurrentIndex((prev) => (prev === 0 ? dealersData.length - 1 : prev - 1));
  const goToNext = () => setCurrentIndex((prev) => (prev === dealersData.length - 1 ? 0 : prev + 1));

  return (
    <div className="relative w-full z-0">
      <div className="w-full bg-white/40 backdrop-blur-2xl rounded-3xl shadow-xl overflow-hidden border border-white/50 transition-shadow duration-300">
        {/* Top Banner Section */}
        <div className="relative h-28 bg-[#001D3D]">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="relative">
              <div className="w-24 h-24 relative">
                <Image
                  src={currentDealer.imageUrl}
                  alt={currentDealer.name}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full border-4 border-white/80 shadow-md object-cover cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setShowModal(true)}
                  unoptimized={true}
                  priority
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-7 h-7 rounded-full border-2 border-white/80 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4 bg-white backdrop-blur-md rounded-full px-3 py-1.5 text-slate-800 text-xs font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>Online</span>
          </div>
        </div>

        {/* Content Section (No changes here) */}
        <div className="pt-16 px-4 pb-4">
          <div className="mb-4 text-center">
            <h3 className="font-bold text-lg text-slate-900">{currentDealer.name}</h3>
            <p className="text-sm text-slate-600 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span>{currentDealer.rating}</span>
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 text-sm bg-white/50 rounded-2xl border border-white/30">
              <div className="w-9 h-9 rounded-xl bg-blue-100/70 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-slate-800 font-medium">{currentDealer.location}</p>
                <p className="text-xs text-slate-500">{currentDealer.city}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 text-sm bg-white/50 rounded-2xl border border-white/30">
              <div className="w-9 h-9 rounded-xl bg-blue-100/70 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-slate-800 font-medium">{currentDealer.phone}</p>
                <p className="text-xs text-slate-500">Available 24/7</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows (No changes here, but they are relatively responsive) */}
      <button onClick={goToPrevious} className="absolute top-1/2 -left-3 sm:-left-4 transform -translate-y-1/2 w-9 h-9 bg-white/70 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center hover:bg-white/90 border border-white/30 transition-all duration-200 z-10">
        <ChevronLeft className="w-5 h-5 text-slate-600" />
      </button>
      <button onClick={goToNext} className="absolute top-1/2 -right-3 sm:-right-4 transform -translate-y-1/2 w-9 h-9 bg-white/70 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center hover:bg-white/90 border border-white/30 transition-all duration-200 z-10">
        <ChevronRight className="w-5 h-5 text-slate-600" />
      </button>

      {/* Image Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        {/* Using aspect-ratio makes the image responsive while maintaining its shape */}
        <div className="w-full aspect-square relative">
            <Image
              src={currentDealer.imageUrl}
              alt={currentDealer.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 90vw, 384px"
            />
        </div>
        <h3 className="text-lg font-bold p-4 text-center text-slate-900 bg-white">
          {currentDealer.name}
        </h3>
      </Modal>
    </div>
  );
};

export default CompactDealerInfo;
