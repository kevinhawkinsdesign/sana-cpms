"use client"

import { useEffect, useState } from "react"
import ReactGA from "react-ga4"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ClarityAnalytics } from "@/components/shared/ClarityAnalytics"

function AnalyticsContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GA_ID) {
      ReactGA.initialize(process.env.NEXT_PUBLIC_GA_ID);
    }
  }, []);

  useEffect(() => {
    if (pathname && isClient) {
      const searchString = searchParams?.toString() || ''
      ReactGA.send({
        hitType: "pageview",
        page: pathname + (searchString ? `?${searchString}` : ""),
      });
    }
  }, [pathname, searchParams, isClient]);

  return (
    <>
      <ClarityAnalytics clarityId={process.env.NEXT_PUBLIC_CLARITY_ID || ''} />
    </>
  );
}

export function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <AnalyticsContent />
    </Suspense>
  );
}