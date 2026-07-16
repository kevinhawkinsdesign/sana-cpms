'use client'

import { useState, useEffect, ReactNode, Suspense } from 'react'
import { useSearchParams as useNextSearchParams } from 'next/navigation'

export function SearchParamsWrapper({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-[20px]"></div>}>
      {children}
    </Suspense>
  )
}

export function useSearchParamsWrapper() {
  const searchParams = useNextSearchParams()
  const [params, setParams] = useState<Record<string, string>>({})
  
  useEffect(() => {
    const paramObject: Record<string, string> = {}
    searchParams?.forEach((value, key) => {
      paramObject[key] = value
    })
    setParams(paramObject)
  }, [searchParams])
  
  const get = (key: string): string | null => {
    return searchParams?.get(key) ?? null
  }
  
  const getAll = (key: string): string[] => {
    return searchParams ? Array.from(searchParams.getAll(key)) : []
  }
  
  const has = (key: string): boolean => {
    return searchParams?.has(key) ?? false
  }
  
  const entries = (): [string, string][] => {
    return searchParams ? Array.from(searchParams.entries()) : []
  }
  
  const toString = (): string => {
    return searchParams?.toString() ?? ''
  }
  
  return {
    // Original searchParams object
    searchParams,
    // Object version for easier access
    params,
    // Helper methods
    get,
    getAll,
    has,
    entries,
    toString,
  }
}

/**
 * Example usage in a component:
 * 
 * function MyComponent() {
 *   const { get, params } = useSearchParamsWrapper()
 *   const id = get('id')
 *   
 *   return <div>ID: {id}</div>
 * }
 * 
 * export default function MyPageComponent() {
 *   return (
 *     <SearchParamsWrapper>
 *       <MyComponent />
 *     </SearchParamsWrapper>
 *   )
 * }
 */