'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowLeft, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import { getShiftSwapById, type ShiftSwap } from '@/lib/api/shiftsAndInspections';
import { ShiftSwapBanner } from '@/components/shared/ShiftSwapBanner';

const ShiftSwapDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const swapId = params.id as string;

  // Fetch shift swap details
  const { data: shiftSwapData, isLoading, error } = useQuery({
    queryKey: ['shiftSwap', swapId],
    queryFn: async () => {
      console.log('🔍 Fetching shift swap with ID:', swapId);
      try {
        const result = await getShiftSwapById(swapId);
        console.log('✅ API Response:', result);
        return result;
      } catch (err) {
        console.error('❌ API Error:', err);
        throw err;
      }
    },
    enabled: !!swapId,
    retry: 1,
  });

  const shiftSwap = shiftSwapData?.swap;
  
  console.log('🔍 Shift swap data:', {
    shiftSwapData,
    shiftSwap,
    hasData: !!shiftSwap
  });


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
        </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !shiftSwap) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Shift Swap Not Found</h2>
                <p className="text-sm text-gray-600 mt-1">
                  This shift swap request could not be found or you don't have permission to view it.
                </p>
              </div>
              <Button 
                onClick={() => router.push('../../')}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is authorized to view this swap
  console.log('🔍 Authorization check:', {
    userId: user?.id,
    targetOperatorId: shiftSwap?.targetOperatorId,
    operatorId: shiftSwap?.operatorId,
    isTargetOperator: user?.id === shiftSwap?.targetOperatorId,
    isOperator: user?.id === shiftSwap?.operatorId
  });
  
  const isAuthorized = user?.id === shiftSwap?.targetOperatorId || user?.id === shiftSwap?.operatorId;
  
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <X className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
                <p className="text-sm text-gray-600 mt-1">
                  You don't have permission to view this shift swap request.
                </p>
              </div>
              <Button 
                onClick={() => router.push('../../')}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
            </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPending = shiftSwap.status === 'PENDING';
  const canApprove = isPending && user?.id === shiftSwap.targetOperatorId;

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-4 pt-16 sm:pt-20">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl">
        {/* Back Button */}
        <div className="mb-4 sm:mb-6">
          <Button
            onClick={() => router.push('../../')}
            variant="outline"
            size="sm"
            className="text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Status Banner */}
        {!isPending && (
          <Card className="mb-4 border-2 border-gray-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  shiftSwap.status === 'APPROVED' ? 'bg-green-100' : 
                  shiftSwap.status === 'REJECTED' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {shiftSwap.status === 'APPROVED' ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : shiftSwap.status === 'REJECTED' ? (
                    <X className="h-5 w-5 text-red-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {shiftSwap.status === 'APPROVED' ? 'Approved' : 
                     shiftSwap.status === 'REJECTED' ? 'Rejected' : 'Cancelled'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {shiftSwap.status === 'APPROVED' ? 'This swap has been approved' :
                     shiftSwap.status === 'REJECTED' ? 'This swap has been rejected' : 
                     'This swap has been cancelled'}
                  </p>
            </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Shift Swap Banner */}
        {canApprove && (
          <div className="w-full">
            <ShiftSwapBanner
              shiftSwap={shiftSwap}
              currentUserName={user?.firstName}
              onSuccess={() => {
                // Redirect to operator dashboard after successful action
                setTimeout(() => {
                  router.push('../../');
                }, 2000);
              }}
              className="w-full"
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default ShiftSwapDetailsPage;