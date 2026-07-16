'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from 'date-fns';
import { Loader2, Clock, MapPin, MessageSquare } from 'lucide-react';
import api from '@/lib/api/api';
import TableActions from '@/components/dashboard/TableActions';


interface ShiftReport {
  id: string;
  operatorName: string;
  chargerName: string;
  timeIn: string;
  timeOut: string | null;
  isLate: boolean;
  deltaMinutes: number;
  imageIn: string;
  imageOut: string | null;
  commentIn: string;
  commentOut: string | null;
  shiftDuration: number | null;
  attendanceStatus: string;
  shiftStatus: string;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function AttendanceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    'Late': 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-800 border-yellow-200 shadow-sm',
    'On Time': 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200 shadow-sm',
    'Early': 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-800 border-blue-200 shadow-sm',
  };
  
  return (
    <Badge className={`${variants[status] || 'bg-gray-100 text-gray-800'} font-medium px-3 py-1 text-xs border`}>
      {status}
    </Badge>
  );
}

function ShiftStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    'Ongoing': 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-200 shadow-sm animate-pulse',
    'Completed': 'bg-gradient-to-r from-green-50 to-teal-50 text-green-800 border-green-200 shadow-sm',
  };
  
  return (
    <Badge className={`${variants[status] || 'bg-gray-100 text-gray-800'} font-medium px-3 py-1 text-xs border`}>
      {status}
    </Badge>
  );
}

function ShiftDetailsDialog({ 
  isOpen, 
  onClose, 
  shift 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  shift: ShiftReport | null;
}) {
  if (!shift) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
         <DialogContent className="max-w-3xl max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Shift Details</DialogTitle>
          <DialogDescription>
            {shift.operatorName} - {shift.chargerName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4 py-4">
          {/* Operator Info - Spans 4 columns */}
          <div className="col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={shift.imageIn} />
                <AvatarFallback className="bg-blue-500 text-white">
                  {shift.operatorName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{shift.operatorName}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {shift.chargerName}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <ShiftStatusBadge status={shift.shiftStatus} />
              <AttendanceStatusBadge status={shift.attendanceStatus} />
            </div>
          </div>

          {/* Timing Info - Spans 4 columns */}
          <div className="col-span-4 space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timing
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Check-in:</span>
                <span>{format(new Date(shift.timeIn), 'MMM d, HH:mm')}</span>
              </div>
              {shift.timeOut && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-out:</span>
                  <span>{format(new Date(shift.timeOut), 'MMM d, HH:mm')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{formatDuration(shift.shiftDuration)}</span>
              </div>
            </div>
          </div>

          {/* Images - Spans 4 columns */}
          <div className="col-span-4 space-y-3">
            <h4 className="font-medium text-sm">Images</h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600 mb-1">Check-in</p>
                <div className="aspect-video rounded-md overflow-hidden bg-gray-100">
                  <img
                    src={shift.imageIn}
                    alt="Check-in"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              {shift.imageOut && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Check-out</p>
                  <div className="aspect-video rounded-md overflow-hidden bg-gray-100">
                    <img
                      src={shift.imageOut}
                      alt="Check-out"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comments - Spans full width */}
          <div className="col-span-12 space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shift.commentIn && (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 mb-1">Check-in:</p>
                  <p className="text-sm text-gray-700">{shift.commentIn}</p>
                </div>
              )}
              {shift.commentOut && (
                <div className="bg-green-50 p-3 rounded-md border border-green-100">
                  <p className="text-xs font-medium text-green-700 mb-1">Check-out:</p>
                  <p className="text-sm text-gray-700">{shift.commentOut}</p>
                </div>
              )}
            </div>
            {!shift.commentIn && !shift.commentOut && (
              <p className="text-sm text-gray-500 italic">No comments available</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Index() {
  const [selectedShift, setSelectedShift] = useState<ShiftReport | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['operator-shifts'],
    queryFn: async () => {
      const response = await api().get("/api/charge/shift-reports");
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-red-100">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Data</h2>
          <p className="text-red-600">Unable to load shift reports. Please try again later.</p>
        </div>
      </div>
    );
  }

  const reports: ShiftReport[] = data?.reports || [];
  
  // Calculate summary statistics
  const totalShifts = reports.length;
  const ongoingShifts = reports.filter(r => r.shiftStatus === 'Ongoing').length;
  const completedShifts = reports.filter(r => r.shiftStatus === 'Completed').length;
  const lateShifts = reports.filter(r => r.isLate).length;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold  to-purple-800 bg-clip-text  mb-2">
              Operator Shifts Dashboard
            </h1>
            <p className="text-gray-600 text-lg">Real-time monitoring and management of operator activities</p>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <CardDescription className="text-muted-foreground font-medium">Total Shifts</CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground">{totalShifts}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gray-400 to-gray-600 rounded-full w-full"></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <CardDescription className="text-muted-foreground font-medium">Ongoing Shifts</CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground">{ongoingShifts}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse w-full"></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <CardDescription className="text-muted-foreground font-medium">Completed Shifts</CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground">{completedShifts}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full w-full"></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <CardDescription className="text-muted-foreground font-medium">Late Arrivals</CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground">{lateShifts}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-full"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shifts Table */}
          <Card className="bg-white shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
              <CardTitle className="text-xl font-bold text-gray-900">Shift Reports</CardTitle>
              <CardDescription className="text-gray-600">
                Detailed view of all operator shifts with real-time status updates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 z-10">
                      <TableRow className="hover:bg-gray-50">
                        <TableHead className="font-semibold text-gray-900">Operator</TableHead>
                        <TableHead className="font-semibold text-gray-900">Station</TableHead>
                        <TableHead className="font-semibold text-gray-900">Time In</TableHead>
                        <TableHead className="font-semibold text-gray-900">Time Out</TableHead>
                        <TableHead className="font-semibold text-gray-900">Duration</TableHead>
                        <TableHead className="font-semibold text-gray-900">Status</TableHead>
                        <TableHead className="font-semibold text-gray-900">Attendance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report, index) => (
                        <TableRow 
                          key={report.id}
                          className="group cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border-b border-gray-100"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 ring-2 ring-white shadow-md">
                                  <AvatarImage src={report.imageIn} />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                                    {report.operatorName.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-gray-900">{report.operatorName}</span>
                              </div>
                              <TableActions
                                report={report}
                                onView={() => setSelectedShift(report)}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-gray-700">{report.chargerName}</TableCell>
                          <TableCell className="text-gray-600">{format(new Date(report.timeIn), 'MMM d, HH:mm')}</TableCell>
                          <TableCell className="text-gray-600">
                            {report.timeOut ? format(new Date(report.timeOut), 'MMM d, HH:mm') : (
                              <span className="text-blue-600 font-medium">Active</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-gray-700">{formatDuration(report.shiftDuration)}</TableCell>
                          <TableCell>
                            <ShiftStatusBadge status={report.shiftStatus} />
                          </TableCell>
                          <TableCell>
                            <AttendanceStatusBadge status={report.attendanceStatus} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          <ShiftDetailsDialog
            isOpen={!!selectedShift}
            onClose={() => setSelectedShift(null)}
            shift={selectedShift}
          />
        </div>
      </div>


    </div>
  );
}
