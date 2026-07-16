'use client';

import React, { useState, useEffect } from "react";
import { FieldError, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter";
import ImageUpload from "@/components/ui/image-upload";
import { sanitizeMeterReadingInput, parseMeterReadingValue } from "@/lib/utils/formatters";
import { 
  checkInOperator, 
  checkOutOperator,
  getOperatorShifts,
  getShiftReports,
  type CheckInData,
  type CheckOutData,
  type OperatorShift,
  type ShiftReport
} from "@/lib/api/shiftsAndInspections";
import { Badge } from "@/components/ui/badge";

// ===== Shift Timing Utilities =====
function getShiftTimingIndicator(dayOfWeek: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  const today = new Date()
  const todayDayOfWeek = today.getDay()
  
  // Calculate days until the shift
  let daysUntil = dayOfWeek - todayDayOfWeek
  if (daysUntil < 0) {
    daysUntil += 7 // Next week
  }
  
  switch (daysUntil) {
    case 0:
      return { label: 'Today', variant: 'default' } // Green for today
    case 1:
      return { label: 'Tomorrow', variant: 'destructive' } // Red for others
    case 2:
      return { label: 'In 2 days', variant: 'destructive' } // Red for others
    case 3:
      return { label: 'In 3 days', variant: 'destructive' } // Red for others
    case 4:
      return { label: 'In 4 days', variant: 'destructive' } // Red for others
    case 5:
      return { label: 'In 5 days', variant: 'destructive' } // Red for others
    case 6:
      return { label: 'In 6 days', variant: 'destructive' } // Red for others
    default:
      return { label: 'Upcoming', variant: 'destructive' } // Red for others
  }
}

// ===== Shift Sorting Utilities =====
function getDaysUntilShift(dayOfWeek: number): number {
  const today = new Date()
  const todayDayOfWeek = today.getDay()
  
  // Calculate days until the shift
  let daysUntil = dayOfWeek - todayDayOfWeek
  if (daysUntil < 0) {
    daysUntil += 7 // Next week
  }
  
  return daysUntil
}

function sortShiftsByProximity(shifts: OperatorShift[]): OperatorShift[] {
  return [...shifts].sort((a, b) => {
    const daysUntilA = getDaysUntilShift(a.dayOfWeek)
    const daysUntilB = getDaysUntilShift(b.dayOfWeek)
    
    // If same day, sort by start time
    if (daysUntilA === daysUntilB) {
      return a.startTime.localeCompare(b.startTime)
    }
    
    return daysUntilA - daysUntilB
  })
}

const decimalRegex = /^\d+([.,]\d{0,2})?$/;

const checkFormSchema = z.object({
  image: z.string().min(1, "Please upload a photo"),
  comments: z.string().max(500, "Comments must be less than 500 characters").optional(),
  meterReading: z.string().regex(decimalRegex, "Please enter a valid number with up to 2 decimal places").optional(),
  meterReadingImage: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.meterReading && !data.meterReadingImage) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Meter reading photo is required when a meter reading is provided",
      path: ['meterReadingImage'],
    })
  }
});

type CheckFormData = z.infer<typeof checkFormSchema>;

const OperatorCheckForm: React.FC = () => {
  const router = useLocalizedRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [meterImageUrl, setMeterImageUrl] = useState<string>("");
  const [availableShifts, setAvailableShifts] = useState<OperatorShift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [activeShiftReport, setActiveShiftReport] = useState<ShiftReport | null>(null);

  const action = pathname.includes('/start') ? 'in' : 'out';
  const isValidAction = ["in", "out"].includes(action);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CheckFormData>({
    resolver: zodResolver(checkFormSchema),
  });

  const meterReading = watch("meterReading");
  useEffect(() => {
    if (!meterReading) {
      setMeterImageUrl('');
      setValue('meterReadingImage', '', { shouldValidate: true });
      return;
    }

    const sanitized = sanitizeMeterReadingInput(meterReading);
    if (sanitized !== meterReading) {
      setValue('meterReading', sanitized, { shouldValidate: true });
    }
  }, [meterReading, setValue]);

  useEffect(() => {
    if (!isValidAction) {
      router.push("/dashboard");
    }
  }, [isValidAction, router]);

  // Fetch available shifts for check-in
  useEffect(() => {
    if (action === 'in') {
      fetchAvailableShifts();
    } else if (action === 'out') {
      fetchActiveShiftReport();
    }
  }, [action]);



  const fetchAvailableShifts = async () => {
    try {
      const response = await getOperatorShifts();
      setAvailableShifts(response.shifts);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      // Backend will handle error messaging through api.ts interceptors
    }
  };

  const fetchActiveShiftReport = async () => {
    try {
      const response = await getShiftReports();
      // Find the active shift report (one that has checkInTime but no checkOutTime)
      const activeReport = response.reports.find(report => 
        report.checkInTime && !report.checkOutTime && report.isActive
      );
      
      if (!activeReport) {
        // Backend will handle error messaging through api.ts interceptors
        router.push('/dashboard/charge/shift/start');
        return;
      }
      
      setActiveShiftReport(activeReport);
    } catch (error) {
      console.error('Error fetching active shift report:', error);
      // Backend will handle error messaging through api.ts interceptors
    }
  };

  const handleImageChange = (name: string, url: string) => {
    if (name === 'shift-image') {
      setImageUrl(url);
      setValue("image", url);
    } else if (name === 'meter-image') {
      setMeterImageUrl(url);
      setValue("meterReadingImage", url, { shouldValidate: true });
    }
  };

  // ===== Day Validation =====
  const validateShiftDay = (shift: OperatorShift): boolean => {
    const today = new Date()
    const todayDayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    if (shift.dayOfWeek !== todayDayOfWeek) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const todayName = dayNames[todayDayOfWeek]
      const shiftDayName = dayNames[shift.dayOfWeek]
      
      toast.error(`Cannot check in to ${shiftDayName} shift on ${todayName}. Please select a shift for today.`)
      return false
    }
    return true
  }

  const onSubmit = async (data: CheckFormData) => {
    setLoading(true);

    try {
      if (action === 'in') {
        if (!selectedShiftId) {
          // Backend will handle error messaging through api.ts interceptors
          setLoading(false);
          return;
        }

        // Validate that the selected shift is for today (check-in only)
        const selectedShift = availableShifts.find(s => s.id === selectedShiftId)
        if (selectedShift && !validateShiftDay(selectedShift)) {
          setLoading(false);
          return;
        }

        const checkInData: CheckInData = {
          operatorShiftId: selectedShiftId,
          imageUrl: data.image,
          checkInMeterReading: parseMeterReadingValue(meterReading),
          checkInMeterReadingImageUrl: meterImageUrl && meterImageUrl.trim() !== '' ? meterImageUrl : undefined,
        };

        await checkInOperator(checkInData);
        // Backend will handle success messaging through api.ts interceptors
      } else {
        // For check-out, we need to get the active shift report
        if (!activeShiftReport) {
          // Backend will handle error messaging through api.ts interceptors
          setLoading(false);
          return;
        }

        const checkOutData: CheckOutData = {
          imageUrl: data.image,
          checkOutMeterReading: parseMeterReadingValue(meterReading),
          checkOutMeterReadingImageUrl: meterImageUrl && meterImageUrl.trim() !== '' ? meterImageUrl : undefined,
          comments: data.comments,
        };

        await checkOutOperator(activeShiftReport.id, checkOutData);
        // Backend will handle success messaging through api.ts interceptors
      }
      
      setTimeout(() => {
        router.push("/dashboard/charge/inspect");
      }, 2000);
    } catch (error: any) {
      // Backend will handle error messaging through api.ts interceptors
      console.error('Shift operation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {action === "in" ? "Start Shift" : "End Shift"}
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Shift Selection for Check-in */}
            {action === 'in' && (
              <div>

                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Shift
                </label>
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a shift...</option>
                  {sortShiftsByProximity(availableShifts).map((shift) => {
                    const timing = getShiftTimingIndicator(shift.dayOfWeek)
                    return (
                      <option key={shift.id} value={shift.id}>
                        {getDayName(shift.dayOfWeek)} - {shift.startTime} to {shift.endTime} ({timing.label})
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Active Shift Info for Check-out */}
            {action === 'out' && activeShiftReport && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Active Shift</h3>
                <div className="text-sm text-blue-800">
                  <p><strong>Day:</strong> {getDayName(activeShiftReport.operatorShift?.dayOfWeek || 0)}</p>
                  <p><strong>Time:</strong> {activeShiftReport.operatorShift?.startTime} - {activeShiftReport.operatorShift?.endTime}</p>
                  <p><strong>Check-in Time:</strong> {new Date(activeShiftReport.checkInTime).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Shift Photo */}
            <div className="w-full">
              <ImageUpload
                classNames="w-full"
                name="shift-image"
                label={`${action === "in" ? "Start" : "End"} Shift Photo`}
                currentImage={imageUrl}
                onImageChange={handleImageChange}
                isRequired={true}
                error={errors.image as FieldError}
                uploadContext={action === "in" ? "shift-checkin-selfie" : "shift-checkout-selfie"}
                entityId={action === "in" ? (selectedShiftId || undefined) : (activeShiftReport?.id)}
              />
            </div>

            {/* Meter Reading Section */}
            <div className="space-y-4">
              <div>
                <FormInput
                  name="meterReading"
                  label="Meter Reading (Optional)"
                  register={register}
                  error={errors.meterReading as FieldError}
                  placeholder="Enter meter reading"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9.,]*"
                />
              </div>

              {meterReading && (
                <div>
                  <ImageUpload
                    classNames="w-full"
                    name="meter-image"
                    label="Meter Reading Photo"
                    currentImage={meterImageUrl}
                    onImageChange={handleImageChange}
                    isRequired={true}
                    error={errors.meterReadingImage as FieldError}
                    cameraOnly
                    uploadContext={action === "in" ? "shift-checkin-meter" : "shift-checkout-meter"}
                    entityId={action === "in" ? (selectedShiftId || undefined) : (activeShiftReport?.id)}
                  />
                </div>
              )}
            </div>

            {/* Comments */}
            <FormInput
              name="comments"
              label="Comments"
              register={register}
              error={errors.comments as FieldError}
              placeholder={`Add your ${
                action === "in" ? "start" : "end"
              } shift comments`}
              maxLength={500}
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {action === "in" ? "Start" : "End"} Shift
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Helper function to get day name
const getDayName = (dayOfWeek: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
};

export default OperatorCheckForm;
