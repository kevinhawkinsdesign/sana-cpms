import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { BadgeCheck, Infinity as InfinityIcon, Hash, Zap, Star, Wallet, Car, Calendar, TrendingUp, Battery, PlugZap, History } from 'lucide-react';

interface DashboardStatsProps {
  stats: any;
  sessions: any;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, sessions }) => {
  // --- Pie Chart Data (Session Status) ---
  const sessionStatusData = [
    { name: 'Completed', value: stats?.completedSessions ?? 0 },
    { name: 'In Progress', value: (stats?.totalSessions ?? 0) - (stats?.completedSessions ?? 0) },
  ];

  // Check if we have any sessions data to show
  const hasCompletedSessions = sessionStatusData[0].value > 0;
  
  // --- Line Chart Data (Energy Usage Over Time) ---
  const energyTrendData = (sessions.sessions || [])
    .slice() // Create a copy
    .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .map((s: any) => ({
      date: new Date(s.startDate).toLocaleDateString(),
      energy: s.chargedKW || 0,
    }));

  // Define chart colors
  const pieColors = ['#6366f1', '#f43f5e', '#FFD400', '#f59e0b'];
  const lineColor = '#2563eb';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
     
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Energy Usage Trend</CardTitle>
          <CardDescription>Energy consumed in kWh per charging session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={energyTrendData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  padding={{ top: 10, bottom: 10 }}
                  label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke={lineColor}
                  strokeWidth={3}
                  dot={{ r: 4, fill: lineColor, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
