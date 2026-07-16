'use client'

import QRScanner from '@/components/scanner/QrScanner'
import { Card } from '@/components/ui/card'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'

export default function ScanPage() {
  const router = useLocalizedRouter()

  const handleScan = (id: string | null) => {
    if (id) {
      router.push(`/dashboard/charge/session?id=${id}`)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Scan QR Code</h1>
        <QRScanner onScan={handleScan} />
      </Card>
    </div>
  )
} 