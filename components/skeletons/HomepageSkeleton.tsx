'use client'

import { Skeleton } from '@/components/ui/skeleton'

type SkeletonType = 'cars' | 'charging' | 'maintenance' | 'ecosystem' | 'testimonials' | 'articles'

interface HomepageSkeletonProps {
  type: SkeletonType
}

export default function HomepageSkeleton({ type }: HomepageSkeletonProps) {
  switch (type) {
    case 'cars':
      return <CarsSkeleton />
    case 'charging':
      return <ChargingSkeleton />
    case 'maintenance':
      return <MaintenanceSkeleton />
    case 'ecosystem':
      return <EcosystemSkeleton />
    case 'testimonials':
      return <TestimonialsSkeleton />
    case 'articles':
      return <ArticlesSkeleton />
    default:
      return <DefaultSkeleton />
  }
}

function CarsSkeleton() {
  return (
    <div className="w-full bg-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col">
              <Skeleton className="w-full aspect-video rounded-lg mb-4" />
              <Skeleton className="h-6 w-3/4 mb-3" />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <Skeleton className="h-12 w-48 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function ChargingSkeleton() {
  return (
    <div className="w-full bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12">
          <Skeleton className="h-[780px] rounded-2xl" />
          <Skeleton className="h-[780px] rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

function MaintenanceSkeleton() {
  return (
    <div className="relative min-h-screen bg-black">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="py-20 px-8 md:px-16">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-6">
              <Skeleton className="h-16 w-4/5 bg-gray-800" />
              <Skeleton className="h-8 w-1/2 bg-gray-800" />
              <Skeleton className="h-4 w-20 bg-gray-800" />
              <Skeleton className="h-24 w-full bg-gray-800" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 bg-gray-800 rounded-xl" />
              <Skeleton className="h-32 bg-gray-800 rounded-xl" />
            </div>
            <Skeleton className="h-40 w-full bg-gray-800" />
            <Skeleton className="h-12 w-40 bg-gray-800 rounded-lg" />
          </div>
        </div>
        <Skeleton className="hidden lg:block h-screen bg-gray-900" />
      </div>
    </div>
  )
}

function EcosystemSkeleton() {
  return (
    <div className="w-full bg-white mt-1">
      <div className="w-full">
        <div className="relative w-full min-h-[600px] flex items-center justify-center overflow-hidden mt-8">
          <Skeleton className="w-full h-full object-contain" />
        </div>
      </div>
    </div>
  )
}

function TestimonialsSkeleton() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <Skeleton className="h-10 w-64 mx-auto" />
        </div>
        <div className="relative overflow-hidden">
          <div className="flex gap-8 py-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="w-40 h-40 flex-shrink-0 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ArticlesSkeleton() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col">
              <Skeleton className="w-full aspect-video rounded-lg mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DefaultSkeleton() {
  return (
    <div className="w-full py-16">
      <div className="max-w-7xl mx-auto px-4">
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    </div>
  )
}