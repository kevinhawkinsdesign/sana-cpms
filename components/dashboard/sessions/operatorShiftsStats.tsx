import { ChevronDown } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { format } from "date-fns";
import { 
  getOperatorShifts,
  getShiftReports,
  getChargerInspections,
  calculateInspectionScore,
  getDayName,
  type ShiftReport,
  type ChargerInspection
} from '@/lib/api/shiftsAndInspections';

// A small helper component to create the consistent "card" sections.
// This makes the main component cleaner and easier to read.
const Section = ({ title, subtitle, children, className = '' }: { title: string, subtitle?: string, children: React.ReactNode, className?: string }) => (
  // This is the "card" with the lighter background and rounded corners
  <div className={`bg-[#2C2C2E] rounded-xl p-3 space-y-3 ${className}`}>
    <div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
    </div>
    {children}
  </div>
);

export function OperatorShiftsStats() {
  // Fetch shifts data
  const { data: shiftsData } = useQuery({
    queryKey: ['operatorShifts'],
    queryFn: async () => {
      return await getOperatorShifts();
    }
  });

  // Fetch shift reports
  const { data: reportsData } = useQuery({
    queryKey: ['shiftReports'],
    queryFn: async () => {
      return await getShiftReports();
    }
  });

  // Fetch inspections data
  const { data: inspectionsData } = useQuery({
    queryKey: ['chargerInspections'],
    queryFn: async () => {
      return await getChargerInspections();
    }
  });

  const shifts = shiftsData?.shifts || [];
  const reports = reportsData?.reports || [];
  const inspections = inspectionsData?.inspections || [];

  // Calculate shift statistics
  const calculateShiftStats = () => {
    const totalShifts = reports.length;
    const onTimeShifts = reports.filter(r => {
      if (!r.operatorShift) return false;
      const checkInTime = new Date(r.checkInTime);
      const scheduledTime = new Date();
      scheduledTime.setHours(parseInt(r.operatorShift.startTime.split(':')[0]));
      scheduledTime.setMinutes(parseInt(r.operatorShift.startTime.split(':')[1]));
      
      // Consider on time if within 15 minutes of scheduled time
      const timeDiff = Math.abs(checkInTime.getTime() - scheduledTime.getTime()) / (1000 * 60);
      return timeDiff <= 15;
    }).length;
    
    const lateShifts = totalShifts - onTimeShifts;
    const onTimePercentage = totalShifts > 0 ? Math.round((onTimeShifts / totalShifts) * 100) : 0;
    const latePercentage = 100 - onTimePercentage;

    return {
      onTimePercentage,
      latePercentage,
      totalShifts,
      onTimeShifts,
      lateShifts
    };
  };

  // Calculate weekly performance data
  const calculateWeeklyPerformance = () => {
    const now = new Date();
    const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
    
    const weeklyReports = reports.filter(r => {
      const reportDate = new Date(r.checkInTime);
      return reportDate >= weekStart;
    });

    // Group by day of week and calculate performance
    const dailyPerformance = [0, 0, 0, 0, 0, 0, 0]; // Sunday to Saturday
    
    weeklyReports.forEach(report => {
      const reportDate = new Date(report.checkInTime);
      const dayOfWeek = reportDate.getDay();
      
      if (report.operatorShift) {
        const checkInTime = reportDate;
        const scheduledTime = new Date();
        scheduledTime.setHours(parseInt(report.operatorShift.startTime.split(':')[0]));
        scheduledTime.setMinutes(parseInt(report.operatorShift.startTime.split(':')[1]));
        
        const timeDiff = Math.abs(checkInTime.getTime() - scheduledTime.getTime()) / (1000 * 60);
        const performance = timeDiff <= 15 ? 100 : Math.max(0, 100 - (timeDiff - 15) * 2);
        dailyPerformance[dayOfWeek] = Math.max(dailyPerformance[dayOfWeek], performance);
      }
    });

    return dailyPerformance;
  };

  // Get recent car models from sessions (this would need to be integrated with sessions data)
  const getRecentCarModels = () => {
    // This would ideally come from charging sessions data
    // For now, return some sample data
    return ['BYD Song Plus', 'Venusia D60', 'BYD Yuan UP'];
  };

  // Get inspection status
  const getInspectionStatus = () => {
    if (inspections.length === 0) return { operational: 0, lastInspection: null };
    
    const latestInspection = inspections.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    const operationalScore = calculateInspectionScore(latestInspection);
    const isOperational = operationalScore >= 80;
    
    return {
      operational: isOperational ? 100 : operationalScore,
      lastInspection: latestInspection.createdAt
    };
  };

  const shiftStats = calculateShiftStats();
  const weeklyPerformance = calculateWeeklyPerformance();
  const recentCarModels = getRecentCarModels();
  const inspectionStatus = getInspectionStatus();

  return (
    // Main sidebar container with the darkest background
    <div className="w-full max-w-sm mx-auto lg:w-96 xl:w-[420px] h-[600px] bg-[#1C1C1E] rounded-3xl m-2 lg:m-4 p-3 space-y-3 overflow-y-auto text-gray-200">
      
      {/* Car Models Section */}
      <div className="space-y-3 bg-[#2C2C2E] rounded-xl p-3">
        {/* <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Car Models</h3>
          <button className="flex items-center space-x-2 text-sm text-gray-100 bg-[#3A3A3C] rounded-lg px-3 py-1.5">
            <span>Last Week</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div> */}

        {/* --- FIX: Exact colors and pill shape --- */}
        <div className="bg-[#FADDB1] text-[#A46A25] px-4 py-1.5 rounded-full text-xs font-bold uppercase inline-block">
          {reports.length} Shifts Completed
        </div>
       
      </div>

      {/* Operator Shifts Section */}
      <Section title="Operator Shifts" subtitle={format(new Date(), 'MMMM yyyy')}>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-300">On Time</span>
                <span className="text-white">{shiftStats.onTimePercentage}%</span>
              </div>
              {/* --- FIX: Correct dark track color --- */}
              <div className="w-full bg-[#3A3A3C] rounded-full h-2">
                <div 
                  className="bg-[#FE882A] h-2 rounded-full" 
                  style={{ width: `${shiftStats.onTimePercentage}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-300">Late</span>
                <span className="text-white">{shiftStats.latePercentage}%</span>
              </div>
              <div className="w-full bg-[#3A3A3C] rounded-full h-2">
                <div 
                  className="bg-[#FF453A] h-2 rounded-full" 
                  style={{ width: `${shiftStats.latePercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-1 text-center">Shift Performance</h4>
            {/* --- FIX: Correct darker background for chart area --- */}
            <div className="h-16 bg-[#3A3A3C] rounded-lg p-2 flex items-end justify-between gap-2">
              {/* --- FIX: Thicker bars with rounded tops --- */}
              {weeklyPerformance.map((height, index) => (
                <div
                  key={index}
                  className="bg-[#6EE7F2] rounded-t-md w-full"
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Charger Inspection Section */}
      {/* --- FIX: Added relative positioning for the vertical text --- */}
      <Section title="Charger Inspection" subtitle={format(new Date(), 'MMMM yyyy')} className="relative">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-base text-gray-300">Operational</span>
            <span className="text-base text-white">{inspectionStatus.operational}%</span>
          </div>
          
          {/* --- FIX: Correct green color --- */}
          <div className="w-full bg-[#3A3A3C] rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${inspectionStatus.operational >= 80 ? 'bg-[#34C759]' : 'bg-[#FF453A]'}`}
              style={{ width: `${inspectionStatus.operational}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400">
            {inspectionStatus.lastInspection ? 
              `Last Inspection: ${format(new Date(inspectionStatus.lastInspection), 'do MMM yyyy')}` : 
              'No inspections yet'
            }
          </p>
          <button 
            className="bg-[#A334F3] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#9320e3] transition-colors w-full"
            onClick={() => window.location.href = '/dashboard/charge/inspect'}
          >
            Submit Inspection
          </button>
        </div>
      </Section>
    </div>
  );
}