'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void//this is a comment
}) {
  const router = useLocalizedRouter()
  const [count, setCount] = useState(10)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (count > 0 && !isRedirecting) {
      const timer = setTimeout(() => setCount(count - 1), 1000)
      return () => clearTimeout(timer)
    } else if (count === 0 && !isRedirecting) {
      setIsRedirecting(true)
      router.back()
    }
  }, [count, isRedirecting, router])

  return (
    <>
      <Navbar />
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
            <h2 className="text-xl font-medium">Something went wrong</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>An unexpected error occurred. Please try again later.</p>
              <p className="mt-2">Returning to previous page in {count} seconds...</p>
            </div>
            <Progress value={(10 - count) * 10} className="h-1" />
          </CardContent>
          <CardFooter className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Refresh
            </Button>
            <Button size="sm" onClick={() => router.back()}>
              Back
            </Button>
            <Button size="sm" onClick={() => router.push('/')}> 
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </>
  )
}