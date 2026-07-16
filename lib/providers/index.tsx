"use client"

import { ToastProvider } from "./toast-provider"
import QueryProvider from "./query-provider"
import NextTopLoader from 'nextjs-toploader';
import { AnalyticsProvider } from "./analytics-provider"
import { AuthProvider } from "./auth-provider"
import { useEffect, useState } from "react"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // ALWAYS provide QueryProvider - just configure it differently
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider />
        {isClient && <NextTopLoader showSpinner={false} />}
        {isClient && <AnalyticsProvider />}
        {children}
      </AuthProvider>
    </QueryProvider>
  )
}

// Make sure to export as default as well
export default Providers