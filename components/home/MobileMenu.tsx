'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { LocalizedLink } from '../shared/LocalizedLink'

const vehicleCategories = [
  { classification: "SUV", label: "SUV" },
  { classification: "PICKUP", label: "Pickup" },
  { classification: "VAN", label: "Vans" },
  { classification: "TRUCK", label: "Trucks" },
  { classification: "REFRIGERATED", label: "Refrigerated" },
  { classification: "BUS", label: "Buses" },
]

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
    >
      <div className="absolute top-[72px] left-0 right-0 bottom-0">
        <button
          onClick={onClose}
          className="absolute right-4 top-8 p-2 rounded-full bg-gray-800"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="mt-20 px-4">
          {vehicleCategories.map((category) => (
            <LocalizedLink
              key={category.classification}
              href={`/shop?classification=${category.classification}`}
              onClick={onClose}
            >
              <motion.div
                whileHover={{ x: 10 }}
                className="py-4 text-white text-lg border-b border-gray-800 flex items-center justify-between"
              >
                {category.label}
                <span className="text-gray-500">→</span>
              </motion.div>
            </LocalizedLink>
          ))}
        </div>
      </div>
    </motion.div>
  )
}