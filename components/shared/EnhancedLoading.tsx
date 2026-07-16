"use client"

import React from "react"
import { motion } from "framer-motion"
import Image from "next/image"

interface EnhancedLoadingProps {
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  skeletonItems?: number
  message?: string
}

const EnhancedLoading: React.FC<EnhancedLoadingProps> = ({
  fullScreen = false,
  size = 'md',
  className = '',
  skeletonItems = 3,
  message = 'Loading form...'
}) => {
  const dimensions = {
    sm: { width: 60, height: 60 },
    md: { width: 100, height: 100 },
    lg: { width: 140, height: 140 }
  }[size]

  const Container = ({ children }: { children: React.ReactNode }) => {
    if (fullScreen) {
      return (
        <div className={`fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center ${className}`}>
          {children}
        </div>
      )
    }
    return (
      <div className={`relative w-full h-full min-h-[300px] flex items-center justify-center ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <Container>
      <div className="relative w-full max-w-lg">
        {/* Skeleton content positioned below */}
        <motion.div 
          className="w-full mx-auto px-4"
          animate={{ 
            opacity: [0.4, 0.7, 0.4] 
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        >
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg w-3/4 mx-auto mb-8"></div>
            
            {[...Array(skeletonItems)].map((_, i) => (
              <div key={i} className="mb-8">
                <div className="h-5 bg-gray-200 rounded-lg w-1/3 mb-3"></div>
                <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
              </div>
            ))}
            
            <div className="h-12 bg-gray-200 rounded-lg w-2/3 mx-auto mt-12"></div>
          </div>
        </motion.div>

        {/* Centered logo overlay with high z-index */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              y: [0, -3, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Image 
              src="/kabisa.png"
              alt="Kabisa"
              width={dimensions.width}
              height={dimensions.height}
              className="object-contain"
              priority
            />
          </motion.div>
          <motion.p
            className="mt-4 text-gray-600 text-base font-medium text-center"
            animate={{
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {message}
          </motion.p>
        </div>
      </div>
    </Container>
  )
}

export default EnhancedLoading