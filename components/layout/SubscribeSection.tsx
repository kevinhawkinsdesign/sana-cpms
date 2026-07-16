'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ArrowUp } from "lucide-react";
import api from "@/lib/api/api";

const SubscribeSection = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await api().post("/api/mailchimp/subscribe", { email });
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="bg-[#001D3D] text-white rounded-lg">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center flex flex-col items-center -mt-2"
          >
            <Check className="h-16 w-16 text-[#4DE6D3] mb-4 animate-pulse" />
            <h2 className="text-xl font-bold mb-2 bg-gradient-to-r from-[#4DE6D3] to-[#3BFFD0] text-transparent bg-clip-text">
              Welcome Aboard!
            </h2>
            <p className="text-sm text-gray-300 mb-4 max-w-[250px]">
              You're now part of our innovation journey. Get ready for inspiring updates!
            </p>
            <div className="w-1/2 h-1 bg-gradient-to-r from-[#4DE6D3] to-[#3BFFD0] rounded-full animate-pulse" />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h3 className="text-lg font-bold mb-3 text-[#FFD60A]">Subscribe</h3>
            <p className="text-sm mb-4 text-gray-300">
              Stay updated with our latest news and offers. Enter your email and hit subscribe!
            </p>

            <form onSubmit={handleSubscribe} className="relative">
              <div className="flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={status === "loading"}
                  className="w-full bg-transparent border-b border-[#FFD60A] text-sm text-gray-300 placeholder-gray-500 focus:outline-none py-2 transition-all duration-300 focus:border-white disabled:opacity-50"
                  required
                />
                <motion.button
                  type="submit"
                  disabled={status === "loading"}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="ml-3 bg-[#FFD60A] text-[#001D3D] p-2 rounded-full font-semibold transition-colors duration-200 hover:bg-white disabled:opacity-50"
                >
                  {status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </motion.button>
              </div>

              {status === "error" && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-2 text-sm text-red-400"
                >
                  Oops! Something went wrong. Please try again.
                </motion.p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubscribeSection;