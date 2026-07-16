'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

interface NoBusinessStateProps {
  onBack: () => void;
  onCreateBusiness: () => void;
}

export default function NoBusinessState({ onBack, onCreateBusiness }: NoBusinessStateProps) {
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
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Businesses Found</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any businesses yet. Create a business first to manage its fleet.
            </p>
            <Button onClick={onCreateBusiness}>
              Create Business
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
