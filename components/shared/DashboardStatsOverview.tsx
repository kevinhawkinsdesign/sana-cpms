'use client'

import { History, Zap, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ChargingIndicator from '@/components/shared/ChargingIndicator'
import { StatCard } from '@/components/shared/StatCard'
import type { DashboardStats } from '@/lib/utils/dashboardStats'

interface DashboardStatsOverviewProps {
  readonly stats: DashboardStats | null
  readonly isLoading: boolean
}

export default function DashboardStatsOverview({ stats, isLoading }: DashboardStatsOverviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Today&apos;s Overview</h3>
        <Badge variant="outline" className="text-sm text-gray-600">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sessions"
          value={stats?.totalSessions || 0}
          description="Sessions completed today"
          icon={<History className="h-4 w-4 text-white" />}
          isLoading={isLoading}
          trend={`${stats?.todayCompletedSessions || 0} completed`}
          color="bg-[#1E3A8A]"
        />
        <StatCard
          title="Today's Energy"
          value={`${stats?.totalKwh?.toFixed(1) || 0} kWh`}
          description="Energy delivered today"
          icon={<Zap className="h-4 w-4 text-white" />}
          isLoading={isLoading}
          trend={`${stats?.averageSession?.toFixed(1) || 0} kWh avg`}
          color="bg-[#F59E0B]"
        />
        <StatCard
          title="Today's Revenue"
          value={`${stats?.totalRevenue?.toLocaleString() || 0} RWF`}
          description="Revenue generated today"
          icon={<DollarSign className="h-4 w-4 text-white" />}
          isLoading={isLoading}
          trend={`${stats?.totalRevenue && stats?.totalSessions ? Math.round(stats.totalRevenue / stats.totalSessions).toLocaleString() : 0} RWF avg`}
          color="bg-[#3B82F6]"
        />
        <StatCard
          title="Active Sessions"
          value={stats?.activeSessionsCount || 0}
          description="Currently charging"
          icon={<ChargingIndicator />}
          isLoading={isLoading}
          trend="In progress"
          color="bg-[#FFD400]"
        />
      </div>
    </div>
  )
}
