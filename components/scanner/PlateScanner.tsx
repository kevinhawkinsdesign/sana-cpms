'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, RotateCw } from 'lucide-react'
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
import Webcam from 'react-webcam'

interface LicensePlateDetectorProps {
  onDetect: (plateNumber: string | null) => void
}

const PlateScanner = ({ onDetect }: LicensePlateDetectorProps) => {
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [detectedPlate, setDetectedPlate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [cameraActive, setCameraActive] = useState(true)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  const processImage = useCallback(async (imageData: string) => {
    setIsProcessing(true)
    setError(null)
    
    try {
      // Call your Next.js App Router API route
      const response = await fetch('/api/detect-license-plate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      if (result.licensePlate) {
        setDetectedPlate(result.licensePlate)
        onDetect(result.licensePlate)
      } else {
        setDetectedPlate(null)
        setError("No license plate detected in the image")
      }
    } catch (err: any) {
      console.error("Error processing image:", err)
      setError(err.message || 'Failed to detect license plate')
      onDetect(null)
    } finally {
      setIsProcessing(false)
    }
  }, [onDetect])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Read the selected file
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64Image = e.target.result as string
        setImagePreview(base64Image)
        
        // Remove the data:image/jpeg;base64, prefix for the API
        const base64Data = base64Image.split(',')[1]
        processImage(base64Data)
      }
    }
    reader.readAsDataURL(file)
  }, [processImage])

  const captureFromWebcam = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        setImagePreview(imageSrc)
        
        // Remove the data:image/jpeg;base64, prefix for the API
        const base64Data = imageSrc.split(',')[1]
        processImage(base64Data)
      }
    }
  }, [processImage])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.dataTransfer.files && e.dataTransfer.files[0] && fileInputRef.current) {
      handleFileUpload({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>)
    }
  }, [handleFileUpload])

  const switchCamera = useCallback(() => {
    setFacingMode(prevMode => (prevMode === 'environment' ? 'user' : 'environment'))
  }, [])

  const handlePermissionAllow = useCallback(() => {
    setShowPermissionDialog(false)
    window.location.reload()
  }, [])

  const handlePermissionClose = useCallback(() => {
    setShowPermissionDialog(false)
    onDetect(null)
  }, [onDetect])

  const resetDetection = useCallback(() => {
    setImagePreview(null)
    setDetectedPlate(null)
    setError(null)
    setCameraActive(true)
  }, [])

  const handleWebcamError = useCallback(() => {
    setCameraActive(false)
    setShowPermissionDialog(true)
  }, [])

  return (
    <div className="space-y-4">
      {cameraActive && !imagePreview && (
        <div className="relative w-full aspect-video max-w-[400px] mx-auto overflow-hidden rounded-lg">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode,
              width: 1280,
              height: 720,
            }}
            className="w-full h-full object-cover"
            onUserMediaError={handleWebcamError}
          />
          
          <div className="absolute inset-x-0 bottom-0 p-2 bg-background/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Camera className="h-4 w-4" />
                <span className="text-sm font-medium">Position license plate in view</span>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={switchCamera}
                className="h-8 w-8 p-0"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="relative w-full max-w-[400px] mx-auto">
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="w-full rounded-lg object-contain max-h-[300px]"
          />
          {detectedPlate && (
            <div className="absolute top-0 right-0 bg-green-500 text-white px-2 py-1 text-xs rounded m-2">
              Detected: {detectedPlate}
            </div>
          )}
        </div>
      )}
      
      <div className="flex gap-2 justify-center">
        {!imagePreview ? (
          <>
            <Button 
              onClick={captureFromWebcam}
              disabled={isProcessing || !cameraActive}
              className="flex-1"
            >
              <Camera className="mr-2 h-4 w-4" />
              Capture
            </Button>
            
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={resetDetection}
            disabled={isProcessing}
            className="flex-1"
          >
            Try Again
          </Button>
        )}
      </div>
      
      {error && (
        <div className="text-center text-red-500 text-sm">
          {error}
        </div>
      )}
      
      {isProcessing && (
        <div className="text-center text-sm">
          <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent text-primary rounded-full mr-2" />
          Processing image...
        </div>
      )}

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

export default PlateScanner