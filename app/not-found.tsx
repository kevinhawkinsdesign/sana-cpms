'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { CountryProvider } from '@/lib/providers/country-provider'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'

export default function NotFound() {
  const router = useLocalizedRouter()
  const [count, setCount] = useState(10)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (count > 0 && !isRedirecting) {
      const timer = setTimeout(() => setCount(count - 1), 1000)
      return () => clearTimeout(timer)
    } else if (count === 0 && !isRedirecting) {
      setIsRedirecting(true)
      router.push('/rw')
    }
  }, [count, isRedirecting, router])

  return (
    <CountryProvider countryCode="rw">
      <Navbar />
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-2">
            <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="text-xl font-medium">Page Not Found</h2>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Redirecting to home in {count} seconds...</p>
            </div>
            <Progress value={(10 - count) * 10} className="h-1" />
          </CardContent>

          <CardFooter className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Refresh
            </Button>
            <Button size="sm" onClick={() => router.push('/rw')}>
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </CountryProvider>
  )
}