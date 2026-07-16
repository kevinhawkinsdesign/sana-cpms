import React from 'react';
import { Zap, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface KpiCardProps {
  icon: 'zap' | 'clock' | 'check' | 'alert';
  label: string;
  value: string;
  unit: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, unit }) => {
  // Icon mapping - fixed to match prop types
  const iconMap = {
    zap: Zap,
    clock: Clock,
    check: CheckCircle2,
    alert: AlertTriangle,
  };

  const Icon = iconMap[icon];

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon badge */}
          <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800" aria-hidden="true">
            <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {label}
            </p>
            <p className="text-lg font-bold text-foreground">
              {value}
              {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};