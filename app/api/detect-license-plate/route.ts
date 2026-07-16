import { NextRequest, NextResponse } from 'next/server';
import { RekognitionClient, DetectTextCommand } from "@aws-sdk/client-rekognition";

// License plate validation removed to support custom plates like NAMBIAR

// Function to normalize license plate text
function normalizeLicensePlate(text: string): string {
  return text.replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
}

// Function to find license plate in detected text
function findLicensePlate(textDetections: any[]): string | null {
  // Sort by confidence (highest first)
  const sortedDetections = [...textDetections].sort((a, b) => (b.Confidence || 0) - (a.Confidence || 0));
  
  // Look for texts that could be a license plate (removed pattern validation to support custom plates)
  for (const detection of sortedDetections) {
    if (detection.Confidence > 60 && (detection.Type === 'LINE' || detection.Type === 'WORD')) {
      const normalizedText = normalizeLicensePlate(detection.DetectedText);
      
      // Accept any alphanumeric text that looks like a license plate (3-10 characters)
      if (normalizedText.length >= 3 && normalizedText.length <= 10 && /^[A-Z0-9]+$/.test(normalizedText)) {
        return normalizedText;
      }
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' }, 
        { status: 400 }
      );
    }

    // Create an AWS Rekognition client
    const client = new RekognitionClient({
      region: process.env.AWS_REGION_FAKE!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID_FAKE!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_FAKE!,
      },
    });

    // Convert base64 to binary
    const imageBuffer = Buffer.from(image, 'base64');

    // Call Rekognition DetectText API
    const command = new DetectTextCommand({
      Image: {
        Bytes: imageBuffer,
      },
    });

    const response = await client.send(command);
    
    // Find license plate in the detected text
    let licensePlate = null;
    if (response.TextDetections && response.TextDetections.length > 0) {
      licensePlate = findLicensePlate(response.TextDetections);
    }
    
    // Return the response with license plate
    return NextResponse.json({
      success: true,
      licensePlate,
      raw: response.TextDetections
    });
  } catch (error) {
    console.error('Error calling AWS Rekognition:', error);
    return NextResponse.json(
      { error: 'Error processing image' }, 
      { status: 500 }
    );
  }
}