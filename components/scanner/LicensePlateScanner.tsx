
// @ts-nocheck

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, Copy, Check, RefreshCw, LightbulbIcon, FlipHorizontal, RotateCw } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';

// License plate pattern removed to support custom plates like NAMBIAR

type LicensePlate = {
  value: string;
  raw: string;
  timestamp: Date;
  confidence?: number;
};

interface LicensePlateScannerProps {
  onCapture?: (plate: LicensePlate | null) => void;
  defaultOpen?: boolean;
  fullScreen?: boolean;
}

const LicensePlateScanner = ({ 
  onCapture, 
  defaultOpen = false,
  fullScreen = false 
}: LicensePlateScannerProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<string>('camera');
  const [capturing, setCapturing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [continuousScan, setContinuousScan] = useState<boolean>(false);
  const [detectedPlates, setDetectedPlates] = useState<LicensePlate[]>([]);
  const [detectedTexts, setDetectedTexts] = useState<string[]>([]);
  const [selectedPlate, setSelectedPlate] = useState<LicensePlate | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tesseractLoaded, setTesseractLoaded] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasFlash, setHasFlash] = useState<boolean>(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Load Tesseract.js dynamically only on client side
  useEffect(() => {
    let isMounted = true;
    
    const loadTesseract = async () => {
      try {
        // Dynamic import of Tesseract.js
        const Tesseract = await import('tesseract.js');
        
        if (isMounted) {
          const worker = await Tesseract.createWorker();
          
          // Load and initialize Tesseract with English language
          await worker.load();
          await worker.reinitialize('eng');
          
          // Optimize for license plate detection with character whitelist
          await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
          });
          
          workerRef.current = worker;
          setTesseractLoaded(true);
        }
      } catch (error) {
        console.error('Failed to initialize Tesseract worker:', error);
        if (isMounted) {
          setError('OCR engine initialization failed. Please refresh and try again.');
        }
      }
    };
    
    loadTesseract();
    
    return () => {
      isMounted = false;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);
  
  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Check for multiple cameras
  const checkDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
    } catch (err) {
      console.error('Error checking devices:', err);
    }
  }, []);

  useEffect(() => {
    if (open && activeTab === 'camera') {
      checkDevices();
    }
  }, [open, activeTab, checkDevices]);
  
  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCapturing(false);
    setContinuousScan(false);
    setTorchOn(false);
  }, []);
  
  // Toggle flash/torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;
      
      const capabilities = track.getCapabilities();
      
      // Check if torch is supported
      if (!capabilities.torch) {

        return;
      }
      
      const newTorchState = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: newTorchState }] });
      setTorchOn(newTorchState);
    } catch (err) {
      console.error('Error toggling torch:', err);
    }
  }, [torchOn]);
  
  // Start camera with proper error handling
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Stop any existing streams
      stopCamera();
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access');
      }
      
      // Request camera permissions with current facing mode
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      // Try to get the requested camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        // Check if flash is available
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities();
          setHasFlash(!!capabilities.torch);
        }
        
      } catch (envError) {
        console.warn(`Could not access ${facingMode} camera, trying alternate camera`, envError);
        
        // Fallback to other camera
        const fallbackMode = facingMode === 'environment' ? 'user' : 'environment';
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: fallbackMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        streamRef.current = stream;
        
        // Update facing mode to what we actually got
        setFacingMode(fallbackMode);
      }
      
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
          throw new Error('Could not start video stream');
        });
        setCapturing(true);
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setError(`Camera access error: ${err.message || 'Could not access camera'}`);
      setCapturing(false);
      setShowPermissionDialog(true);
    }
  }, [facingMode, stopCamera]);
  
  // Switch between front and back cameras
  const switchCamera = useCallback(() => {
    if (!hasMultipleCameras) return;
    
    // Toggle facing mode
    setFacingMode(prevMode => (prevMode === 'environment' ? 'user' : 'environment'));
    
    // Restart camera with new facing mode
    setTimeout(() => {
      startCamera();
    }, 300);
  }, [hasMultipleCameras, startCamera]);
  
  // Format license plate to standard format (remove spaces and special characters)
  const formatLicensePlate = (text: string): string | null => {
    // Remove spaces and special characters, keep only alphanumeric
    const cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Accept any alphanumeric text that looks like a license plate (3-10 characters)
    if (cleaned.length >= 3 && cleaned.length <= 10) {
      return cleaned;
    }
    
    return null;
  };
  
  // Process image to detect license plate
  const processImage = async (imageData: ImageData | string): Promise<LicensePlate | null> => {
    if (!workerRef.current || !tesseractLoaded) {
      setError('OCR engine is not loaded yet. Please wait or refresh the page.');
      return null;
    }
    
    try {
      setLoading(true);
      
      const result = await workerRef.current.recognize(imageData);
      const rawText = result.data.text.trim();
      
      // Store all detected text blocks
      const allTextLines = rawText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      setDetectedTexts(prevTexts => {
        // Combine new texts with previous ones and remove duplicates
        const combined = [...prevTexts, ...allTextLines];
        return [...new Set(combined)].slice(-20); // Keep only the last 20 unique texts
      });
      
      
      
      // Try to match license plate pattern
      const formattedPlate = formatLicensePlate(rawText);
      
      // Also try to match license plate in each line individually
      let bestMatch: string | null = formattedPlate;
      let bestConfidence = 0;
      
      if (!bestMatch) {
        for (const line of allTextLines) {
          const lineMatch = formatLicensePlate(line);
          if (lineMatch) {
            // Find the word with the highest confidence
            const words = result.data.words || [];
            const matchingWord = words.find(w => w.text.includes(lineMatch));
            const confidence = matchingWord?.confidence || 0;
            
            if (confidence > bestConfidence) {
              bestMatch = lineMatch;
              bestConfidence = confidence;
            }
          }
        }
      }
      
      if (bestMatch) {
        const plate: LicensePlate = {
          value: bestMatch,
          raw: rawText,
          timestamp: new Date(),
          confidence: bestConfidence || undefined
        };
        
        // Add to detected plates
        setDetectedPlates(prev => {
          // Check if already exists
          const exists = prev.some(p => p.value === plate.value);
          if (!exists) {
            return [...prev, plate];
          }
          return prev;
        });
        
        setSelectedPlate(plate);
        
        // Call onCapture callback if provided
        if (onCapture) {
          onCapture(plate);
        }
        
        return plate;
      }
      
      return null;
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Error processing image. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Take a snapshot from the video feed
  const takeSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current || !capturing) return;
    
    setScanning(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data from canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Process the image
      await processImage(imageData);
    } catch (err) {
      console.error('Error taking snapshot:', err);
      setError('Error capturing image. Please try again.');
    } finally {
      setScanning(false);
    }
  };
  
  // Handle continuous scanning
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (continuousScan && capturing && !scanning) {
      intervalId = setInterval(takeSnapshot, 2000); // Scan every 2 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [continuousScan, capturing, scanning]);
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {
      try {
        setScanning(true);
        setError(null);
        
        // Process the file
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          const result = e.target?.result;
          if (result && typeof result === 'string') {
            await processImage(result);
          }
        };
        
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Error processing file. Please try a different image.');
      } finally {
        setScanning(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };
  
  // Copy plate to clipboard
  const copyPlate = () => {
    if (selectedPlate) {
      navigator.clipboard.writeText(selectedPlate.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Copy text to clipboard
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Handle dialog open/close
  useEffect(() => {
    if (open) {
      if (activeTab === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
    }
  }, [open, activeTab, startCamera, stopCamera]);
  
  // Reset component state
  const resetState = () => {
    setDetectedPlates([]);
    setDetectedTexts([]);
    setSelectedPlate(null);
    setError(null);
  };
  
  // Handle permission dialog actions
  const handlePermissionAllow = () => {
    setShowPermissionDialog(false);
    window.location.reload();
  };
  
  const handlePermissionClose = () => {
    setShowPermissionDialog(false);
    setActiveTab('upload');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex gap-2">
            <Camera size={16} />
            <span>Scan License Plate</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className={`${fullScreen ? 'w-screen h-screen max-w-none max-h-none p-0 m-0 rounded-none' : 'max-w-3xl'}`}>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>License Plate Scanner</DialogTitle>
          </DialogHeader>
          
          <div className="px-4 pb-4">
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              if (value === 'camera') {
                startCamera();
              } else {
                stopCamera();
              }
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="camera">Camera</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>
              
              <TabsContent value="camera" className="space-y-4">
                <div className="relative rounded-md overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {!capturing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/75">
                      <Button onClick={startCamera}>
                        <Camera className="mr-2 h-4 w-4" />
                        Start Camera
                      </Button>
                    </div>
                  )}
                  
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="animate-pulse text-white flex flex-col items-center">
                        <RefreshCw className="animate-spin h-8 w-8 mb-2" />
                        <span>Scanning...</span>
                      </div>
                    </div>
                  )}
                  
                  {capturing && !scanning && (
                    <>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        <Button 
                          variant="secondary" 
                          onClick={takeSnapshot}
                          disabled={scanning || !capturing}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Capture
                        </Button>
                        
                        <Button
                          variant={continuousScan ? "destructive" : "outline"}
                          onClick={() => setContinuousScan(prev => !prev)}
                          disabled={scanning || !capturing}
                        >
                          {continuousScan ? "Stop Scanning" : "Start Auto Scan"}
                        </Button>
                      </div>
                      
                      <div className="absolute top-2 right-2 flex space-x-2">
                        {hasFlash && (
                          <Button
                            size="sm"
                            variant={torchOn ? "default" : "outline"}
                            onClick={toggleTorch}
                            className={`h-8 w-8 p-0 ${torchOn ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
                          >
                            <LightbulbIcon className="h-4 w-4" />
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
                    </>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="upload">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={scanning}
                        />
                      </div>
                      
                      <p className="text-sm text-muted-foreground text-center">
                        Upload an image containing a license plate with format XXX000X
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Results</h3>
                
                {(detectedPlates.length > 0 || detectedTexts.length > 0) && (
                  <Button variant="ghost" size="sm" onClick={resetState}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              <Tabs defaultValue="plates" className="w-full">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="plates">License Plates</TabsTrigger>
                  <TabsTrigger value="texts">All Detected Text</TabsTrigger>
                </TabsList>
                
                <TabsContent value="plates">
                  {selectedPlate ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl">Detected License Plate</CardTitle>
                        <CardDescription>
                          Detected at {selectedPlate.timestamp.toLocaleTimeString()}
                          {selectedPlate.confidence !== undefined && ` (Confidence: ${Math.round(selectedPlate.confidence)}%)`}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge className="text-xl p-2">{selectedPlate.value}</Badge>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyPlate}
                            disabled={copied}
                          >
                            {copied ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center p-6 border rounded-md bg-muted/20">
                      <p className="text-muted-foreground">
                        {loading ? 'Processing...' : 'No license plate detected yet'}
                      </p>
                    </div>
                  )}
                  
                  {detectedPlates.length > 1 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">History</h4>
                      <div className="flex flex-wrap gap-2">
                        {detectedPlates.map((plate, index) => (
                          <Badge
                            key={`${plate.value}-${index}`}
                            variant={selectedPlate?.value === plate.value ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => setSelectedPlate(plate)}
                          >
                            {plate.value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="texts">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">All Detected Text</CardTitle>
                      <CardDescription>
                        Showing all text found in images
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      {detectedTexts.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {detectedTexts.map((text, index) => (
                            <div 
                              key={index}
                              className="flex justify-between items-center p-2 border rounded hover:bg-muted/20"
                            >
                              <span className="font-mono text-sm">{text}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => copyText(text)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <p className="text-muted-foreground">No text detected yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          <DialogClose asChild>
            <div className="px-4 py-4 flex justify-end border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </DialogClose>
        </DialogContent>
      </Dialog>
      
      {/* Camera permission dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Camera Permission Required</DialogTitle>
            <DialogDescription>
              Please allow camera access and refresh the page to use the scanner.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button 
              size="sm"
              variant="outline" 
              onClick={handlePermissionClose}
            >
              <X className="h-4 w-4 mr-2" />
              Use Upload Instead
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
    </>
  );
};

export default LicensePlateScanner;