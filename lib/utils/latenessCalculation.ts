import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { ShiftReport } from '@/lib/api/shiftsAndInspections'

// Extend dayjs with plugins
dayjs.extend(utc)
dayjs.extend(timezone)

const KIGALI_TIMEZONE = 'Africa/Kigali'

/**
 * Calculate check-in lateness for a shift report
 * @param report - The shift report with check-in time and shift schedule
 * @returns Minutes difference (positive = late, negative = early, null = cannot calculate)
 */
export function calculateCheckInLateness(report: ShiftReport): number | null {
  const shift = report.operatorShift

  // Validate required data
  if (!shift?.startTime || 
      shift.startTime === 'undefined' || 
      shift.startTime === 'null' || 
      (typeof shift.startTime === 'string' && shift.startTime.trim() === '') ||
      !shift?.dayOfWeek || 
      shift.dayOfWeek < 1 || 
      shift.dayOfWeek > 7 ||
      !report.checkInTime) {
    return null // Cannot calculate without shift schedule
  }

  // Step 1: Parse the actual check-in time (backend uses UTC but represents Kigali time)
  const checkInTime = dayjs(report.checkInTime).tz(KIGALI_TIMEZONE)

  // Step 2: Find the expected shift day
  // dayOfWeek: 1=Monday, 2=Tuesday, ..., 7=Sunday
  // JavaScript Date.getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  const checkInDay = checkInTime.day() === 0 ? 7 : checkInTime.day() // Convert JS day (0-6) to (1-7)
  const shiftDay = shift.dayOfWeek

  // Step 3: Calculate which date this shift falls on
  let daysDiff = shiftDay - checkInDay

  // Adjust if the shift day is far in the past/future
  // (Handles cases like checking in Tuesday for Monday's shift)
  if (daysDiff < -3) {
    daysDiff += 7 // Use next week's occurrence
  } else if (daysDiff > 3) {
    daysDiff -= 7 // Use last week's occurrence
  }

  // Step 4: Calculate the expected shift start date/time
  const expectedStartDate = checkInTime.add(daysDiff, 'days')

  // Step 5: Parse start time (format: "HH:mm" like "08:00")
  const [hours, minutes] = shift.startTime.split(':').map(Number)
  const expectedStartTime = expectedStartDate
    .hour(hours)
    .minute(minutes || 0)
    .second(0)
    .millisecond(0)

  // Step 6: Calculate difference in minutes
  const differenceMinutes = checkInTime.diff(expectedStartTime, 'minutes')

  return Math.round(differenceMinutes)
  // Positive = late (e.g., +15 = 15 minutes late)
  // Negative = early (e.g., -5 = 5 minutes early)
  // Zero = on time
}

/**
 * Calculate check-out lateness for a shift report
 * @param report - The shift report with check-out time and shift schedule
 * @returns Minutes difference (positive = late departure, negative = early departure, null = cannot calculate)
 */
export function calculateCheckOutLateness(report: ShiftReport): number | null {
  const shift = report.operatorShift

  // Validate required data
  if (!shift?.startTime || 
      !shift?.endTime || 
      shift.startTime === 'undefined' || 
      shift.endTime === 'undefined' || 
      shift.startTime === 'null' || 
      shift.endTime === 'null' ||
      (typeof shift.startTime === 'string' && shift.startTime.trim() === '') ||
      (typeof shift.endTime === 'string' && shift.endTime.trim() === '') ||
      !shift?.dayOfWeek || 
      shift.dayOfWeek < 1 || 
      shift.dayOfWeek > 7 ||
      !report.checkInTime || 
      !report.checkOutTime) {
    return null
  }

  // Step 1: Use check-in time to determine the shift date
  const checkInTime = dayjs(report.checkInTime).tz(KIGALI_TIMEZONE)
  const checkOutTime = dayjs(report.checkOutTime).tz(KIGALI_TIMEZONE)

  // Step 2: Calculate expected start time (same as check-in calculation)
  const checkInDay = checkInTime.day() === 0 ? 7 : checkInTime.day()
  const shiftDay = shift.dayOfWeek
  let daysDiff = shiftDay - checkInDay

  if (daysDiff < -3) {
    daysDiff += 7
  } else if (daysDiff > 3) {
    daysDiff -= 7
  }

  const expectedStartDate = checkInTime.add(daysDiff, 'days')
  const [startHours, startMinutes] = shift.startTime.split(':').map(Number)
  const expectedStartTime = expectedStartDate
    .hour(startHours)
    .minute(startMinutes || 0)
    .second(0)
    .millisecond(0)

  // Step 3: Calculate expected end time
  const [endHours, endMinutes] = shift.endTime.split(':').map(Number)

  // Check if it's an overnight shift (endTime < startTime in 24h format)
  const isOvernight = endHours < startHours || 
                      (endHours === startHours && endMinutes < startMinutes)

  let expectedEndDate = expectedStartTime.clone()
  if (isOvernight) {
    expectedEndDate = expectedEndDate.add(1, 'day')
  }

  const expectedEndTime = expectedEndDate
    .hour(endHours)
    .minute(endMinutes || 0)
    .second(0)
    .millisecond(0)

  // Step 4: Calculate difference in minutes
  const differenceMinutes = checkOutTime.diff(expectedEndTime, 'minutes')

  return Math.round(differenceMinutes)
  // Positive = late departure (e.g., +10 = left 10 minutes late)
  // Negative = early departure (e.g., -15 = left 15 minutes early)
  // Zero = on time
}

/**
 * Enhanced report with calculated lateness
 */
export interface ShiftReportWithLateness extends ShiftReport {
  checkInLatenessMinutes?: number | null
  checkOutLatenessMinutes?: number | null
}

/**
 * Enhance reports with calculated lateness values
 * Priority: Use backend-stored values (checkInDifferenceInTime/checkOutDifferenceInTime) if available,
 * otherwise calculate on frontend
 */
export function enhanceReportsWithLateness(
  reports: ShiftReport[]
): ShiftReportWithLateness[] {
  return reports.map(report => {
    // Check-in lateness: Use backend value if available, otherwise calculate
    let checkInLateness: number | null = null
    if (report.checkInDifferenceInTime !== null && report.checkInDifferenceInTime !== undefined) {
      // Use backend-stored value (already calculated in minutes)
      checkInLateness = report.checkInDifferenceInTime
    } else {
      // Fall back to frontend calculation
      checkInLateness = calculateCheckInLateness(report)
    }

    // Check-out lateness: Use backend value if available, otherwise calculate
    let checkOutLateness: number | null = null
    if (report.checkOutTime) {
      if (report.checkOutDifferenceInTime !== null && report.checkOutDifferenceInTime !== undefined) {
        // Use backend-stored value (already calculated in minutes)
        checkOutLateness = report.checkOutDifferenceInTime
      } else {
        // Fall back to frontend calculation
        checkOutLateness = calculateCheckOutLateness(report)
      }
    }

    return {
      ...report,
      checkInLatenessMinutes: checkInLateness,
      checkOutLatenessMinutes: checkOutLateness
    }
  })
}

/**
 * Format lateness for display
 */
export function formatLateness(minutes: number | null): string {
  if (minutes === null) return 'N/A'
  if (minutes === 0) return 'On time'
  if (minutes > 0) return `${minutes} min late`
  return `${Math.abs(minutes)} min early`
}


