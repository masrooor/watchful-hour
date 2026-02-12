import { useMemo } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import StatsCards from "@/components/StatsCards";
import EmployeeList from "@/components/EmployeeList";
import ClockInWidget from "@/components/ClockInWidget";
import NotificationsPanel from "@/components/NotificationsPanel";
import LocationMap from "@/components/LocationMap";
import { mockEmployees, mockAttendance } from "@/data/mockData";
import { AttendanceStats } from "@/types/attendance";

const Index = () => {
  const stats: AttendanceStats = useMemo(() => {
    const present = mockAttendance.filter((a) => a.clockIn !== null).length;
    const late = mockAttendance.filter((a) => a.status === "late").length;
    const absent = mockAttendance.filter((a) => a.status === "absent").length;
    const onTime = mockAttendance.filter((a) => a.status === "on-time").length;
    return {
      totalEmployees: mockEmployees.length,
      present,
      late,
      absent,
      onTime,
    };
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">AttendTrack</h1>
              <p className="text-xs text-muted-foreground">Employee Attendance System</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            <span>{today}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <EmployeeList employees={mockEmployees} attendance={mockAttendance} />
          </div>
          <div className="space-y-6">
            <ClockInWidget />
            <NotificationsPanel employees={mockEmployees} attendance={mockAttendance} />
            <LocationMap employees={mockEmployees} attendance={mockAttendance} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
