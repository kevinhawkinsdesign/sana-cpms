import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Car, Star, Zap, Calendar, TrendingUp, Battery, PlugZap, Clock } from 'lucide-react';

interface OverviewCardsProps {
  overview: any;
  stats: any;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ overview, stats }) => {
  const overviewCards = [
    {
      label: 'Balance',
      value: overview?.balance?.balance ? `${overview.balance.balance.toLocaleString()} ${overview.balance.currency}` : '—',
      icon: <Wallet className="w-5 h-5 text-pink-500" />,
      bgClass: 'bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/30',
      textClass: 'text-pink-700 dark:text-pink-300',
    },
    {
      label: 'Vehicles',
      value: overview?.vehicles?.length ?? 0,
      icon: <Car className="w-5 h-5 text-purple-500" />,
      bgClass: 'bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/30',
      textClass: 'text-purple-700 dark:text-purple-300',
    },
    {
      label: 'Entitlements',
      value: overview?.entitlements?.length ?? 0,
      icon: <Star className="w-5 h-5 text-amber-500" />,
      bgClass: 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/30',
      textClass: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Recent Sessions',
      value: overview?.recentSessions?.length ?? 0,
      icon: <Clock className="w-5 h-5 text-emerald-500" />,
      bgClass: 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/30',
      textClass: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Total Energy',
      value: stats?.totalEnergy ? `${stats.totalEnergy.toFixed(1)} kWh` : '—',
      icon: <Battery className="w-5 h-5 text-blue-500" />,
      bgClass: 'bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-900/20 dark:to-sky-900/30',
      textClass: 'text-blue-700 dark:text-blue-300',
    },
    {
      label: 'Total Cost',
      value: stats?.totalCost ? `${stats.totalCost.toLocaleString()} RWF` : '—',
      icon: <TrendingUp className="w-5 h-5 text-orange-500" />,
      bgClass: 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/30',
      textClass: 'text-orange-700 dark:text-orange-300',
    },
    {
      label: 'Avg. Duration',
      value: stats?.averageSessionDuration ? `${stats.averageSessionDuration} min` : '—',
      icon: <Calendar className="w-5 h-5 text-indigo-500" />,
      bgClass: 'bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-900/20 dark:to-violet-900/30',
      textClass: 'text-indigo-700 dark:text-indigo-300',
    },
    {
      label: 'Favorite Station',
      value: stats?.favoriteStation || '—',
      icon: <PlugZap className="w-5 h-5 text-cyan-500" />,
      bgClass: 'bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-cyan-900/20 dark:to-teal-900/30',
      textClass: 'text-cyan-700 dark:text-cyan-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {overviewCards.map((card) => (
        <Card key={card.label} className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
              <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                {card.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
