'use client'

import { PlayCircle, QrCode, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'

export default function QuickActions() {
  const router = useLocalizedRouter()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="default"
          className="flex items-center gap-2"
          onClick={() => router.push('/dashboard/charge/session?op=start')}
        >
          <PlayCircle className="h-4 w-4" />
          Start New Session
        </Button>
        <Button
          variant="outline"
          size="default"
          className="flex items-center gap-2"
          onClick={() => router.push('/dashboard/scan')}
        >
          <QrCode className="h-4 w-4" />
          Quick Scan
        </Button>
        <Button
          variant="outline"
          size="default"
          className="flex items-center gap-2"
          onClick={() => router.push('/dashboard/charge/sessions')}
        >
          <History className="h-4 w-4" />
          View History
        </Button>
      </div>
    </div>
  )
}
