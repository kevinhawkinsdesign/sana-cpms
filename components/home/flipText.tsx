'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FlipText = () => {
    const words = ["EV Dealer", "EV Garage Network", "Charging Network"];
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % words.length);
        }, 2000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="inline-block min-w-[180px] md:min-w-[250px] relative overflow-hidden h-6 md:h-10"> {/* Fixed height */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={words[currentIndex]}
                    className="absolute top-0 left-0 w-full text-left"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                    {words[currentIndex]}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default React.memo(FlipText);