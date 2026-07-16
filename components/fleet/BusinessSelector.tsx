'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Business {
  id: string;
  name: string;
  tin?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

interface BusinessSelectorProps {
  businesses: Business[];
  onSelectBusiness: (businessId: string) => void;
  onBack: () => void;
}

export default function BusinessSelector({ 
  businesses, 
  onSelectBusiness, 
  onBack 
}: BusinessSelectorProps) {
  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your business vehicles and track fleet performance
          </p>
        </div>
      </div>
      
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle>Select Business</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              You have multiple businesses. Please select which business's fleet you want to manage:
            </p>
            <div className="grid gap-4">
              {businesses.map((business) => (
                <Card 
                  key={business.id} 
                  className="cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200"
                  onClick={() => onSelectBusiness(business.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{business.name}</h3>
                        {business.tin && (
                          <p className="text-sm text-muted-foreground">TIN: {business.tin}</p>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
