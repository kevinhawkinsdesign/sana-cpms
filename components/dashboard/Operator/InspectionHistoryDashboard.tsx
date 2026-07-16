'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Eye, Calendar, Clock } from 'lucide-react';

const InspectionHistoryDashboard = () => {
  const [inspections] = useState([
    {
      id: 1,
      vehicleId: 'KABISA001',
      vehicleName: 'Tesla Model 3',
      inspector: 'John Doe',
      date: '2024-01-15',
      time: '14:30',
      status: 'completed',
      notes: 'All systems functioning properly'
    },
    {
      id: 2,
      vehicleId: 'KABISA002',
      vehicleName: 'Nissan Leaf',
      inspector: 'Jane Smith',
      date: '2024-01-14',
      time: '16:45',
      status: 'completed',
      notes: 'Minor maintenance required'
    },
    {
      id: 3,
      vehicleId: 'KABISA003',
      vehicleName: 'BMW i3',
      inspector: 'Mike Johnson',
      date: '2024-01-13',
      time: '09:15',
      status: 'pending',
      notes: 'Scheduled for inspection'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inspection History</h1>
          <p className="text-muted-foreground">
            View all vehicle inspection records and history
          </p>
        </div>
        <Button>
          <History className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inspections.length}</div>
            <p className="text-xs text-muted-foreground">
              All time inspections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inspections.filter(i => i.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successful inspections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inspections.filter(i => i.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting inspection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inspection List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Inspections</CardTitle>
          <CardDescription>
            Latest vehicle inspection records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inspections.map((inspection) => (
              <div key={inspection.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col">
                    <div className="font-medium">{inspection.vehicleName}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {inspection.vehicleId}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{inspection.date}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{inspection.time}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Inspector: {inspection.inspector}
                  </div>
                  
                  <Badge className={getStatusColor(inspection.status)}>
                    {inspection.status}
                  </Badge>
                  
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InspectionHistoryDashboard;
