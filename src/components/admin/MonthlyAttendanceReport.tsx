import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, CalendarDays, User, Clock, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface MonthlyAttendanceReportProps {
  profiles: any[];
  profileMap: Record<string, any>;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MonthlyAttendanceReport = ({ profiles, profileMap }: MonthlyAttendanceReportProps) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
    const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0];

    const [attRes, leaveRes, settingsRes, holidayRes] = await Promise.all([
      supabase.from("attendance_records").select("*").gte("date", startDate).lte("date", endDate),
      supabase.from("leave_requests").select("*").eq("status", "approved").lte("start_date", endDate).gte("end_date", startDate),
      supabase.from("attendance_settings").select("*").limit(1).single(),
      supabase.from("holidays").select("*").gte("date", startDate).lte("date", endDate),
    ]);

    setAttendanceData(attRes.data || []);
    setLeaveData(leaveRes.data || []);
    setSettings(settingsRes.data);
    setHolidays(holidayRes.data || []);
    setLoading(false);
  };

  const workDays = useMemo(() => {
    if (!settings) return [1, 2, 3, 4, 5, 6];
    return settings.work_days || [1, 2, 3, 4, 5, 6];
  }, [settings]);

  const holidayDates = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const totalWorkingDays = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(selectedYear, selectedMonth, d);
      const dateStr = date.toISOString().split("T")[0];
      if (workDays.includes(date.getDay()) && !holidayDates.has(dateStr)) count++;
    }
    return count;
  }, [daysInMonth, selectedMonth, selectedYear, workDays, holidayDates]);

  const filteredProfiles = useMemo(() => {
    if (selectedEmployee === "all") return profiles;
    return profiles.filter((p) => p.user_id === selectedEmployee);
  }, [profiles, selectedEmployee]);

  const reportData = useMemo(() => {
    return filteredProfiles.map((p) => {
      const userAtt = attendanceData.filter((a) => a.user_id === p.user_id);
      const presentDays = userAtt.filter((a) => a.clock_in).length;
      const lateDays = userAtt.filter((a) => a.status === "late").length;
      const onTimeDays = userAtt.filter((a) => a.status === "on-time").length;

      // Leave days in this month
      const userLeaves = leaveData.filter((l) => l.user_id === p.user_id);
      let leaveDays = 0;
      userLeaves.forEach((l) => {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        const effStart = start < monthStart ? monthStart : start;
        const effEnd = end > monthEnd ? monthEnd : end;
        leaveDays += Math.max(0, Math.floor((effEnd.getTime() - effStart.getTime()) / 86400000) + 1);
      });

      const absentDays = Math.max(0, totalWorkingDays - presentDays - leaveDays);
      const attendanceRate = totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0;

      // Day-by-day breakdown
      const dayBreakdown: { date: string; dayName: string; status: string }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(selectedYear, selectedMonth, d);
        const dateStr = date.toISOString().split("T")[0];
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

        if (holidayDates.has(dateStr)) {
          dayBreakdown.push({ date: dateStr, dayName, status: "holiday" });
        } else if (!workDays.includes(date.getDay())) {
          dayBreakdown.push({ date: dateStr, dayName, status: "off" });
        } else {
          const record = userAtt.find((a) => a.date === dateStr);
          if (record?.clock_in) {
            dayBreakdown.push({ date: dateStr, dayName, status: record.status });
          } else {
            // Check if on leave
            const onLeave = userLeaves.some((l) => dateStr >= l.start_date && dateStr <= l.end_date);
            dayBreakdown.push({ date: dateStr, dayName, status: onLeave ? "leave" : (new Date(dateStr) <= now ? "absent" : "upcoming") });
          }
        }
      }

      return { ...p, presentDays, lateDays, onTimeDays, leaveDays, absentDays, attendanceRate, dayBreakdown };
    });
  }, [filteredProfiles, attendanceData, leaveData, totalWorkingDays, daysInMonth, selectedMonth, selectedYear, workDays, holidayDates]);

  const exportCSV = () => {
    const headers = ["Employee", "Department", "Present", "On Time", "Late", "Leaves", "Absent", "Attendance %"];
    const rows = reportData.map((r) =>
      [r.name, r.department, r.presentDays, r.onTimeDays, r.lateDays, r.leaveDays, r.absentDays, r.attendanceRate.toFixed(1) + "%"].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${months[selectedMonth]}-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const statusColors: Record<string, string> = {
    "on-time": "bg-on-time text-white",
    late: "bg-warning text-white",
    absent: "bg-late text-white",
    leave: "bg-primary text-primary-foreground",
    holiday: "bg-accent text-accent-foreground",
    off: "bg-muted text-muted-foreground",
    upcoming: "bg-muted/50 text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    "on-time": "✓",
    late: "L",
    absent: "A",
    leave: "LV",
    holiday: "H",
    off: "—",
    upcoming: "·",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
          <SelectTrigger className="w-[150px]">
            <CalendarDays className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i} value={String(i)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-[200px]">
            <User className="w-4 h-4 mr-1" />
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { label: "On Time", color: "bg-on-time", symbol: "✓" },
          { label: "Late", color: "bg-warning", symbol: "L" },
          { label: "Absent", color: "bg-late", symbol: "A" },
          { label: "Leave", color: "bg-primary", symbol: "LV" },
          { label: "Holiday", color: "bg-accent", symbol: "H" },
          { label: "Off Day", color: "bg-muted", symbol: "—" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${item.color} text-white`}>
              {item.symbol}
            </span>
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Employee Reports */}
      {reportData.map((emp) => (
        <Card key={emp.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {(emp.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <CardTitle className="text-base">{emp.name}</CardTitle>
                  <CardDescription>{emp.department} • {emp.employee_id || "—"}</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{emp.attendanceRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-on-time" />
                <span className="text-muted-foreground">Present:</span>
                <span className="font-semibold text-foreground">{emp.presentDays}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-on-time" />
                <span className="text-muted-foreground">On Time:</span>
                <span className="font-semibold text-foreground">{emp.onTimeDays}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-muted-foreground">Late:</span>
                <span className="font-semibold text-foreground">{emp.lateDays}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Leaves:</span>
                <span className="font-semibold text-foreground">{emp.leaveDays}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4 text-late" />
                <span className="text-muted-foreground">Absent:</span>
                <span className="font-semibold text-foreground">{emp.absentDays}</span>
              </div>
            </div>

            <Progress value={emp.attendanceRate} className="h-2" />

            {/* Day Grid */}
            <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 lg:grid-cols-31 gap-1">
              {emp.dayBreakdown.map((day) => (
                <div
                  key={day.date}
                  className={`w-full aspect-square rounded text-[9px] font-bold flex flex-col items-center justify-center ${statusColors[day.status] || "bg-muted"}`}
                  title={`${day.date} (${day.dayName}) — ${day.status}`}
                >
                  <span>{new Date(day.date).getDate()}</span>
                  <span className="text-[8px]">{statusLabels[day.status]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MonthlyAttendanceReport;
