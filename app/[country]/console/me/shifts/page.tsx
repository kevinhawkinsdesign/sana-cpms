'use client';

/** Console operator shifts (operator self-service): geofenced shift check-in
 *  (selfie + meter readings) and check-out. Mirrors the legacy dashboard shifts
 *  page but rebuilt on console primitives; geofence resolution is the shared
 *  lib/utils/geofence helpers and check-out reuses ShiftCheckOutDialog. */
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, MapPin, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge, Btn, Card, PageHead } from '@/components/console/ui';
import { useKcTheme } from '@/components/console/ThemeProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import ImageUpload from '@/components/ui/image-upload';
import { ShiftCheckOutDialog } from '@/components/dashboard/Operator/ShiftCheckOutDialog';
import { sanitizeMeterReadingInput, parseMeterReadingValue } from '@/lib/utils/formatters';
import {
  getOperatorShifts,
  getShiftReports,
  checkInOperator,
  getDayName,
  formatTimeTo12Hour,
  type OperatorShift,
  type ShiftReport,
  type CheckInData,
} from '@/lib/api/shiftsAndInspections';
import {
  GEOFENCE_RADIUS_M,
  CHARGERS_URL,
  type Coords,
  type Charger,
  distanceMeters,
  formatKm,
  getLocationOnce,
  fetchChargersList,
  hasApiBase,
  shiftChargerCoords,
  matchChargerFromList,
} from '@/lib/utils/geofence';

const GEOFENCE_RADIUS_KM = (GEOFENCE_RADIUS_M / 1000).toFixed(2);

/** Days until the shift's weekday (0 = today). */
function daysUntilShift(dayOfWeek: number): number {
  const todayDow = new Date().getDay();
  const diff = dayOfWeek - todayDow;
  return diff < 0 ? diff + 7 : diff;
}

function shiftTimingBadge(dayOfWeek: number): { label: string; kind: 'ok' | 'neutral' } {
  const days = daysUntilShift(dayOfWeek);
  if (days === 0) return { label: 'Today', kind: 'ok' };
  if (days === 1) return { label: 'Tomorrow', kind: 'neutral' };
  return { label: `In ${days} days`, kind: 'neutral' };
}

/** The currently-worked shift: the operator's shift record enriched with the
 *  open report's timing. Descriptive fields are optional because the shift
 *  record may be gone while the report is still open (operator can still check
 *  out — that only needs the report). */
type ActiveShift = Partial<OperatorShift> & {
  id: string;
  shiftReportId: string;
  checkInTime: string | null;
  checkOutTime: string | null;
};

function sortShiftsByProximity(shifts: OperatorShift[]): OperatorShift[] {
  return [...shifts].sort((a, b) => {
    const da = daysUntilShift(a.dayOfWeek);
    const db = daysUntilShift(b.dayOfWeek);
    if (da === db) return a.startTime?.localeCompare(b.startTime ?? '') ?? 0;
    return da - db;
  });
}

export default function ConsoleOperatorShiftsPage() {
  const queryClient = useQueryClient();
  // Portal dialogs into the console root so they inherit the console theme.
  const { rootEl } = useKcTheme();

  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [checkInImage, setCheckInImage] = useState('');
  const [checkInMeterReading, setCheckInMeterReading] = useState('');
  const [checkInMeterImage, setCheckInMeterImage] = useState('');
  const [checkInMeterReading2, setCheckInMeterReading2] = useState('');
  const [checkInMeterImage2, setCheckInMeterImage2] = useState('');
  const [pendingCheckInDist, setPendingCheckInDist] = useState<number | null>(null);
  const [pendingCheckOutDist, setPendingCheckOutDist] = useState<number | null>(null);
  const [pendingCheckInHere, setPendingCheckInHere] = useState<Coords | null>(null);
  const [pendingCheckOutHere, setPendingCheckOutHere] = useState<Coords | null>(null);

  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['operatorShifts'],
    queryFn: getOperatorShifts,
    staleTime: 0,
  });
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['shiftReports'],
    queryFn: getShiftReports,
    staleTime: 0,
  });
  const { data: chargersData, isLoading: chargersLoading, error: chargersError } = useQuery({
    // Match the dashboard shifts page key so the chargers cache is shared.
    queryKey: ['chargers', CHARGERS_URL],
    queryFn: fetchChargersList,
    staleTime: 3 * 60 * 1000,
    retry: 2,
    enabled: hasApiBase(),
  });

  const shifts = shiftsData?.shifts ?? [];
  const shiftReports = reportsData?.reports ?? [];
  const chargersList: Charger[] = chargersData ?? [];

  const activeShiftReport: ShiftReport | null = useMemo(
    () =>
      shiftReports.find(
        (r) => !!r.checkInTime && !r.checkOutTime && r.isActive !== false,
      ) ?? null,
    [shiftReports],
  );

  const activeShift: ActiveShift | null = useMemo(() => {
    if (!activeShiftReport) return null;
    const corresponding = shifts.find((s) => s.id === activeShiftReport.operatorShiftId);
    const baseShift = corresponding ?? activeShiftReport.operatorShift;
    // Always surface an active shift while a check-in report is open — even if
    // the shift record was deleted and the report doesn't embed operatorShift —
    // so the operator can never be trapped without a Check Out button (the
    // check-out only needs the report). Fall back to the report's operatorShiftId
    // and leave the descriptive fields (day/time/charger) absent, which the card
    // renders defensively.
    return {
      ...(baseShift ?? {}),
      id: baseShift?.id ?? activeShiftReport.operatorShiftId,
      checkInTime: activeShiftReport.checkInTime,
      checkOutTime: activeShiftReport.checkOutTime,
      shiftReportId: activeShiftReport.id,
    };
  }, [shifts, activeShiftReport]);

  const checkInMutation = useMutation({
    mutationFn: (data: CheckInData) => checkInOperator(data),
    onSuccess: () => {
      setShowCheckInDialog(false);
      setSelectedShiftId('');
      setCheckInImage('');
      setCheckInMeterReading('');
      setCheckInMeterImage('');
      setCheckInMeterReading2('');
      setCheckInMeterImage2('');
      queryClient.invalidateQueries({ queryKey: ['operatorShifts'] });
      queryClient.invalidateQueries({ queryKey: ['shiftReports'] });
    },
    onError: (error: unknown) => {
      console.error('Check-in error:', error);
      // HTTP errors (>=400) are already toasted by the api interceptor (they
      // carry a `.response`). A business-logic failure returned on a 200 throws
      // a bare Error that nothing surfaces — toast it so the operator knows.
      const isHttpError = !!(error as { response?: unknown })?.response;
      if (!isHttpError) {
        toast.error(error instanceof Error ? error.message : 'Check-in failed. Please try again.');
      }
    },
  });

  // Accepts any shift-like object (full OperatorShift or the report-derived
  // ActiveShift); only the embedded charger / chargerId are read, via the
  // any-typed geofence helpers.
  function getCoordsForShift(shift?: { charger?: unknown; chargerId?: string } | null): Coords | null {
    if (!shift) {
      toast.error('No shift selected.');
      return null;
    }
    const embedded = shiftChargerCoords(shift);
    if (embedded) return embedded;
    if (chargersLoading) {
      toast.error('Charger coordinates still loading. Please retry.');
      return null;
    }
    if (chargersError) {
      toast.error('Failed to fetch chargers list for coordinates.');
      return null;
    }
    const { matched, coords } = matchChargerFromList(shift, chargersList);
    if (!matched) {
      toast.error('Could not find this charger in the chargers list.');
      return null;
    }
    if (!coords) {
      toast.error('Matched charger has no coordinates.');
      return null;
    }
    return coords;
  }

  async function ensureWithinGeofence(
    action: 'check-in' | 'check-out',
    shiftId?: string,
  ): Promise<{ ok: true; dist: number; here: Coords } | { ok: false }> {
    const targetShift =
      action === 'check-in' ? shifts.find((s) => s.id === (shiftId || selectedShiftId)) : activeShift;
    const coords = getCoordsForShift(targetShift);
    if (!coords) return { ok: false };
    try {
      const here = await getLocationOnce();
      const dist = distanceMeters(here, coords);
      if (dist > GEOFENCE_RADIUS_M) {
        toast.error(`You're ${formatKm(dist)} away. Must be within ${GEOFENCE_RADIUS_KM} km.`);
        return { ok: false };
      }
      return { ok: true, dist, here };
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enable location (HTTPS required).');
      return { ok: false };
    }
  }

  function validateShiftDay(shift: OperatorShift): boolean {
    const todayDow = new Date().getDay();
    if (shift.dayOfWeek === todayDow) return true;
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    toast.error(`Cannot check in to ${names[shift.dayOfWeek]} shift on ${names[todayDow]}.`);
    return false;
  }

  async function openCheckInForm(shiftId: string) {
    setSelectedShiftId(shiftId);
    const shift = shifts.find((s) => s.id === shiftId);
    if (shift && !validateShiftDay(shift)) return;
    const res = await ensureWithinGeofence('check-in', shiftId);
    if (!res.ok) return;
    setPendingCheckInDist(res.dist);
    setPendingCheckInHere(res.here);
    setCheckInImage('');
    setCheckInMeterReading('');
    setCheckInMeterImage('');
    setCheckInMeterReading2('');
    setCheckInMeterImage2('');
    setShowCheckInDialog(true);
  }

  async function openCheckOutForm() {
    if (!activeShift) {
      toast.error('No active shift found.');
      return;
    }
    const res = await ensureWithinGeofence('check-out');
    if (!res.ok) return;
    setPendingCheckOutDist(res.dist);
    setPendingCheckOutHere(res.here);
    setShowCheckOutDialog(true);
  }

  const selectedShift = shifts.find((s) => s.id === selectedShiftId);
  const requiresMeter = selectedShift?.charger?.haveMeterReading === true;
  const hasTwoMeters = selectedShift?.charger?.hasTwoMeters === true;

  async function handleCheckIn() {
    if (!selectedShiftId) {
      toast.error('Please select a shift to check in');
      return;
    }
    if (!checkInImage) {
      toast.error('Take a photo of yourself before checking in.');
      return;
    }
    if (requiresMeter) {
      if (!checkInMeterReading.trim() || !checkInMeterImage.trim()) {
        toast.error(hasTwoMeters ? 'Meter 1 reading and photo are required.' : 'Meter reading and photo are required.');
        return;
      }
      if (hasTwoMeters && (!checkInMeterReading2.trim() || !checkInMeterImage2.trim())) {
        toast.error('This station has two meters — enter the Meter 2 reading and photo.');
        return;
      }
    } else if (checkInMeterReading && !checkInMeterImage.trim()) {
      toast.error('Please capture a meter reading photo before checking in.');
      return;
    }

    const here = pendingCheckInHere ?? (await getLocationOnce().catch(() => null));
    if (!here) {
      toast.error('Could not read your location for check-in.');
      return;
    }

    const payload: CheckInData = {
      operatorShiftId: selectedShiftId,
      operatorLatitude: String(here.lat),
      operatorLongitude: String(here.lng),
      imageUrl: checkInImage.trim() || undefined,
      checkInMeterReading: parseMeterReadingValue(checkInMeterReading),
      checkInMeterReadingImageUrl: checkInMeterImage.trim() || undefined,
      checkInMeterReading2: parseMeterReadingValue(checkInMeterReading2),
      checkInMeterReadingImageUrl2: checkInMeterImage2.trim() || undefined,
    };
    checkInMutation.mutate(payload);
  }

  const checkInDisabled =
    !checkInImage ||
    (requiresMeter && (!checkInMeterReading || !checkInMeterImage)) ||
    (requiresMeter && hasTwoMeters && (!checkInMeterReading2 || !checkInMeterImage2)) ||
    checkInMutation.isPending;

  const loading = shiftsLoading || reportsLoading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHead title="My Shifts" sub="Check in and out of your assigned shifts" />

      {/* Active shift */}
      {activeShift && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-success-500 kc-pulse" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Currently working</h3>
                <Badge kind="ok" dot pulse>on shift</Badge>
              </div>
              {activeShift.dayOfWeek != null && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{getDayName(activeShift.dayOfWeek)} · {formatTimeTo12Hour(activeShift.startTime)} – {formatTimeTo12Hour(activeShift.endTime)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{activeShift.charger?.name ?? 'Location not specified'}</span>
              </div>
              {activeShift.checkInTime && (
                <p className="text-xs text-gray-400">Started: {new Date(activeShift.checkInTime).toLocaleString()}</p>
              )}
            </div>
            <Btn
              variant="danger"
              icon="stop"
              onClick={openCheckOutForm}
              style={{ width: '100%', maxWidth: 200 }}
            >
              Check out
            </Btn>
          </div>
        </Card>
      )}

      {/* Available shifts */}
      {!activeShift && (
        <div className="space-y-3">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Available shifts</h3>
          {(() => {
            if (loading) {
              return (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }, (_, i) => <span key={i} className="kc-skeleton h-20 rounded-2xl" />)}
                </div>
              );
            }
            if (shifts.length === 0) {
              return (
                <Card className="py-10 text-center text-sm text-gray-400">
                  You don&apos;t have any assigned shifts at the moment.
                </Card>
              );
            }
            return sortShiftsByProximity(shifts).map((shift) => {
              const timing = shiftTimingBadge(shift.dayOfWeek);
              return (
                <Card key={shift.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-800 dark:text-white/90">{getDayName(shift.dayOfWeek)}</span>
                        <Badge kind={timing.kind}>{timing.label}</Badge>
                        <span className="text-sm text-gray-500">{formatTimeTo12Hour(shift.startTime)} – {formatTimeTo12Hour(shift.endTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{shift.charger?.name ?? 'Location not specified'}</span>
                      </div>
                    </div>
                    <Btn
                      variant="primary"
                      icon="bolt"
                      onClick={() => openCheckInForm(shift.id)}
                      style={{ width: '100%', maxWidth: 160 }}
                    >
                      Check in
                    </Btn>
                  </div>
                </Card>
              );
            });
          })()}
        </div>
      )}

      {/* Check-in dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent container={rootEl} className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold">Check in to shift</DialogTitle>
            <DialogDescription className="text-xs text-gray-600 dark:text-gray-400">
              Take a photo and provide meter reading to check in.
            </DialogDescription>
          </DialogHeader>

          {pendingCheckInDist !== null && (
            <div className="mb-2 flex items-center gap-1 rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-1 text-xs text-[#166534] dark:border-[#22c55e]/30 dark:bg-[#22c55e]/10 dark:text-[#86efac]">
              <CheckCircle className="h-3 w-3 text-[#16a34a] dark:text-[#4ade80]" />
              ✓ {formatKm(pendingCheckInDist)} from charger
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Photo <span className="text-red-500">*</span></Label>
              <ImageUpload
                onImageChange={(_, url) => setCheckInImage(url)}
                currentImage={checkInImage}
                name="checkin-image"
                label="Take a photo of yourself"
                isRequired
                uploadContext="shift-checkin-selfie"
                entityId={selectedShiftId || undefined}
              />
            </div>

            {requiresMeter && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="meter-reading" className="text-xs font-medium">
                    {hasTwoMeters ? 'Meter 1 reading' : 'Meter reading'} <span className="text-red-500">*</span>
                  </Label>
                  <input
                    id="meter-reading"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9.,]*"
                    value={checkInMeterReading}
                    onChange={(e) => setCheckInMeterReading(sanitizeMeterReadingInput(e.target.value))}
                    className="w-full rounded-md border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#0B4F42] focus:ring-1 focus:ring-[#0B4F42] dark:border-gray-700 dark:bg-black dark:text-white/90 dark:placeholder:text-white/30"
                    placeholder="Enter meter reading"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{hasTwoMeters ? 'Meter 1 photo' : 'Meter photo'} <span className="text-red-500">*</span></Label>
                  <ImageUpload
                    onImageChange={(_, url) => setCheckInMeterImage(url)}
                    currentImage={checkInMeterImage}
                    name="checkin-meter-image"
                    label="Capture meter reading"
                    isRequired
                    // @ts-ignore camera-only flag honored by ImageUpload
                    cameraOnly
                    uploadContext="shift-checkin-meter"
                    entityId={selectedShiftId || undefined}
                  />
                </div>
                {hasTwoMeters && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="meter-reading-2" className="text-xs font-medium">Meter 2 reading <span className="text-red-500">*</span></Label>
                      <input
                        id="meter-reading-2"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9.,]*"
                        value={checkInMeterReading2}
                        onChange={(e) => setCheckInMeterReading2(sanitizeMeterReadingInput(e.target.value))}
                        className="w-full rounded-md border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#0B4F42] focus:ring-1 focus:ring-[#0B4F42] dark:border-gray-700 dark:bg-black dark:text-white/90 dark:placeholder:text-white/30"
                        placeholder="Enter meter 2 reading"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Meter 2 photo <span className="text-red-500">*</span></Label>
                      <ImageUpload
                        onImageChange={(_, url) => setCheckInMeterImage2(url)}
                        currentImage={checkInMeterImage2}
                        name="checkin-meter-image-2"
                        label="Capture meter 2 reading"
                        isRequired
                        // @ts-ignore camera-only flag honored by ImageUpload
                        cameraOnly
                        uploadContext="shift-checkin-meter2"
                        entityId={selectedShiftId || undefined}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 pt-2 sm:flex-row sm:gap-0">
            <Btn variant="default" onClick={() => setShowCheckInDialog(false)} disabled={checkInMutation.isPending}>
              Cancel
            </Btn>
            <Btn variant="primary" icon="bolt" onClick={handleCheckIn} disabled={checkInDisabled} loading={checkInMutation.isPending}>
              {checkInMutation.isPending ? 'Checking in…' : 'Check in'}
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-out dialog — shared component */}
      <ShiftCheckOutDialog
        open={showCheckOutDialog}
        onOpenChange={(o) => {
          setShowCheckOutDialog(o);
          if (!o) {
            setPendingCheckOutDist(null);
            setPendingCheckOutHere(null);
          }
        }}
        activeShiftReport={activeShiftReport}
        operatorShiftId={activeShift?.id ?? null}
        isLastShift={activeShift?.isLastShift}
        distance={pendingCheckOutDist}
        here={pendingCheckOutHere}
        container={rootEl}
        onCompleted={() => {
          setPendingCheckOutDist(null);
          setPendingCheckOutHere(null);
        }}
      />
    </div>
  );
}
