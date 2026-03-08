import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Timer, AlertTriangle } from "lucide-react";
import AttendanceCalendar from "@/components/admin/AttendanceCalendar";

const DEFAULT_REQUIRED_DAILY_HOURS = 9;

const calcHours = (clockIn: string | null, clockOut: string | null): number | null => {
  if (!clockIn || !clockOut) return null;
  const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000;
  return Math.round(diff * 100) / 100;
};

const formatHours = (h: number | null): string => {
  if (h === null) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
};

const EmployeeAttendanceCalendar = () => {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [requiredDailyHours, setRequiredDailyHours] = useState(DEFAULT_REQUIRED_DAILY_HOURS);

  useEffect(() => {
    if (!user) return;
    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
    const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0];

    Promise.all([
      supabase.from("attendance_records").select("*").eq("user_id", user.id).gte("date", startDate).lte("date", endDate).order("date", { ascending: true }),
      supabase.from("holidays").select("*").gte("date", startDate).lte("date", endDate),
      supabase.from("leave_requests").select("*").eq("user_id", user.id).eq("status", "approved"),
      supabase.from("attendance_settings").select("work_days, required_daily_hours").limit(1).single(),
    ]).then(([attRes, holRes, leaveRes, settingsRes]) => {
      setAttendance(attRes.data || []);
      setHolidays(holRes.data || []);
      setLeaveRequests(leaveRes.data || []);
      if (settingsRes.data?.work_days) setWorkDays(settingsRes.data.work_days);
      if (settingsRes.data?.required_daily_hours) setRequiredDailyHours(Number(settingsRes.data.required_daily_hours));
    });
  }, [user, selectedMonth, selectedYear]);

  const holidayDates = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  const summary = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const today = new Date();
    let totalWorkingDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(selectedYear, selectedMonth, d);
      const dateStr = date.toISOString().split("T")[0];
      if (date <= today && workDays.includes(date.getDay()) && !holidayDates.has(dateStr)) {
        totalWorkingDays++;
      }
    }

    const requiredHours = totalWorkingDays * requiredDailyHours;
    let actualHours = 0;
    let daysWorked = 0;

    attendance.forEach((a) => {
      const h = calcHours(a.clock_in, a.clock_out);
      if (h !== null) { actualHours += h; daysWorked++; }
    });

    const shortfall = Math.max(0, requiredHours - actualHours);
    const overtime = Math.max(0, actualHours - requiredHours);
    const completionPct = requiredHours > 0 ? Math.min(100, (actualHours / requiredHours) * 100) : 0;

    return { totalWorkingDays, requiredHours, actualHours, shortfall, overtime, completionPct, daysWorked };
  }, [attendance, selectedMonth, selectedYear, workDays, holidayDates, requiredDailyHours]);

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

      {/* Monthly Hours Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="w-4 h-4" /> Monthly Hours Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Working Days</p>
              <p className="text-lg font-bold text-foreground">{summary.totalWorkingDays}</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Days Worked</p>
              <p className="text-lg font-bold text-foreground">{summary.daysWorked}</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Required Hours</p>
              <p className="text-lg font-bold text-foreground">{formatHours(summary.requiredHours)}</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Actual Hours</p>
              <p className="text-lg font-bold text-primary">{formatHours(summary.actualHours)}</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Short Hours</p>
              <p className={`text-lg font-bold ${summary.shortfall > 0 ? "text-destructive" : "text-on-time"}`}>
                {summary.shortfall > 0 ? formatHours(summary.shortfall) : "None"}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Overtime</p>
              <p className={`text-lg font-bold ${summary.overtime > 0 ? "text-on-time" : "text-muted-foreground"}`}>
                {summary.overtime > 0 ? formatHours(summary.overtime) : "None"}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Hours Completion</span>
              <span>{summary.completionPct.toFixed(1)}%</span>
            </div>
            <Progress value={summary.completionPct} className="h-2" />
            {summary.shortfall > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" />
                You are {formatHours(summary.shortfall)} short of required hours this month
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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