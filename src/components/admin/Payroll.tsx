import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2, DollarSign, CalendarDays, MinusCircle, Percent } from "lucide-react";
import PayslipGenerator from "./PayslipGenerator";
import TaxSlabSettings from "./TaxSlabSettings";
import PayrollPaymentCell from "./PayrollPaymentCell";

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
  const [loans, setLoans] = useState<any[]>([]);
  const [taxSlabs, setTaxSlabs] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
    const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0];

    const [leaveRes, attRes, settingsRes, holidayRes, loanRes, taxRes, allowanceRes, deductionRes, paymentRes] = await Promise.all([
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
      supabase.from("employee_loans").select("*").eq("is_active", true),
      supabase.from("tax_slabs").select("*").eq("is_active", true).order("min_salary", { ascending: true }),
      supabase.from("employee_allowances").select("*").eq("is_active", true),
      supabase.from("employee_deductions").select("*").eq("is_active", true),
      supabase.from("payroll_payments" as any).select("*").eq("month", selectedMonth).eq("year", selectedYear),
    ]);

    setLeaveData(leaveRes.data || []);
    setAttendanceData(attRes.data || []);
    setSettings(settingsRes.data);
    setHolidays(holidayRes.data || []);
    setLoans(loanRes.data || []);
    setTaxSlabs(taxRes.data || []);
    setAllowances(allowanceRes.data || []);
    setDeductions(deductionRes.data || []);
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

      // Unpaid leave deduction
      const absentDays = Math.max(0, totalWorkingDays - presentDays - leaveDays);
      const absentDeduction = absentDays * perDaySalary;

      // Loan deductions (sum of monthly deductions for active loans)
      const userLoans = loans.filter((l) => l.user_id === p.user_id);
      const loanDeduction = userLoans.reduce((s, l) => s + Number(l.monthly_deduction), 0);

      // Allowances
      const userAllowances = allowances.filter((a) => a.user_id === p.user_id);
      const totalAllowances = userAllowances.reduce((s, a) => s + Number(a.amount), 0);

      // Custom deductions
      const userDeductions = deductions.filter((d) => d.user_id === p.user_id);
      const totalCustomDeductions = userDeductions.reduce((s, d) => {
        return s + (d.is_percentage ? (salary * Number(d.amount)) / 100 : Number(d.amount));
      }, 0);

      // Tax calculation based on active slabs
      let taxPercentage = 0;
      for (const slab of taxSlabs) {
        const min = Number(slab.min_salary);
        const max = slab.max_salary ? Number(slab.max_salary) : Infinity;
        if (salary >= min && salary <= max) {
          taxPercentage = Number(slab.percentage);
          break;
        }
      }
      const taxDeduction = (salary * taxPercentage) / 100;

      const totalDeduction = absentDeduction + loanDeduction + taxDeduction + totalCustomDeductions;
      const grossWithAllowances = salary + totalAllowances;
      const netSalary = Math.max(0, grossWithAllowances - totalDeduction);

      return {
        ...p,
        salary,
        perDaySalary,
        leaveDays,
        presentDays,
        lateDays,
        absentDays,
        absentDeduction,
        loanDeduction,
        taxPercentage,
        taxDeduction,
        totalAllowances,
        totalCustomDeductions,
        userAllowances,
        userDeductions,
        deduction: totalDeduction,
        netSalary,
      };
    });
  }, [profiles, leaveData, attendanceData, totalWorkingDays, selectedMonth, selectedYear, loans, taxSlabs, allowances, deductions]);

  const exportPayrollCSV = () => {
    const headers = ["Employee ID", "Name", "Department", "Salary", "Allowances", "Working Days", "Present", "Leaves", "Absent", "Absent Deduction", "Loan Deduction", "Custom Deductions", "Tax %", "Tax Deduction", "Total Deduction", "Net Salary"];
    const rows = payrollData.map((p) =>
      [p.employee_id || "", p.name, p.department, p.salary, p.totalAllowances.toFixed(0), totalWorkingDays, p.presentDays, p.leaveDays, p.absentDays, p.absentDeduction.toFixed(0), p.loanDeduction.toFixed(0), p.totalCustomDeductions.toFixed(0), p.taxPercentage, p.taxDeduction.toFixed(0), p.deduction.toFixed(0), p.netSalary.toFixed(0)].join(",")
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
            Salary auto-calculated with allowances, absent deductions, loan installments, custom deductions, and applicable tax. Approved leaves are paid.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead>Employee</TableHead>
                 <TableHead>Department</TableHead>
                 <TableHead className="text-right">Gross</TableHead>
                 <TableHead className="text-right">Allowances</TableHead>
                 <TableHead className="text-center">Present</TableHead>
                 <TableHead className="text-center">Absent</TableHead>
                 <TableHead className="text-right">Absent Ded.</TableHead>
                 <TableHead className="text-right">Loan Ded.</TableHead>
                 <TableHead className="text-right">Custom Ded.</TableHead>
                 <TableHead className="text-right">Tax Ded.</TableHead>
                 <TableHead className="text-right">Net Salary</TableHead>
                 <TableHead className="text-center">Payslip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
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
                    <TableCell className="text-right text-sm font-medium text-primary">
                      {p.totalAllowances > 0 ? `+ Rs ${p.totalAllowances.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-on-time/10 text-on-time">{p.presentDays}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={p.absentDays > 0 ? "bg-late/10 text-late" : ""}>{p.absentDays}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-late font-medium">
                      {p.absentDeduction > 0 ? `- Rs ${p.absentDeduction.toFixed(0)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-late font-medium">
                      {p.loanDeduction > 0 ? `- Rs ${p.loanDeduction.toFixed(0)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-late font-medium">
                      {p.totalCustomDeductions > 0 ? `- Rs ${p.totalCustomDeductions.toFixed(0)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-late font-medium">
                      {p.taxDeduction > 0 ? `- Rs ${p.taxDeduction.toFixed(0)} (${p.taxPercentage}%)` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-foreground">
                      Rs {p.netSalary.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </TableCell>
                    <TableCell className="text-center">
                      <PayslipGenerator
                        employee={p}
                        month={months[selectedMonth]}
                        year={selectedYear}
                        totalWorkingDays={totalWorkingDays}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tax Slab Settings */}
      <TaxSlabSettings />
    </div>
  );
};

export default Payroll;
