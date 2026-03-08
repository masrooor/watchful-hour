import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import AttendanceCalendar from "@/components/admin/AttendanceCalendar";

const EmployeeAttendanceCalendar = () => {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    if (!user) return;
    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
    const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0];

    Promise.all([
      supabase.from("attendance_records").select("*").eq("user_id", user.id).gte("date", startDate).lte("date", endDate).order("date", { ascending: true }),
      supabase.from("holidays").select("*").gte("date", startDate).lte("date", endDate),
      supabase.from("leave_requests").select("*").eq("user_id", user.id).eq("status", "approved"),
      supabase.from("attendance_settings").select("work_days").limit(1).single(),
    ]).then(([attRes, holRes, leaveRes, settingsRes]) => {
      setAttendance(attRes.data || []);
      setHolidays(holRes.data || []);
      setLeaveRequests(leaveRes.data || []);
      if (settingsRes.data?.work_days) setWorkDays(settingsRes.data.work_days);
    });
  }, [user, selectedMonth, selectedYear]);

  const holidayDates = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <CalendarDays className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
              <SelectItem key={i} value={String(i)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i).map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AttendanceCalendar
        month={selectedMonth}
        year={selectedYear}
        attendance={attendance}
        holidays={holidayDates}
        workDays={workDays}
        leaveRequests={leaveRequests}
      />
    </div>
  );
};

export default EmployeeAttendanceCalendar;
