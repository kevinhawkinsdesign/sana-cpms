"use client"

import React from "react"
import LoadingAnimation from "./LoadingAnimation"

interface LoadingProps {
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const Loading: React.FC<LoadingProps> = ({ 
  fullScreen = true,
  size = 'md'
}) => {
  const dimensions = {
    sm: { width: 24, height: 24 },
    md: { width: 48, height: 48 },
    lg: { width: 96, height: 96 }
  }[size]

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex justify-center items-center bg-background/80 backdrop-blur-sm">
        <LoadingAnimation dimensions={dimensions} />
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center w-full h-full min-h-[200px]">
      <LoadingAnimation dimensions={dimensions} />
    </div>
  )
}

export default Loading