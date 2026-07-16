'use client'

import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check, Loader2, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import { getUniqueSerialNumber } from '@/lib/utils/vehicleUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Image from 'next/image'
import api from '@/lib/api/api'
import PDFGenerator from './PDFGenerator'

interface IQrCodeCard {
  serialNumber: string
  qrCodeUrl: string
  onSelect: (id: string) => void
}

interface PopupKabisaGeneratorProps {
  onSelectId?: (id: string) => void
  onClose?: () => void
  onGenerationStart?: () => void
  onGenerationEnd?: () => void
}

// QR Code Card Component
const QRCodeCard = ({ serialNumber, qrCodeUrl, onSelect }: IQrCodeCard) => {
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(serialNumber)
      setCopied(true)
      toast.success("Serial number copied")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy")
    }
  }



  const formattedSerial = `${serialNumber.slice(0, 4)} ${serialNumber.slice(4)}`

  return (
    <div
      className="bg-[#003566] text-[#ffc300] rounded-3xl flex flex-col items-center justify-between shadow-lg transition-all duration-300 hover:shadow-xl"
      style={{ width: '5cm', height: '7cm', padding: '0.25cm' }}
    >
      <div className="w-full flex justify-center items-center">
        <Image src='/kabisaa.png' alt="KABISA" width={120} height={40} className="h-10 w-auto object-contain" />
      </div>
      
      <div className="text-center flex items-center gap-2">
        <p className="text-lg font-mono font-bold">{formattedSerial}</p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 text-[#ffc300] hover:text-[#ffc300]/80"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy serial number</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div ref={qrRef} className="flex justify-center items-center bg-white p-1 rounded-lg shadow-inner">
        <QRCodeSVG
          value={qrCodeUrl}
          size={120}
          level="H"
          includeMargin={false}
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>

      <div className="text-center mt-1 mb-1">
        <p className="text-xs font-mono">For assistance call</p>
      </div>

      <div className="flex items-center justify-center w-full gap-2">
        <Image src='/images/kabisaId/phone_yellow.png' width={24} height={24} className="w-6 h-auto" alt="Phone" />
        <span className="text-xl font-bold">6420</span>
      </div>

      <Button 
        className="w-full mt-2 bg-[#ffc300] text-[#003566] hover:bg-[#ffc300]/90"
        onClick={() => onSelect(serialNumber)}
      >
        Use This ID
      </Button>
    </div>
  )
}

const PopupKabisaGenerator = ({ onSelectId, onClose, onGenerationStart, onGenerationEnd }: PopupKabisaGeneratorProps) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentSerialNumbers, setCurrentSerialNumbers] = useState<string[]>([])
  const [results, setResults] = useState<Array<{ serialNumber: string; qrCodeUrl: string; }>>([])
  const [isCustomIdModalOpen, setIsCustomIdModalOpen] = useState(false)
  const [customId, setCustomId] = useState('')

  const fetchSerialNumbers = async () => {
    setLoading(true)
    try {
      // Try the new admin API first, fallback to old API
      try {
        const res = await api().get('/api/admin/kabisa-ids')
        const kabisaIds = res.data?.data?.kabisaIds || []
        const serialNumbers = kabisaIds.map((id: any) => id.kabisaId).filter(Boolean)
        setCurrentSerialNumbers(serialNumbers)
      } catch (adminError) {
        // Fallback to old API
        const res = await api().get('/api/serial-numbers')
        const serialNumbers = res.data?.data || []
        setCurrentSerialNumbers(Array.isArray(serialNumbers) ? serialNumbers : [])
      }
    } catch (error) {
      console.error('Failed to retrieve serial numbers:', error)
      // Set empty array as fallback
      setCurrentSerialNumbers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSerialNumbers()
  }, [])

  const handleGenerate = () => {
    onGenerationStart?.()
    const serialNumber = getUniqueSerialNumber(currentSerialNumbers)
    setCurrentSerialNumbers(prev => [...prev, serialNumber])
    setResults([{
      serialNumber,
      qrCodeUrl: `https://www.gokabisa.com/scan?id=${encodeURIComponent(serialNumber)}`
    }])
    onGenerationEnd?.()
  }

  const handleCustomIdGenerate = () => {
    if (!customId.trim()) {
      toast.error('Please enter a custom ID')
      return
    }
    
    onGenerationStart?.()
    setResults([{
      serialNumber: customId.trim().toUpperCase(),
      qrCodeUrl: `https://www.gokabisa.com/scan?id=${encodeURIComponent(customId.trim().toUpperCase())}`
    }])
    setIsCustomIdModalOpen(false)
    setCustomId('')
    onGenerationEnd?.()
  }

  const handleSelectId = async (id: string) => {
    setSaving(true)
    try {
      // Try the new admin API first, fallback to old API
      try {
        await api().post('/api/admin/kabisa-ids', { 
          kabisaId: id,
          kabisaIdType: 'CHARGER' // Default type, can be changed later
        })
      } catch (adminError) {
        // Fallback to old API
        await api().post('/api/serial-numbers', { 
          serialNumbers: [id] 
        })
      }
      
      if (onSelectId) {
        onSelectId(id)
        if (onClose) onClose()
      }
      toast.success('ID saved and selected successfully')
    } catch (error) {
      console.error('Failed to save ID:', error)
      toast.error('Failed to save ID')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setIsCustomIdModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Edit3 className="h-4 w-4" />
          Custom ID
        </Button>
        <Button
          onClick={() => handleGenerate()}
          disabled={loading || saving}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate New ID'
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <QRCodeCard
              serialNumber={results[0].serialNumber}
              qrCodeUrl={results[0].qrCodeUrl}
              onSelect={handleSelectId}
            />
          </div>
          
          {/* PDF Generator */}
          <PDFGenerator
            items={results}
            onSaveComplete={() => {
              toast.success('PDF downloaded successfully!');
            }}
          />
        </div>
      )}

      {/* Custom ID Modal */}
      <Dialog open={isCustomIdModalOpen} onOpenChange={setIsCustomIdModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Custom Kabisa ID</DialogTitle>
            <DialogDescription>
              Enter your own custom Kabisa ID to generate a QR code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customId">Kabisa ID</Label>
              <Input
                id="customId"
                placeholder="Enter custom ID (e.g., KABISA123)"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCustomIdModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCustomIdGenerate}>
                Generate QR Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PopupKabisaGenerator