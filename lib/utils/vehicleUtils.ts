import api from '@/lib/api/api'

// Function to generate VIN Check Digit
export function generateVINCheckDigit(vin: string, checkDigitPosition: number): string {
    const charValues: { [key: string]: number } = {
        A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2,
        L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6,
        X: 7, Y: 8, Z: 9
    }

    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

    let sum = 0

    for (let i = 0; i < vin.length; i++) {
        if (i === checkDigitPosition) continue
        const char = vin[i].toUpperCase()
        let value: number
        if (isNaN(parseInt(char))) {
            value = charValues[char] || 0
        } else {
            value = parseInt(char)
        }
        sum += value * weights[i % weights.length]
    }

    const remainder = sum % 11
    return remainder === 10 ? 'X' : remainder.toString()
}

// Function to generate Serial Number
export const generateSerialNumber = (): string => {
    const randomId = generateRandomId()
    const checkDigit = generateVINCheckDigit(randomId.slice(0, 4) + "_" + randomId.slice(4), 4)
    return `${randomId.slice(0, 4)}${checkDigit}${randomId.slice(4)}`
}

// Helper function to generate Random ID
const generateRandomId = (): string => {
    return Math.random().toString(36).substring(2, 9).toUpperCase().replace(/[OIQ]/g, '0')
}

export function getUniqueSerialNumber(currentSerialNumbers: string[] | null): string {
    let serialNumber: string = ""
    let isUnique = false

    // Handle null or undefined currentSerialNumbers
    const existingNumbers = currentSerialNumbers || []

    while (!isUnique) {
        serialNumber = generateSerialNumber()
        isUnique = !existingNumbers.includes(serialNumber)
    }

    return serialNumber
}

export async function getAirtableSerialNumbers(): Promise<string[]> {
    try {
        const baseIdOps = "appXpIapfoCVnPaZJ"
        const tableId = "Generated Kabisa IDs"
        const serialNumberFieldId = "Kabisa ID"

        let allSerialNumbers: string[] = []
        let offset: string | undefined

        do {
            const url = `https://api.airtable.com/v0/${baseIdOps}/${tableId}?fields%5B%5D=${serialNumberFieldId}${offset ? `&offset=${offset}` : ''}`
            const res = await api().get(url)

            const newSerialNumbers = res.data.records.map((record: any) => record.fields[serialNumberFieldId])
            allSerialNumbers = allSerialNumbers.concat(newSerialNumbers)

            offset = res.data.offset
        } while (offset)

        return allSerialNumbers
    } catch (error) {
        console.error("Error fetching serial numbers from Airtable:", error)
        return []
    }
}

export async function addSerialNumbersToAirtable(serialNumbers: string[]): Promise<{ success: boolean, message: string }> {
    try {
        const baseId = "appXpIapfoCVnPaZJ"
        const tableId = "Generated Kabisa IDs"
        const url = `https://api.airtable.com/v0/${baseId}/${tableId}`

        const chunkSize = 10
        for (let i = 0; i < serialNumbers.length; i += chunkSize) {
            const chunk = serialNumbers.slice(i, i + chunkSize)

            const records = chunk.map(serialNumber => ({
                fields: {
                    "Kabisa ID": serialNumber
                }
            }))

            await api().post(url, {
                records: records
            })
        }
        return { success: true, message: `${serialNumbers.length} serial numbers saved to Airtable.` }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

/**
 * Vehicle utility functions for handling vehicle data and license plates
 */

export interface LicensePlate {
  id: string
  licencePlateNumber: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Vehicle {
  id: string
  kabisaId: string
  model: string
  make: string
  vin: string
  imageUrl: string | null
  batteryCapacity: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  licensePlates?: LicensePlate[]
}

/**
 * Known multi-word vehicle makes. Used by `splitMakeModel` so a string like
 * "Range Rover Sport" splits to { make: "Range Rover", model: "Sport" } rather
 * than corrupting the make. Match is case-insensitive on full tokens.
 */
const MULTI_WORD_MAKES: string[] = [
  'Range Rover',
  'Land Rover',
  'Aston Martin',
  'Alfa Romeo',
  'Great Wall',
  'Rolls Royce',
  'Rolls-Royce',
  'Mercedes Benz',
  'Mercedes-Benz',
  'Lynk & Co',
  'Lynk and Co',
]

/**
 * Split a combined "make model" string (as used by CarModelSelect) into separate
 * make and model fields. Multi-word makes (see MULTI_WORD_MAKES) are matched
 * first; otherwise the first whitespace-delimited token is treated as the make.
 */
export function splitMakeModel(combined: string | undefined | null): { make: string; model: string } {
  const trimmed = (combined || '').trim()
  if (!trimmed) return { make: '', model: '' }

  const lower = trimmed.toLowerCase()
  for (const make of MULTI_WORD_MAKES) {
    const needle = make.toLowerCase()
    // Match either the whole string (make-only) or "make<space>..." prefix.
    if (lower === needle) return { make, model: '' }
    if (lower.startsWith(needle + ' ')) {
      return { make, model: trimmed.slice(make.length + 1).trim() }
    }
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { make: parts[0], model: '' }
  return { make: parts[0], model: parts.slice(1).join(' ') }
}

/**
 * Join make and model into a single string matching the CarModelSelect format.
 */
export function joinMakeModel(make: string | undefined | null, model: string | undefined | null): string {
  return `${make || ''} ${model || ''}`.trim()
}

/**
 * Gets the latest active license plate from a vehicle
 * @param vehicle - The vehicle object
 * @returns The latest active license plate or null if none found
 */
export function getVehicleLicensePlateNumber(vehicle: Vehicle | undefined): string {
  if (!vehicle?.licensePlates || vehicle.licensePlates.length === 0) {
    return ""
  }

  // Filter for active license plates
  const activePlates = vehicle.licensePlates.filter(plate => plate.isActive)
  
  if (activePlates.length === 0) {
    return ""
  }

  // Sort by creation date (newest first) and return the latest
  const sortedPlates = activePlates.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return sortedPlates[0].licencePlateNumber
}