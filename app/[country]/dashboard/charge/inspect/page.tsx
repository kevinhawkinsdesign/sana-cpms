'use client';

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader, ClipboardCheck, AlertCircle, Camera, CheckCircle2, XCircle, Power, Shield, Zap, History } from "lucide-react";
import api from "@/lib/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import ImageUpload from "@/components/ui/image-upload";
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter";
import {
  parseMeterReadingValue,
  stripMeterReadingFormatting,
} from "@/lib/utils/formatters";

import { 
  createChargerInspection,
  getChargerInspections,
  calculateInspectionScore,
  getOperatorShifts,
  checkInOperator,
  type CreateInspectionData,
  type ChargerInspection,
  type CheckInData
} from "@/lib/api/shiftsAndInspections";
import { useActiveShift } from "@/lib/hooks/useActiveShift";

const KABISA_ID_REGEX = /^[A-Z0-9]{8}$/;

const isValidKabisaId = (id: string) => KABISA_ID_REGEX.test(id);

// Simplified 3-point inspection schema
const inspectionSchema = z.object({
  imageUrl: z.string().optional(),
  comments: z
    .string()
    .max(1000, "Comments must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  isChargerTurnedOn: z.boolean().refine(val => typeof val === 'boolean', {
    message: "Please verify if charger is turned on"
  }),
  isAdapterClean: z.boolean().refine(val => typeof val === 'boolean', {
    message: "Please verify if adapter is clean"
  }),
  isThereNoDamage: z.boolean().refine(val => typeof val === 'boolean', {
    message: "Please verify if there is no damage"
  }),
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

// 3-point inspection checklist
const inspectionChecks = [
  {
    key: "isChargerTurnedOn",
    label: "Is Charger Turned On",
    description: "Verify the charger is powered and operational",
    icon: <Power className="h-4 w-4" />
  },
  {
    key: "isAdapterClean",
    label: "Is Adapter Clean",
    description: "Check that the charging connector is clean and free of debris",
    icon: <Shield className="h-4 w-4" />
  },
  {
    key: "isThereNoDamage",
    label: "Is There No Damage",
    description: "Inspect for any physical damage to the charger or connector",
    icon: <Zap className="h-4 w-4" />
  }
];

interface YesNoToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  error?: string;
}

const YesNoToggle: React.FC<YesNoToggleProps> = ({ label, description, icon, value, onChange, error }) => {
  return (
    <Card className={cn("h-full border transition-all", error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-blue-300")}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-100">
              {icon}
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900">{label}</h4>
              <p className="text-xs text-gray-600">{description}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant={value === true ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(true)}
              className={cn("flex-1 h-8 text-xs", value === true && "bg-emerald-600 hover:bg-emerald-700")}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Yes
            </Button>
            <Button
              type="button"
              variant={value === false ? "destructive" : "outline"}
              size="sm"
              onClick={() => onChange(false)}
              className="flex-1 h-8 text-xs"
            >
              <XCircle className="w-3 h-3 mr-1" />
              No
            </Button>
          </div>
          
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ChargerInspectionForm: React.FC = () => {
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [inspectionAnswers, setInspectionAnswers] = useState<Record<string, boolean>>({});
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [checkInImage, setCheckInImage] = useState<string>('');
  const [meterReading, setMeterReading] = useState<string>('');
  const [meterImage, setMeterImage] = useState<string>('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  // Get active shift status
  const { activeShiftReport, hasActiveShift, isLoading: shiftLoading } = useActiveShift();

  useEffect(() => {
    if (!meterReading) {
      setMeterImage('');
    }
  }, [meterReading]);

  const handleMeterReadingChange = (value: string) => {
    setMeterReading(stripMeterReadingFormatting(value));
  };

  const handleMeterReadingFocus = () => {
    setMeterReading((prev) => {
      const stripped = stripMeterReadingFormatting(prev);
      return stripped === prev ? prev : stripped;
    });
  };

  const handleMeterReadingBlur = () => {
    setMeterReading((prev) => stripMeterReadingFormatting(prev));
  };

  const preventInvalidNumberKey = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (["e", "E", "+", "-"].includes(event.key)) {
      event.preventDefault();
    }
  };

  // Fetch available shifts for check-in
  const { data: shiftsData } = useQuery({
    queryKey: ['operatorShifts'],
    queryFn: getOperatorShifts,
  });

  const shifts = shiftsData?.shifts || [];

  const normalizeDate = (input: Date) => {
    const date = new Date(input)
    date.setHours(0, 0, 0, 0)
    return date
  }

  const today = normalizeDate(new Date())
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  const resolveShiftDate = (shift: any): Date | null => {
    if (shift?.shiftDate) {
      const date = new Date(shift.shiftDate)
      if (Number.isNaN(date.getTime())) return null
      date.setHours(0, 0, 0, 0)
      return date
    }
    if (typeof shift?.dayOfWeek === 'number') {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + shift.dayOfWeek)
      date.setHours(0, 0, 0, 0)
      return date
    }
    return null
  }

  const currentWeekShifts = shifts.filter((shift) => {
    const date = resolveShiftDate(shift)
    return date ? date >= startOfWeek && date <= endOfWeek : false
  })

  useEffect(() => {
    if (selectedShiftId && !currentWeekShifts.some((shift) => shift.id === selectedShiftId)) {
      setSelectedShiftId('')
    }
  }, [selectedShiftId, currentWeekShifts])

  const form = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = form;



  const handleInspectionAnswerChange = (questionKey: string, value: boolean) => {
    const newAnswers = { ...inspectionAnswers, [questionKey]: value };
    setInspectionAnswers(newAnswers);
    setValue(questionKey as keyof InspectionFormData, value);
  };

  const onSubmit = async (data: InspectionFormData) => {
    // Check if operator has active shift
    if (!hasActiveShift || !activeShiftReport) {
      toast.error('You must be checked in to perform inspections. Please check in from the dashboard first.');
      return;
    }

    setLoading(true);
    try {
      const inspectionData: CreateInspectionData = {
        operatorShiftReportId: activeShiftReport.id,
        imageUrl: imageUrl || undefined,
        comments: data.comments || undefined,
        isChargerTurnedOn: data.isChargerTurnedOn,
        isAdapterClean: data.isAdapterClean,
        isThereNoDamage: data.isThereNoDamage,
      };

      await createChargerInspection(inspectionData);
      toast.success("Inspection submitted successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "An error occurred while submitting the inspection");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (name: string, url: string) => {
    if (name === 'inspection-image') {
      setImageUrl(url);
      setValue('imageUrl', url);
    } else if (name === 'checkin-image') {
      setCheckInImage(url);
    } else if (name === 'meter-image') {
      setMeterImage(url);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedShiftId) {
      // Backend will handle error messaging through api.ts interceptors
      return;
    }

    if (meterReading && (!meterImage || meterImage.trim() === '')) {
      toast.error('Please capture a meter reading photo before checking in.');
      return;
    }

    const selectedShift = currentWeekShifts.find((shift) => shift.id === selectedShiftId)
    if (!selectedShift) {
      toast.error('Please select a valid shift for the current week.')
      return
    }

    const shiftDate = resolveShiftDate(selectedShift)
    if (!shiftDate) {
      toast.error('Unable to determine the shift date. Please contact support.')
      return
    }

    if (shiftDate.getTime() !== today.getTime()) {
      toast.error('You can only check in on the day of your shift.')
      return
    }

    setCheckInLoading(true);
    try {
      const numericMeterReading = parseMeterReadingValue(meterReading);

      await checkInOperator({
        operatorShiftId: selectedShiftId,
        operatorLatitude: '0.0000', // TODO: Get actual GPS coordinates
        operatorLongitude: '0.0000',
        imageUrl: checkInImage || undefined,
        checkInMeterReading: numericMeterReading,
        checkInMeterReadingImageUrl: meterImage || undefined,
      })
      
      // Backend will handle success messaging through api.ts interceptors
      setShowShiftModal(false);
      setSelectedShiftId('');
      setCheckInImage('');
      setMeterReading('');
      setMeterImage('');
      
      // Refresh the shift reports
      queryClient.invalidateQueries({ queryKey: ['shiftReports'] })
      queryClient.invalidateQueries({ queryKey: ['operatorShifts'] })
    } catch (error: any) {
      // Backend will handle error messaging through api.ts interceptors
      console.error('Check-in error:', error);
    } finally {
      setCheckInLoading(false);
    }
  }

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayOfWeek]
  }

  // Calculate current inspection score
  const currentScore = Object.keys(inspectionAnswers).length > 0 
    ? Math.round((Object.values(inspectionAnswers).filter(Boolean).length / inspectionChecks.length) * 100)
    : 0;

  // Show loading state while checking shift status
  if (shiftLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Checking shift status...</p>
        </div>
      </div>
    );
  }

  // Show start shift option if no active shift
  if (!hasActiveShift) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg border-0">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ClipboardCheck className="w-6 h-6 text-blue-600" />
                  <CardTitle className="text-xl text-gray-900">Charger Inspection</CardTitle>
                </div>
                <p className="text-gray-600">Complete the 3-point checklist to verify charger status</p>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-orange-800 mb-2">
                    Start Your Shift to Begin Inspections
                  </h3>
                  <p className="text-orange-700 mb-4">
                    You need to check in to your shift before performing charger inspections.
                  </p>
                  <Button 
                    onClick={() => setShowShiftModal(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Start Shift
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Shift Check-in Modal */}
        {showShiftModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-gray-900/40 flex items-center justify-center z-50">
            <div className="bg-white/98 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-300/60">
              <h3 className="text-lg font-semibold mb-4">Start Your Shift</h3>
              
              <div className="space-y-4">
                {/* Shift Selection */}
                <div>
                  <Label>Select Shift</Label>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a shift...</option>
                    {currentWeekShifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {getDayName(shift.dayOfWeek)} - {shift.startTime} to {shift.endTime}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Check-in Photo */}
                <div>
                  <Label>Check-in Photo (Optional)</Label>
                  <ImageUpload
                    name="checkin-image"
                    label="Take a photo of yourself"
                    currentImage={checkInImage}
                    onImageChange={handleImageChange}
                    isRequired={false}
                    classNames="w-full"
                    uploadContext="shift-checkin-selfie"
                    entityId={selectedShiftId || undefined}
                  />
                </div>

                {/* Meter Reading */}
                <div>
                  <Label>Initial Meter Reading (Optional)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.0001"
                    placeholder="Enter meter reading"
                    value={meterReading}
                    onChange={(e) => handleMeterReadingChange(e.target.value)}
                    onFocus={handleMeterReadingFocus}
                    onBlur={handleMeterReadingBlur}
                    onKeyDown={preventInvalidNumberKey}
                    autoComplete="off"
                  />
                </div>

                {/* Meter Photo */}
                {meterReading && (
                  <div>
                    <Label>Meter Photo</Label>
                    <ImageUpload
                      name="meter-image"
                      label="Take a photo of the meter"
                      currentImage={meterImage}
                      onImageChange={handleImageChange}
                      isRequired={true}
                      cameraOnly
                      classNames="w-full"
                      uploadContext="shift-checkin-meter"
                      entityId={selectedShiftId || undefined}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCheckIn}
                    disabled={!selectedShiftId || checkInLoading}
                    className="flex-1"
                  >
                    {checkInLoading ? (
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Check In
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowShiftModal(false)}
                    disabled={checkInLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
              <CardTitle className="text-xl text-gray-900">Charger Inspection</CardTitle>
            </div>
            <p className="text-gray-600">Complete the 3-point checklist to verify charger status</p>
          </CardHeader>

          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Active Shift Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <h3 className="font-medium text-green-800">Active Shift</h3>
                    <p className="text-sm text-green-700">
                      Started: {new Date(activeShiftReport!.checkInTime).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Essential Checks</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {inspectionChecks.map((check) => (
                    <YesNoToggle
                      key={check.key}
                      label={check.label}
                      description={check.description}
                      icon={check.icon}
                      value={inspectionAnswers[check.key]}
                      onChange={(value) => handleInspectionAnswerChange(check.key, value)}
                      error={(errors as any)?.[check.key]?.message}
                    />
                  ))}
                </div>
                
                {/* Real-time Score Display */}
                {Object.keys(inspectionAnswers).length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">Inspection Score:</span>
                      <Badge variant="outline" className="text-blue-600">
                        {currentScore}%
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-blue-600">
                      {Object.values(inspectionAnswers).filter(Boolean).length} of {inspectionChecks.length} checks passed
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Additional Comments (Optional)</Label>
                  <textarea
                    {...register("comments")}
                    className="mt-1 w-full h-32 px-3 py-2 rounded-md border border-gray-300 text-sm resize-none"
                    placeholder="Add any additional notes about the inspection..."
                  />
                </div>

                <div>
                  <ImageUpload
                    name="inspection-image"
                    label="Inspection Photo (Optional)"
                    currentImage={imageUrl}
                    onImageChange={handleImageChange}
                    isRequired={false}
                    classNames="w-full max-h-32"
                    uploadContext="charger-image"
                    entityId={activeShiftReport?.id}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Inspection
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChargerInspectionForm;
