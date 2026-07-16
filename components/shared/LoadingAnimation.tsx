"use client"

import { motion } from "framer-motion"
import Image from "next/image"

interface LoadingAnimationProps {
  dimensions: { width: number; height: number }
}

const LoadingAnimation = ({ dimensions }: LoadingAnimationProps) => {
  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          y: [0, -10, 0]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <Image 
          src="/kabisa_logo.png"
          alt="Loading..."
          width={dimensions.width}
          height={dimensions.height}
          className="object-contain"
          priority
        />
      </motion.div>
      <motion.p
        className="mt-4 text-primary text-sm font-medium"
        animate={{
          opacity: [0.6, 1, 0.6]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        Loading...
      </motion.p>
    </motion.div>
  )
}

export default LoadingAnimation