'use client'

import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Color {
  colorCode: string;
  name: string;
}

interface VehicleColorsDisplayProps {
  colors: Color[];
  size?: 'sm' | 'md' | 'lg'
  limit?: number
}

// Helper function to normalize color data
const normalizeColor = (color: Color) => {
  return color
}

export default function VehicleColorsDisplay({ 
  colors, 
  size = 'md', 
  limit = 5 
}: VehicleColorsDisplayProps) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // Handle the case where colors might be undefined or null
  const safeColors = Array.isArray(colors) ? colors : []
  
  const [activeColor, setActiveColor] = useState<string | null>(
    safeColors.length > 0 ? 
      (typeof safeColors[0] === 'string' ? safeColors[0] : safeColors[0].colorCode) 
      : null
  )

  // Determine color size dimensions
  const dimensions = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  }[size]

  // Limit the number of displayed colors
  const displayColors = safeColors.slice(0, limit)
  const hasMore = safeColors.length > limit

  const colorMap: { [key: string]: string } = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    orange: "bg-orange-500",
    white: "bg-white border-2 border-gray-300",
    black: "bg-black",
    yellow: "bg-yellow-500",
    gray: "bg-gray-500",
    grey: "bg-gray-500",
    pink: "bg-pink-500",
    vanilla: "bg-yellow-200",
  };

  return (
    <div className="flex items-center gap-1">
      {displayColors.map((colorData, idx) => {
        const color = normalizeColor(colorData)
        return (
          <div key={idx} className="relative">
            <TooltipProvider key={idx} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={`Select ${color.name} color`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveColor(color.colorCode)
                    }}
                    className={`rounded-full ${dimensions} border-2 transition-all duration-200`}
                    style={{
                      backgroundColor: color.colorCode,
                      borderColor: activeColor === color.colorCode ? '#000' : 'transparent',
                      transform: activeColor === color.colorCode ? 'scale(1.1)' : 'scale(1)',
                    }}
                    onMouseEnter={() => setHoveredColor(color.name)}
                    onMouseLeave={() => setHoveredColor(null)}
                  ></button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{color.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {hoveredColor === color.name && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap z-10">
                {color.name}
              </div>
            )}
          </div>
        )
      })}
      
      {hasMore && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`${dimensions} flex items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs`}>
                +{safeColors.length - limit}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {safeColors.slice(limit).map(c => 
                  typeof c === 'string' ? c : c.name
                ).join(', ')}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}