"use client"

import React from "react"

const DefaultSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-12 bg-gray-200 rounded-lg mb-6"></div>
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <React.Fragment key={i}>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded-lg"></div>
        </React.Fragment>
      ))}
    </div>
    <div className="h-12 bg-gray-200 rounded-lg mt-8 w-1/3 mx-auto"></div>
  </div>
)

export default DefaultSkeleton