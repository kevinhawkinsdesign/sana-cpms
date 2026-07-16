"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import EnhancedLoading from "./EnhancedLoading"

interface IframeLoaderProps {
  src: string
  title?: string
  height?: string | number
  className?: string
  allowFullScreen?: boolean
  loadingSize?: 'sm' | 'md' | 'lg'
  skeletonItems?: number
}

const IframeLoader: React.FC<IframeLoaderProps> = ({
  src,
  title,
  height = '800px',
  className = '',
  allowFullScreen = true,
  loadingSize = 'md',
  skeletonItems = 3
}) => {
  const [isLoading, setIsLoading] = useState(true)

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  return (
    <div className={`iframe-container relative ${className}`} style={{ minHeight: "300px" }}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-start pt-8 bg-white">
          <div className="w-full max-w-md">
            <EnhancedLoading 
              size={loadingSize} 
              skeletonItems={skeletonItems}
            />
          </div>
        </div>
      )}
      
      <motion.div 
        className="iframe-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <iframe
          src={src}
          title={title || "Embedded content"}
          className="w-full"
          style={{ 
            background: "transparent", 
            border: "none",
            height: typeof height === 'number' ? `${height}px` : height
          }}
          onLoad={handleIframeLoad}
          onWheel={(e) => e.stopPropagation()}
          allowFullScreen={allowFullScreen}
        />
      </motion.div>
    </div>
  )
}

export default IframeLoader