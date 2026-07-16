/*
'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User, Calendar, Check, X } from 'lucide-react';
import { approveShiftSwap } from '@/lib/api/shiftsAndInspections';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ShiftSwapBannerProps {
  shiftSwap: {
    id: string;
    operator?: {
      firstName: string;
      lastName: string;
    };
    swapDate: string;
    startTime: string;
    endTime: string;
    reason?: string | null;
  };
  currentUserName?: string;
  onSuccess?: () => void;
  className?: string;
}

export const ShiftSwapBanner = ({ 
  shiftSwap, 
  currentUserName, 
  onSuccess,
  className = ""
}: ShiftSwapBannerProps) => {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await approveShiftSwap({ 
        swapId: shiftSwap.id, 
        approved: true 
      });
      toast.success('Shift swap request approved successfully!');
      queryClient.invalidateQueries({ queryKey: ['pendingShiftSwaps'] });
      onSuccess?.();
    } catch (error) {
      console.error('Error approving shift swap:', error);
      toast.error('Failed to approve shift swap request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (rejectionReason.length > 500) {
      toast.error('Rejection reason must be less than 500 characters');
      return;
    }

    try {
      setIsProcessing(true);
      await approveShiftSwap({ 
        swapId: shiftSwap.id, 
        approved: false, 
        rejectionReason: rejectionReason.trim() 
      });
      toast.success('Shift swap request rejected');
      queryClient.invalidateQueries({ queryKey: ['pendingShiftSwaps'] });
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      onSuccess?.();
    } catch (error) {
      console.error('Error rejecting shift swap:', error);
      toast.error('Failed to reject shift swap request');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={`border border-gray-200 bg-white shadow-sm w-full ${className}`}>
      <CardContent className="p-3 xs:p-4 sm:p-5">
        
        <div className="mb-3 xs:mb-4 sm:mb-5">
          <p className="text-sm xs:text-base sm:text-base text-gray-700 leading-relaxed">
            Hey {currentUserName}, <span className="font-semibold text-gray-900">{shiftSwap.operator?.firstName} {shiftSwap.operator?.lastName}</span> has requested a shift swap with you
          </p>
        </div>
        
       
        <div className="block sm:hidden space-y-3 xs:space-y-4">
         
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 xs:w-8 xs:h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <User className="h-3 w-3 xs:h-4 xs:w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col xs:flex-row xs:items-center gap-1.5 xs:gap-2 text-sm xs:text-base text-gray-600 mb-3">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 xs:h-4 xs:w-4 flex-shrink-0" />
                  <span className="truncate font-medium">
                    {new Date(shiftSwap.swapDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <span className="hidden xs:inline text-gray-400">•</span>
                <span className="truncate font-medium">{shiftSwap.startTime} - {shiftSwap.endTime}</span>
              </div>
              {shiftSwap.reason && (
                <div className="pt-2 xs:pt-3 border-t border-gray-200">
                  <p className="text-sm xs:text-base text-gray-700 break-words">
                    <span className="font-semibold text-gray-900">Reason:</span> {shiftSwap.reason}
                  </p>
                </div>
              )}
            </div>
          </div>
          
        
          <div className="flex gap-2 xs:gap-3">
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50 h-10 xs:h-12 flex-1 text-sm xs:text-base px-3 xs:px-4 font-medium"
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4 xs:h-5 xs:w-5 mr-2" />
                  No
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-sm xs:text-base">Reject Shift Swap Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 xs:space-y-4">
                <div>
                  <Label htmlFor="rejection-reason" className="text-xs xs:text-sm">Reason for rejection *</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Please provide a reason for rejecting this shift swap request..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-2 text-xs xs:text-sm"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {rejectionReason.length}/500 characters
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsRejectDialogOpen(false);
                      setRejectionReason('');
                    }}
                    disabled={isProcessing}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReject}
                    disabled={isProcessing || !rejectionReason.trim()}
                    className="bg-red-600 hover:bg-red-700 text-xs"
                  >
                    {isProcessing ? 'Rejecting...' : 'Reject'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
            
            <Button 
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white h-10 xs:h-12 flex-1 text-sm xs:text-base px-3 xs:px-4 font-medium"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              <Check className="h-4 w-4 xs:h-5 xs:w-5 mr-2" />
              {isProcessing ? 'Processing...' : 'Yes'}
            </Button>
          </div>
        </div>

       
        <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-3 lg:gap-4">
         
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base text-gray-600 mb-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="truncate font-medium">
                  {new Date(shiftSwap.swapDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                <span className="text-gray-400">•</span>
                <span className="truncate font-medium">{shiftSwap.startTime} - {shiftSwap.endTime}</span>
              </div>
              {shiftSwap.reason && (
                <div className="pt-2 sm:pt-3 border-t border-gray-200">
                  <p className="text-sm sm:text-base text-gray-700 break-words">
                    <span className="font-semibold text-gray-900">Reason:</span> {shiftSwap.reason}
                  </p>
                </div>
              )}
            </div>
          </div>

          
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50 h-8 sm:h-10 text-sm px-3 sm:px-4 font-medium"
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  <span className="hidden lg:inline">Deny</span>
                  <span className="lg:hidden">No</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Reject Shift Swap Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rejection-reason-desktop">Reason for rejection *</Label>
                    <Textarea
                      id="rejection-reason-desktop"
                      placeholder="Please provide a reason for rejecting this shift swap request..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-2"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {rejectionReason.length}/500 characters
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsRejectDialogOpen(false);
                        setRejectionReason('');
                      }}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={isProcessing || !rejectionReason.trim()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isProcessing ? 'Rejecting...' : 'Reject'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white h-8 sm:h-10 text-sm px-3 sm:px-4 font-medium"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              <Check className="h-4 w-4 mr-1.5" />
              {isProcessing ? 'Processing...' : <span className="hidden lg:inline">Approve</span>}
              {!isProcessing && <span className="lg:hidden">Yes</span>}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
*/
