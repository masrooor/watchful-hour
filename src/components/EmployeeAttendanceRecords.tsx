import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { LogIn, LogOut, ClipboardList } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  "on-time": { label: "On Time", className: "bg-on-time/10 text-on-time border-on-time/20" },
  late: { label: "Late", className: "bg-late/10 text-late border-late/20" },
  absent: { label: "Absent", className: "bg-muted text-muted-foreground border-border" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
};

const EmployeeAttendanceRecords = () => {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
    const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0];

    Promise.all([
      supabase.from("attendance_records").select("*").eq("user_id", user.id).gte("date", startDate).lte("date", endDate).order("date", { ascending: false }),
      supabase.from("attendance_settings").select("work_days").limit(1).single(),
      supabase.from("holidays").select("*").gte("date", startDate).lte("date", endDate),
      supabase.from("leave_requests").select("*").eq("user_id", user.id).eq("status", "approved"),
    ]).then(([attRes, settingsRes, holRes, leaveRes]) => {
      setAttendance(attRes.data || []);
      if (settingsRes.data?.work_days) setWorkDays(settingsRes.data.work_days);
      setHolidays(holRes.data || []);
      setLeaveRequests(leaveRes.data || []);
      setLoading(false);
    });
  }, [user, selectedMonth, selectedYear]);

  const records = useMemo(() => {
    const attendanceByDate: Record<string, any[]> = {};
    attendance.forEach((a) => {
      if (!attendanceByDate[a.date]) attendanceByDate[a.date] = [];
      attendanceByDate[a.date].push(a);
    });

    const holidayDates = new Set(holidays.map((h) => h.date));

    // Build list of all workdays in the month up to today
    const today = new Date().toISOString().split("T")[0];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const allRecords: any[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (dateStr > today) break; // don't show future dates

      const dayOfWeek = new Date(selectedYear, selectedMonth, d).getDay();
      const isWorkDay = workDays.includes(dayOfWeek);
      const isHoliday = holidayDates.has(dateStr);

      // Check if on approved leave
      const isOnLeave = leaveRequests.some(
        (lr) => dateStr >= lr.start_date && dateStr <= lr.end_date
      );

      if (attendanceByDate[dateStr]) {
        // Has attendance records - add each session
        attendanceByDate[dateStr].forEach((a) => {
          allRecords.push(a);
        });
      } else if (isWorkDay && !isHoliday && !isOnLeave) {
        // No record on a workday = absent
        allRecords.push({
          id: `absent-${dateStr}`,
          date: dateStr,
          clock_in: null,
          clock_out: null,
          status: "absent",
          location_name: null,
        });
      }
    }

    // Sort descending by date
    return allRecords.sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, workDays, holidays, leaveRequests, selectedMonth, selectedYear]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Attendance Records
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No records found for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => {
                    const config = statusConfig[r.status] || statusConfig.pending;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm text-foreground font-medium">{r.date}</TableCell>
                        <TableCell>
                          {r.clock_in ? (
                            <span className="flex items-center gap-1 text-sm">
                              <LogIn className="w-3.5 h-3.5 text-muted-foreground" />
                              {new Date(r.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.clock_out ? (
                            <span className="flex items-center gap-1 text-sm">
                              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
                              {new Date(r.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.location_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={config.className}>
                            {config.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeAttendanceRecords;
