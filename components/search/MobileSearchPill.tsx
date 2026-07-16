import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileSearchPillProps {
  onExpand: () => void;
}

export function MobileSearchPill({ onExpand }: MobileSearchPillProps) {
  return (
    <motion.button
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50
                 bg-white rounded-full shadow-lg px-6 py-3
                 flex items-center gap-2 min-w-[280px] max-w-[90vw]
                 hover:shadow-xl transition-shadow"
      onClick={onExpand}
      whileTap={{ scale: 0.98 }}
      aria-label="Open search"
    >
      <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
      <span className="text-gray-500 flex-1 text-left">
        Search chargers...
      </span>
    </motion.button>
  );
}
