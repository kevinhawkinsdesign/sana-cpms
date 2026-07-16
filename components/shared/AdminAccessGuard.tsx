'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { AlertCircle } from 'lucide-react'

interface AdminAccessGuardProps {
  children: React.ReactNode
}

export function useAdminAccess() {
  const { user, isLoading } = useAuth()
  const router = useLocalizedRouter()

  const isAdminOrOrgAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ORGANIZATION_ADMIN

  useEffect(() => {
    if (!isLoading && user && !isAdminOrOrgAdmin) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router, isAdminOrOrgAdmin])

  return { user, isLoading, isAdminOrOrgAdmin }
}

export function AdminAccessGuard({ children }: AdminAccessGuardProps) {
  const { user, isLoading, isAdminOrOrgAdmin } = useAdminAccess()

  if (isLoading) {
    return null
  }

  if (!user || !isAdminOrOrgAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function OrgAdminAccessGuard({ children }: AdminAccessGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useLocalizedRouter()

  const hasAccess = user?.role === UserRole.ORGANIZATION_ADMIN || user?.role === UserRole.ADMIN

  useEffect(() => {
    if (!isLoading && user && !hasAccess) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router, hasAccess])

  if (isLoading) {
    return null
  }

  if (!user || !hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  if (!user.organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organization</h2>
          <p className="text-gray-600">You are not assigned to any organization.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
