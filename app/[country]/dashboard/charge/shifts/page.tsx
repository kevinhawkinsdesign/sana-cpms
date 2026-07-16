'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from "date-fns";
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  MapPin, 
  Calendar, 
  User, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  PlayCircle,
  StopCircle,
  Eye,
  Settings
} from 'lucide-react';
import SharedTable from '@/components/shared/tables/SharedTable';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { 
  getOperatorShifts,
  getShiftReports,
  calculateShiftDuration,
  getDayName,
  type ShiftReport,
  type OperatorShift
} from '@/lib/api/shiftsAndInspections';

const ShiftsDashboardPage = () => {
    const router = useLocalizedRouter();
    const [selectedReport, setSelectedReport] = useState<ShiftReport | null>(null);
    const queryClient = useQueryClient();

    // Fetch operator shifts
    const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
        queryKey: ['operatorShifts'],
        queryFn: async () => {
            return await getOperatorShifts();
        }
    });

    // Fetch shift reports
    const { data: reportsData, isLoading: reportsLoading } = useQuery({
        queryKey: ['shiftReports'],
        queryFn: async () => {
            return await getShiftReports();
        }
    });

    const shifts = shiftsData?.shifts || [];
    const reports = reportsData?.reports || [];

    const columns: ColumnDef<ShiftReport>[] = [
        {
            accessorKey: 'checkInTime',
            header: 'Shift Date',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                        <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                        <div className="font-medium">
                            {format(new Date(row.original.checkInTime), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {format(new Date(row.original.checkInTime), 'HH:mm')}
                        </div>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'operatorShift',
            header: 'Shift Details',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-purple-100">
                        <Clock className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                        <div className="font-medium">
                            {row.original.operatorShift ? 
                                `${getDayName(row.original.operatorShift.dayOfWeek)}` : 
                                'Unknown Shift'
                            }
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {row.original.operatorShift ? 
                                `${row.original.operatorShift.startTime} - ${row.original.operatorShift.endTime}` : 
                                'No schedule'
                            }
                        </div>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'checkOutTime',
            header: 'Duration',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100">
                        <Clock className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                        <div className="font-medium">
                            {row.original.checkOutTime ? 
                                calculateShiftDuration(row.original.checkInTime, row.original.checkOutTime) : 
                                'In Progress'
                            }
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {row.original.checkOutTime ? 
                                `Ended: ${format(new Date(row.original.checkOutTime), 'HH:mm')}` : 
                                'Active'
                            }
                        </div>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'meterReading',
            header: 'Meter Reading',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-yellow-100">
                        <Settings className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="text-right">
                        <div className="font-medium">
                            {row.original.meterReading ? `${row.original.meterReading.toFixed(2)} kWh` : 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {row.original.meterReadingImageUrl ? 'Photo available' : 'No photo'}
                        </div>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const isActive = !row.original.checkOutTime;
                const isCompleted = row.original.checkOutTime;
                
                let variant: "default" | "secondary" | "destructive" = "secondary";
                let className = "";
                let icon = <Clock className="h-4 w-4" />;
                
                if (isActive) {
                    variant = "secondary";
                    className = "bg-yellow-100 text-yellow-800 border-yellow-200";
                    icon = <PlayCircle className="h-4 w-4" />;
                } else if (isCompleted) {
                    variant = "default";
                    className = "bg-green-100 text-green-800 border-green-200";
                    icon = <CheckCircle className="h-4 w-4" />;
                }
                
                return (
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-full bg-gray-100">
                            {icon}
                        </div>
                        <Badge variant={variant} className={className}>
                            {isActive ? 'Active' : 'Completed'}
                        </Badge>
                    </div>
                );
            }
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReport(row.original)}
                        className="hover:bg-blue-50 hover:text-blue-600"
                    >
                        <Eye className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">View</span>
                    </Button>
                    {!row.original.checkOutTime && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/charge/shift/end`)}
                            className="hover:bg-red-50 hover:text-red-600 border-red-200"
                        >
                            <StopCircle className="h-4 w-4" />
                            <span className="ml-1 hidden sm:inline">End</span>
                        </Button>
                    )}
                </div>
            )
        }
    ];

    // Calculate comprehensive statistics
    const calculateStats = () => {
        const totalShifts = reports.length;
        const activeShifts = reports.filter(r => !r.checkOutTime).length;
        const completedShifts = reports.filter(r => r.checkOutTime).length;
        const totalHours = reports.reduce((sum, report) => {
            if (report.checkOutTime) {
                const duration = new Date(report.checkOutTime).getTime() - new Date(report.checkInTime).getTime();
                return sum + (duration / (1000 * 60 * 60));
            }
            return sum;
        }, 0);
        const averageHours = completedShifts > 0 ? totalHours / completedShifts : 0;

        return {
            totalShifts,
            activeShifts,
            completedShifts,
            totalHours,
            averageHours
        };
    };

    const stats = calculateStats();

    const statsCards = [
        {
            title: 'Total Shifts',
            value: stats.totalShifts,
            description: 'All time shifts',
            icon: <Clock className="h-4 w-4 text-white" />,
            color: 'bg-[#1E3A8A]',
            trend: `${stats.completedShifts} completed`
        },
        {
            title: 'Active Shifts',
            value: stats.activeShifts,
            description: 'Currently in progress',
            icon: <PlayCircle className="h-4 w-4 text-white" />,
            color: 'bg-[#EF4444]',
            trend: stats.activeShifts > 0 ? 'Needs attention' : 'All completed'
        },
        {
            title: 'Total Hours',
            value: `${stats.totalHours.toFixed(1)}h`,
            description: 'Total work hours',
            icon: <TrendingUp className="h-4 w-4 text-white" />,
            color: 'bg-[#F59E0B]',
            trend: `${stats.averageHours.toFixed(1)}h avg`
        },
        {
            title: 'Scheduled Shifts',
            value: shifts.length,
            description: 'Available shifts',
            icon: <Calendar className="h-4 w-4 text-white" />,
            color: 'bg-[#FFD400]',
            trend: `${shifts.filter(s => s.isActive).length} active`
        }
    ];

    return (
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Shift Management</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        View and manage your work shifts and reports
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => router.push('/dashboard')}
                        className="w-full sm:w-auto"
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        <span className="hidden xs:inline">Dashboard</span>
                        <span className="xs:hidden">Dashboard</span>
                    </Button>
                    <Button 
                        onClick={() => router.push('/dashboard/charge/shift/start')}
                        className="w-full sm:w-auto"
                    >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        <span className="hidden xs:inline">Start Shift</span>
                        <span className="xs:hidden">Start</span>
                    </Button>
                </div>
            </div>

            {/* Active Shifts Alert */}
            {stats.activeShifts > 0 && (
                <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-yellow-100 flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-yellow-800">
                                        Active Shifts ({stats.activeShifts})
                                    </h3>
                                    <p className="text-sm text-yellow-700">
                                        You have {stats.activeShifts} shift{stats.activeShifts > 1 ? 's' : ''} currently in progress
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/dashboard/charge/shift/end')}
                                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 w-full sm:w-auto"
                            >
                                End Active Shift
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {statsCards.map((stat, index) => (
                    <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-2 rounded-lg ${stat.color}`}>
                                    {stat.icon}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-2xl font-bold text-foreground mb-2">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mb-3">{stat.description}</p>
                            {stat.trend && (
                                <div className="flex items-center text-xs text-green-600">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    {stat.trend}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Shift Reports Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">
                            Shift Reports ({reports.length} reports)
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                                <span className="hidden xs:inline">Completed</span>
                                <span className="xs:hidden">Done</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
                                <span className="hidden xs:inline">Active</span>
                                <span className="xs:hidden">Live</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <SharedTable
                        data={reports as any[]}
                        columns={columns as any}
                        isLoading={reportsLoading}
                        searchableFields={['operatorShift.dayOfWeek', 'checkInTime', 'checkOutTime']}
                        title="Shift Reports"
                        description="View and manage all your shift reports"
                    />
                </CardContent>
            </Card>

            {/* Shift Report Details Dialog */}
            {selectedReport && (
                <Card className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg sm:text-xl">Shift Report Details</CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedReport(null)}
                                    className="flex-shrink-0"
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Check In Time</label>
                                    <p className="text-sm text-gray-900">
                                        {format(new Date(selectedReport.checkInTime), 'PPp')}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Check Out Time</label>
                                    <p className="text-sm text-gray-900">
                                        {selectedReport.checkOutTime ? 
                                            format(new Date(selectedReport.checkOutTime), 'PPp') : 
                                            'Not checked out'
                                        }
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Duration</label>
                                    <p className="text-sm text-gray-900">
                                        {selectedReport.checkOutTime ? 
                                            calculateShiftDuration(selectedReport.checkInTime, selectedReport.checkOutTime) : 
                                            'In progress'
                                        }
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Meter Reading</label>
                                    <p className="text-sm text-gray-900">
                                        {selectedReport.meterReading ? `${selectedReport.meterReading.toFixed(2)} kWh` : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            
                            {selectedReport.comments && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Comments</label>
                                    <p className="text-sm text-gray-900 mt-1">{selectedReport.comments}</p>
                                </div>
                            )}
                            
                            {selectedReport.imageUrl && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Shift Photo</label>
                                    <img 
                                        src={selectedReport.imageUrl} 
                                        alt="Shift photo" 
                                        className="mt-2 max-w-xs rounded-lg"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Card>
            )}
        </div>
    );
};

export default ShiftsDashboardPage; 