"use client"

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

type LoadingSize = 'xs' | 'sm' | 'md' | 'lg';

interface LoadingProps {
  fullScreen?: boolean;
  size?: LoadingSize;
  text?: string;
  className?: string;
  logo?: boolean;
}

const sizeConfig: Record<LoadingSize, { width: number; height: number }> = {
  xs: { width: 16, height: 16 },
  sm: { width: 24, height: 24 },
  md: { width: 48, height: 48 },
  lg: { width: 96, height: 96 }
};

export const Loading: React.FC<LoadingProps> = ({ 
  fullScreen = false,
  size = 'md',
  text = "Loading...",
  className,
  logo = true
}) => {
  const dimensions = sizeConfig[size];

  if (fullScreen) {
    return (
      <div 
        className={cn(
          "fixed inset-0 z-50 flex justify-center items-center bg-background/80 backdrop-blur-sm",
          className
        )}
      >
        <LoadingAnimation 
          dimensions={dimensions} 
          text={text}
          logo={logo}
        />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex justify-center items-center w-full h-full min-h-[200px]",
        className
      )}
    >
      <LoadingAnimation 
        dimensions={dimensions} 
        text={text}
        logo={logo}
      />
    </div>
  );
};

interface LoadingAnimationProps {
  dimensions: { width: number; height: number };
  text?: string;
  logo?: boolean;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ 
  dimensions, 
  text = "Loading...",
  logo = true
}) => {
  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {logo ? (
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
      ) : (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
          className="border-t-2 border-primary rounded-full"
          style={{ 
            width: dimensions.width, 
            height: dimensions.height,
            borderRadius: "50%" 
          }}
        />
      )}
      
      {text && (
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
          {text}
        </motion.p>
      )}
    </motion.div>
  );
};

export default Loading;