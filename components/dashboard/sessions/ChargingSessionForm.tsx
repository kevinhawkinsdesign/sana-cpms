'use client'

import { useSearchParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StartSession } from './StartSession'
import { EndSession } from './EndSession'
import { DASHBOARD_BASE } from '@/lib/utils/operatorNav'

export default function ChargingSessionForm({ basePath = DASHBOARD_BASE }: Readonly<{ basePath?: string }> = {}) {
  const searchParams = useSearchParams()
  const operation = searchParams.get('op') || 'start'

  return (
    <Card className="w-full">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="text-lg sm:text-xl">
          {operation === 'start' ? 'Start' : 'End'} Charging Session
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          {operation === 'start'
            ? 'Enter your charging details to begin'
            : 'Complete your charging session details'}
        </CardDescription>
      </CardHeader>
      <CardContent className="w-full px-3 sm:px-6 pb-4 sm:pb-6">
        {operation === 'start' ? <StartSession basePath={basePath} /> : <EndSession basePath={basePath} />}
      </CardContent>
    </Card>
  )
}