'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/authContext'
import { KabisaLoader } from '@/components/shared/KabisaLoader'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    // If user is not authenticated and not loading, store the current path as return URL
    if (!isLoading && !isAuthenticated && typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('returnUrl', pathname)
      } catch (error) {
        // Handle SecurityError (sandboxed iframe) or other localStorage errors
        if (error instanceof DOMException) {
          console.warn('localStorage access denied for returnUrl:', error.message);
        }
      }
    }
  }, [isAuthenticated, isLoading, pathname])

  // Show loading state while checking authentication
  if (isLoading) {
    return <KabisaLoader label="Loading…" />
  }

  // If not authenticated, show fallback or redirect to login
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    // Default fallback - redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }

  // If authenticated, render the protected content
  return <>{children}</>
}
