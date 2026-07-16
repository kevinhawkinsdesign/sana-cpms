'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, StopCircle } from 'lucide-react'
import ChargingSessionForm from './ChargingSessionForm'
// import { ChargingTourGuide } from '@/tours/ChargingTourGuide'
import api from '@/lib/api/api'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'

export default function ChargingSessionClient() {
  const router = useLocalizedRouter()
  const searchParams = useSearchParams()
  const [shouldShowTour, setShouldShowTour] = useState(false)
  
  const operation = searchParams.get('op') || 'start'

  const handleTabChange = (value: string) => {
    // Create new URLSearchParams object to preserve other parameters
    const params = new URLSearchParams(searchParams.toString())
    params.set('op', value)
    router.push(`/dashboard/charge/session?${params.toString()}`)
  }

  useEffect(() => {
    if (!searchParams.has('op')) {
      handleTabChange('start')
    }
  }, [])

  // Check user's tour status
  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        const response = await api(false, true).get('/api/user/profile')
        if (response.data && response.data.hasSeenTour === false) {
          setShouldShowTour(true)
        }
      } catch (error) {
        console.error('Error fetching tour status:', error)
      }
    }

    checkTourStatus()
  }, [])

  return (
    <div className="container mx-auto py-4 sm:py-6 min-h-screen px-2 sm:px-4">
      <Tabs 
        value={operation} 
        onValueChange={handleTabChange}
        className="max-w-xl mx-auto w-full"
      >
        <TabsList className="grid grid-cols-2 w-full tabs-list">
          <TabsTrigger 
            value="start" 
            className="flex items-center gap-2"
            data-tab="start"
          >
            <Play className="h-4 w-4" />
            Start Session
          </TabsTrigger>
          <TabsTrigger 
            value="end" 
            className="flex items-center gap-2"
            data-tab="end"
          >
            <StopCircle className="h-4 w-4" />
            End Session
          </TabsTrigger>
        </TabsList>
        <TabsContent value="start" className="mt-4 sm:mt-6">
          <div className="charging-form overflow-y-auto max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-250px)]">
            <ChargingSessionForm />
          </div>
        </TabsContent>
        <TabsContent value="end" className="mt-4 sm:mt-6">
          <div className="charging-form overflow-y-auto max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-250px)]">
            <ChargingSessionForm />
          </div>
        </TabsContent>
      </Tabs>
      {/* {shouldShowTour && <ChargingTourGuide autoStart={shouldShowTour} />} */}
    </div>
  )
}