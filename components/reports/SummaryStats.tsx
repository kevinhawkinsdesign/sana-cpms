'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Activity, Users, CheckCircle2, Clock } from 'lucide-react'
import { ShiftReportWithLateness } from '@/lib/utils/latenessCalculation'

interface SummaryStatsProps {
  reports: ShiftReportWithLateness[]
}

export function SummaryStats({ reports }: SummaryStatsProps) {
  const total = reports.length
  const active = reports.filter(r => !r.checkOutTime).length
  const completed = reports.filter(r => r.checkOutTime).length
  
  // Calculate on-time percentage (check-in)
  const checkInsWithLateness = reports.filter(r => r.checkInLatenessMinutes !== null && r.checkInLatenessMinutes !== undefined)
  const onTimeCheckIns = checkInsWithLateness.filter(r => r.checkInLatenessMinutes === 0).length
  const onTimePercentage = checkInsWithLateness.length > 0 
    ? Math.round((onTimeCheckIns / checkInsWithLateness.length) * 100)
    : 0

  // Calculate average lateness
  const latenessValues = checkInsWithLateness
    .map(r => r.checkInLatenessMinutes!)
    .filter(val => val !== null && val !== undefined)
  const avgLateness = latenessValues.length > 0
    ? Math.round(latenessValues.reduce((sum, val) => sum + val, 0) / latenessValues.length)
    : 0

  const stats = [
    {
      label: 'Total Reports',
      value: total,
      icon: Activity,
      color: 'text-blue-600'
    },
    {
      label: 'Active Shifts',
      value: active,
      icon: Users,
      color: 'text-purple-600'
    },
    {
      label: 'On Time %',
      value: `${onTimePercentage}%`,
      icon: CheckCircle2,
      color: 'text-green-600'
    },
    {
      label: 'Avg Lateness',
      value: avgLateness === 0 ? 'On time' : `${avgLateness > 0 ? '+' : ''}${avgLateness} min`,
      icon: Clock,
      color: avgLateness > 0 ? 'text-red-600' : 'text-green-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


