import { NextRequest, NextResponse } from 'next/server'

// Mock implementation - replace with actual backend integration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plate = searchParams.get('plate')

    if (!plate) {
      return NextResponse.json({
        status: 'error',
        message: 'License plate is required',
        error: {
          code: 'VALIDATION_ERROR',
          details: 'License plate parameter is missing'
        }
      }, { status: 400 })
    }

    // Mock data - replace with actual database query
    const mockVehicles = [
      {
        id: 'vehicle-1',
        kabisaId: 'VEH-001',
        make: 'Tesla',
        model: 'Model 3',
        vin: '1HGBH41JXMN109186',
        batteryCapacity: 75.0,
        imageUrl: 'https://example.com/tesla-model3.jpg',
        createdAt: '2024-01-01T00:00:00.000Z',
        currentOwnership: {
          type: 'business',
          ownerName: 'Acme Corporation',
          ownerId: 'business-123',
          assignedAt: '2024-01-01T00:00:00.000Z'
        }
      },
      {
        id: 'vehicle-2',
        kabisaId: 'VEH-002',
        make: 'BMW',
        model: 'i3',
        vin: '2HGBH41JXMN109187',
        batteryCapacity: 42.2,
        imageUrl: 'https://example.com/bmw-i3.jpg',
        createdAt: '2024-01-15T00:00:00.000Z',
        currentOwnership: {
          type: 'individual',
          ownerName: 'John Doe',
          ownerId: 'user-456',
          assignedAt: '2024-01-15T00:00:00.000Z'
        }
      }
    ]

    // Check if vehicle exists (case-insensitive)
    const existingVehicle = mockVehicles.find(v => 
      v.id.toLowerCase().includes(plate.toLowerCase()) || 
      v.kabisaId.toLowerCase().includes(plate.toLowerCase())
    )

    if (!existingVehicle) {
      return NextResponse.json({
        status: 'success',
        data: {
          exists: false
        }
      })
    }

    // Return existing vehicle data
    return NextResponse.json({
      status: 'success',
      data: {
        exists: true,
        vehicle: {
          id: existingVehicle.id,
          kabisaId: existingVehicle.kabisaId,
          make: existingVehicle.make,
          model: existingVehicle.model,
          vin: existingVehicle.vin,
          batteryCapacity: existingVehicle.batteryCapacity,
          imageUrl: existingVehicle.imageUrl,
          createdAt: existingVehicle.createdAt
        },
        currentOwnership: existingVehicle.currentOwnership,
        canAssign: true,
        reason: null
      }
    })

  } catch (error) {
    console.error('Error checking vehicle by license:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: {
        code: 'INTERNAL_ERROR',
        details: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}

