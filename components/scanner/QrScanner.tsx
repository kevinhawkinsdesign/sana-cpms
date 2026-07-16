'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, LightbulbOff, FlipHorizontal, RotateCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

let QrScanner: any = null

interface QRScannerProps {
  onScan: (id: string | null) => void
}

const QRScanner = ({ onScan }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<any | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [hasFlash, setHasFlash] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [showInvalidQRDialog, setShowInvalidQRDialog] = useState(false)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [qrScannerLoaded, setQrScannerLoaded] = useState(false)

  // Load QR scanner library dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('qr-scanner').then((module) => {
        QrScanner = module.default
        setQrScannerLoaded(true)
      }).catch(err => {
        console.error('Failed to load QR Scanner library:', err)
      })
    }
  }, [])

  const handleScan = useCallback((result: any) => {
    if (result.data) {
      try {
        const url = new URL(result.data)
        if (url.hostname === 'www.gokabisa.com' && url.pathname === '/scan') {
          const id = url.searchParams.get('id')
          if (id) {
            onScan(id)
            if (navigator.vibrate) {
              navigator.vibrate(200)
            }
          }
        } else {
          setShowInvalidQRDialog(true)
        }
      } catch (_) {
        console.error(_)
        setShowInvalidQRDialog(true)
      }
    }
  }, [onScan])

  const startScanner = useCallback(async () => {
    if (!scannerRef.current || !videoRef.current) return

    try {
      await scannerRef.current.start()
      setIsScanning(true)
    } catch (error) {
      console.error('Failed to start scanner:', error)
      setShowPermissionDialog(true)
    }
  }, [])

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop()
      setIsScanning(false)
    }
  }, [])

  const initializeScanner = useCallback(async () => {
    if (!videoRef.current || !QrScanner) return

    try {
      const cameras = await QrScanner.listCameras(true)
      setHasMultipleCameras(cameras.length > 1)

      scannerRef.current = new QrScanner(
        videoRef.current,
        handleScan,
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: facingMode,
        }
      )

      const hasFlash = await scannerRef.current.hasFlash()
      setHasFlash(hasFlash)

      await startScanner()
    } catch (error) {
      console.error('Failed to initialize scanner:', error)
      setShowPermissionDialog(true)
    }
  }, [facingMode, handleScan, startScanner])

  useEffect(() => {
    // Initialize scanner when the library is loaded
    if (qrScannerLoaded) {
      initializeScanner()
    }

    return () => {
      stopScanner()
      if (scannerRef.current) {
        scannerRef.current.destroy()
      }
    }
  }, [initializeScanner, stopScanner, qrScannerLoaded])

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current) return

    try {
      await scannerRef.current.toggleFlash()
      setTorchOn(prev => !prev)
    } catch (error) {
      toast.error(`Failed to toggle flash: ${(error as Error).message}`)
    }
  }, [])

  const switchCamera = useCallback(async () => {
    if (!hasMultipleCameras) {
      toast.error("This device doesn't support multiple cameras")
      return
    }

    stopScanner()
    if (scannerRef.current) {
      scannerRef.current.destroy()
      scannerRef.current = null
    }

    setFacingMode(prevMode => (prevMode === 'environment' ? 'user' : 'environment'))

    setTimeout(() => {
      initializeScanner()
    }, 300)
  }, [hasMultipleCameras, initializeScanner, stopScanner])

  const handlePermissionAllow = useCallback(() => {
    setShowPermissionDialog(false)
    window.location.reload()
  }, [])

  const handlePermissionClose = useCallback(() => {
    setShowPermissionDialog(false)
    onScan(null)
  }, [onScan])

  return (
    <div className="space-y-2">
      <div className="relative w-full aspect-square max-w-[300px] mx-auto">
        <video
          ref={videoRef}
          className="w-full h-full object-cover rounded-lg"
          autoPlay
          playsInline
        />
        <div className="absolute inset-0 bg-black/50">
          <div className="absolute inset-4 border-2 border-white/50 rounded-lg"></div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/80 backdrop-blur-sm rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Camera className="h-4 w-4" />
              <span className="text-sm font-medium">
                {!qrScannerLoaded ? 'Loading scanner...' : isScanning ? 'Scanning...' : 'Starting scanner...'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {hasFlash && (
                <Button
                  size="sm"
                  variant={torchOn ? "default" : "outline"}
                  onClick={toggleTorch}
                  className={cn(
                    "h-8 w-8 p-0",
                    torchOn && "bg-yellow-500 hover:bg-yellow-600"
                  )}
                >
                  <LightbulbOff className="h-4 w-4" />
                </Button>
              )}

              {hasMultipleCameras && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={switchCamera}
                  className="h-8 w-8 p-0"
                >
                  <FlipHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showInvalidQRDialog} onOpenChange={setShowInvalidQRDialog}>
        <DialogContent className="max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Invalid QR Code</DialogTitle>
            <DialogDescription>
              This is not a valid Kabisa QR code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              size="sm" 
              className="w-full" 
              onClick={() => setShowInvalidQRDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Camera Permission Required</DialogTitle>
            <DialogDescription>
              Please allow camera access and refresh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button 
              size="sm"
              variant="outline" 
              onClick={handlePermissionClose}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button 
              size="sm"
              onClick={handlePermissionAllow}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default QRScanner