import React from 'react'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  isLoading?: boolean
  trend?: string
  color?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  isLoading,
  trend,
  color = 'bg-[#1E3A8A]',
}) => (
  <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      {isLoading ? (
        <Skeleton className="h-8 w-20 mb-2" />
      ) : (
        <div className="text-2xl font-bold text-foreground mb-2">{value}</div>
      )}
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      {trend && (
        <div className="flex items-center text-xs text-green-600">
          <TrendingUp className="h-3 w-3 mr-1" />
          {trend}
        </div>
      )}
    </CardContent>
  </Card>
)
