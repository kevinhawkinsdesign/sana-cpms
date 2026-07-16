'use client';

import React from "react";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface OrderConfirmationProps {
  orderId: string | null;
  onClose: () => void;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  orderId,
  onClose
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="w-full max-w-md mx-auto bg-white p-8 rounded-2xl"
  >
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative mx-auto mb-6"
      >
        <div className="absolute inset-0 bg-green-400/20 rounded-full blur-xl" />
        <div className="relative mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-tr from-green-500 to-emerald-400 shadow-lg shadow-green-500/30">
          <CheckCircle className="h-10 w-10 text-white" strokeWidth={2.5} />
        </div>
      </motion.div>
      <h2 className="text-3xl font-bold text-gray-800 mb-3">
        Order Confirmed!
      </h2>
      <p className="text-gray-600 text-lg mb-8">
        Thank you for your order. We'll be in touch shortly with next steps.
      </p>
      <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl p-6 mb-8 border border-gray-200/80">
        <p className="text-gray-600 text-sm font-medium mb-1">
          Order Reference
        </p>
        <p className="text-xl font-bold text-gray-800 font-mono tracking-wide">
          {orderId}
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-full py-4 px-6 bg-black text-white text-lg font-semibold rounded-xl
        hover:bg-black/90 transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
      >
        Continue Shopping
      </button>
    </div>
  </motion.div>
);

export default OrderConfirmation;