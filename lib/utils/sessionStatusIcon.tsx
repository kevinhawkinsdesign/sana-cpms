import { Play, Pause, Square, XCircle, Activity } from 'lucide-react'

export function getSessionStatusIcon(status: string) {
  const normalized = status?.toUpperCase() ?? ''
  switch (normalized) {
    case 'STARTED':
      return <Play className="h-4 w-4 text-blue-500" />
    case 'PAUSED':
      return <Pause className="h-4 w-4 text-yellow-500" />
    case 'COMPLETED':
      return <Square className="h-4 w-4 text-red-500" />
    case 'PAID':
      return <Square className="h-4 w-4 text-green-500" />
    case 'CANCELLED':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <Activity className="h-4 w-4 text-gray-500" />
  }
}
