'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface LoadingStateProps {
  onBack: () => void;
}

export default function LoadingState({ onBack }: LoadingStateProps) {
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
      
      <Card className="bg-white shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your businesses...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
