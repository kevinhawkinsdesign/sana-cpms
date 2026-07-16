import { useQuery } from '@tanstack/react-query'
import { getShiftReports, type ShiftReport } from '@/lib/api/shiftsAndInspections'

export const useActiveShift = () => {
  const { data: shiftReportsData, isLoading, error } = useQuery({
    queryKey: ['shiftReports'],
    queryFn: getShiftReports,
    staleTime: 0,
  })

  const reports = shiftReportsData?.reports || []
  
  // Find active shift report - one that has check-in time but no check-out time
  // Removed date validation to allow overnight shifts that span different days
  const activeShiftReport = reports.find(report => {
    const hasCheckIn = !!report.checkInTime
    const hasNoCheckOut = !report.checkOutTime
    const isActive = report.isActive !== false // Allow undefined isActive to be considered active
    
    // Only check if shift is active and not checked out - no date restrictions
    return hasCheckIn && hasNoCheckOut && isActive
  })
  
  // Find any unclosed shifts from previous days (keeping this for admin purposes)
  const unclosedPreviousShifts = reports.filter(report => {
    const hasCheckIn = !!report.checkInTime
    const hasNoCheckOut = !report.checkOutTime
    const isActive = report.isActive !== false
    
    if (!hasCheckIn) return false
    
    const today = new Date()
    const checkInDate = new Date(report.checkInTime)
    
    if (isNaN(checkInDate.getTime())) return false
    
    const isToday = checkInDate.toDateString() === today.toDateString()
    
    return hasCheckIn && hasNoCheckOut && isActive && !isToday
  })

  return {
    activeShiftReport,
    isLoading,
    error,
    hasActiveShift: !!activeShiftReport,
    unclosedPreviousShifts,
    hasUnclosedPreviousShifts: unclosedPreviousShifts.length > 0
  }
}
