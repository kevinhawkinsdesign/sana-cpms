import type { Session } from '@/lib/api/chargingSessions'
import { getUserProfile } from '@/lib/api/chargingSessions'

export interface DashboardStats {
  totalSessions: number
  totalKwh: number
  totalRevenue: number
  averageSession: number
  activeSessionsCount: number
  recentSessions: Session[]
  todayCompletedSessions: number
}

export const EMPTY_STATS: DashboardStats = {
  totalSessions: 0,
  totalKwh: 0,
  totalRevenue: 0,
  averageSession: 0,
  activeSessionsCount: 0,
  recentSessions: [],
  todayCompletedSessions: 0,
}

export function calculateDashboardStats(
  todaySessions: Session[],
  activeCount: number,
  recentSessions: Session[],
): DashboardStats {
  const totalSessions = todaySessions.length
  const totalKwh = todaySessions.reduce((sum, s) => sum + (s.chargedKwh || 0), 0)
  const totalRevenue = todaySessions.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  const averageSession = totalSessions > 0 ? totalKwh / totalSessions : 0
  const todayCompletedSessions = todaySessions.filter(
    (s) => s.sessionStatus === 'COMPLETED',
  ).length

  return {
    totalSessions,
    totalKwh,
    totalRevenue,
    averageSession,
    activeSessionsCount: activeCount,
    recentSessions,
    todayCompletedSessions,
  }
}

export function filterTodaySessions(sessions: Session[]): Session[] {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return sessions.filter((s) => {
    const d = new Date(s.startTime)
    return d >= startOfDay && d <= endOfDay
  })
}

export async function fetchUserProfileWithFallback(
  user?: { firstName?: string; lastName?: string; role?: string } | null,
) {
  try {
    return await getUserProfile()
  } catch {
    return {
      user: {
        firstName: user?.firstName || 'User',
        lastName: user?.lastName || '',
        role: user?.role || 'OPERATOR',
      },
      statistics: { totalSessions: 0, totalSpent: 0, totalKwh: 0 },
    }
  }
}
