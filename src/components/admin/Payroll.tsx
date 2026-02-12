import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2, DollarSign, CalendarDays, MinusCircle } from "lucide-react";

interface PayrollProps {
  profiles: any[];
  profileMap: Record<string, any>;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const Payroll = ({ profiles, profileMap }: PayrollProps) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
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

    const [leaveRes, attRes, settingsRes, holidayRes] = await Promise.all([
      supabase
        .from("leave_requests")
        .select("*")
        .eq("status", "approved")
        .gte("start_date", startDate)
        .lte("start_date", endDate),
      supabase
        .from("attendance_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate),
      supabase.from("attendance_settings").select("*").limit(1).single(),
      supabase.from("holidays").select("*").gte("date", startDate).lte("date", endDate),
    ]);

    setLeaveData(leaveRes.data || []);
    setAttendanceData(attRes.data || []);
    setSettings(settingsRes.data);
    setHolidays(holidayRes.data || []);
    setLoading(false);
  };

  const workDays = useMemo(() => {
    if (!settings) return [1, 2, 3, 4, 5, 6];
    return settings.work_days || [1, 2, 3, 4, 5, 6];
  }, [settings]);

  const totalWorkingDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const holidayDates = new Set(holidays.map((h) => h.date));
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(selectedYear, selectedMonth, d);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split("T")[0];
      if (workDays.includes(dayOfWeek) && !holidayDates.has(dateStr)) {
        count++;
      }
    }
    return count;
  }, [selectedMonth, selectedYear, workDays, holidays]);

  const payrollData = useMemo(() => {
    return profiles.map((p) => {
      const salary = p.salary ? Number(p.salary) : 0;
      const perDaySalary = totalWorkingDays > 0 ? salary / totalWorkingDays : 0;

      // Count approved leave days in this month for this user
      const userLeaves = leaveData.filter((l) => l.user_id === p.user_id);
      let leaveDays = 0;
      userLeaves.forEach((l) => {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        const effStart = start < monthStart ? monthStart : start;
        const effEnd = end > monthEnd ? monthEnd : end;
        const days = Math.max(0, Math.floor((effEnd.getTime() - effStart.getTime()) / 86400000) + 1);
        leaveDays += days;
      });

      // Count attendance (present days)
      const userAttendance = attendanceData.filter((a) => a.user_id === p.user_id && a.clock_in);
      const presentDays = userAttendance.length;
      const lateDays = userAttendance.filter((a) => a.status === "late").length;

      // Unpaid leave deduction (leaves beyond paid quota are deducted)
      // For simplicity: all approved leaves are paid, absent days (not on leave, not present) are deducted
      const absentDays = Math.max(0, totalWorkingDays - presentDays - leaveDays);
      const deduction = absentDays * perDaySalary;
      const netSalary = Math.max(0, salary - deduction);

      return {
        ...p,
        salary,
        perDaySalary,
        leaveDays,
        presentDays,
        lateDays,
        absentDays,
        deduction,
        netSalary,
      };
    });
  }, [profiles, leaveData, attendanceData, totalWorkingDays, selectedMonth, selectedYear]);

  const exportPayrollCSV = () => {
    const headers = ["Employee ID", "Name", "Department", "Salary", "Working Days", "Present", "Leaves", "Absent", "Deduction", "Net Salary"];
    const rows = payrollData.map((p) =>
      [p.employee_id || "", p.name, p.department, p.salary, totalWorkingDays, p.presentDays, p.leaveDays, p.absentDays, p.deduction.toFixed(0), p.netSalary.toFixed(0)].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-${months[selectedMonth]}-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalGross = payrollData.reduce((s, p) => s + p.salary, 0);
  const totalDeductions = payrollData.reduce((s, p) => s + p.deduction, 0);
  const totalNet = payrollData.reduce((s, p) => s + p.netSalary, 0);

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
        <Button variant="outline" size="sm" onClick={exportPayrollCSV}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-xl">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Working Days</p>
                <p className="text-2xl font-bold text-foreground">{totalWorkingDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-on-time/10 p-3 rounded-xl">
                <DollarSign className="w-5 h-5 text-on-time" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gross</p>
                <p className="text-2xl font-bold text-foreground">Rs {totalGross.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-late/10 p-3 rounded-xl">
                <MinusCircle className="w-5 h-5 text-late" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deductions</p>
                <p className="text-2xl font-bold text-foreground">Rs {totalDeductions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-accent p-3 rounded-xl">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Net</p>
                <p className="text-2xl font-bold text-foreground">Rs {totalNet.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Payroll — {months[selectedMonth]} {selectedYear}
          </CardTitle>
          <CardDescription>
            Salary auto-calculated after deducting absent days. Approved leaves are paid.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Gross Salary</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Leaves</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-right">Deduction</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                payrollData.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.employee_id || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.department || "—"}</TableCell>
                    <TableCell className="text-right text-sm font-medium">Rs {p.salary.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-on-time/10 text-on-time">{p.presentDays}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-warning/10 text-warning">{p.leaveDays}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={p.absentDays > 0 ? "bg-late/10 text-late" : ""}>{p.absentDays}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-late font-medium">
                      {p.deduction > 0 ? `- Rs ${p.deduction.toFixed(0)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-foreground">
                      Rs {p.netSalary.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payroll;
