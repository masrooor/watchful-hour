import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, User, CalendarDays, TreePalm, Wallet, FileText,
  Phone, Mail, MapPin, Briefcase, Clock, LogIn, LogOut, Timer, AlertTriangle, Pencil, Save, X,
} from "lucide-react";
import AttendanceCalendar from "./AttendanceCalendar";
import SalaryIncrementManager from "./SalaryIncrementManager";

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

interface EmployeeDetailViewProps {
  profile: any;
  onBack: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  "on-time": { label: "On Time", className: "bg-on-time/10 text-on-time border-on-time/20" },
  late: { label: "Late", className: "bg-late/10 text-late border-late/20" },
  absent: { label: "Absent", className: "bg-muted text-muted-foreground border-border" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
};

const leaveStatusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-on-time/10 text-on-time",
  rejected: "bg-late/10 text-late",
};

const EmployeeDetailView = ({ profile: initialProfile, onBack }: EmployeeDetailViewProps) => {
  const [profile, setProfile] = useState(initialProfile);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  useEffect(() => {
    const fetchAll = async () => {
      const [attRes, balRes, leavesRes, loansRes, allowRes, dedRes, settingsRes] = await Promise.all([
        supabase.from("attendance_records").select("*").eq("user_id", profile.user_id).order("date", { ascending: false }).limit(30),
        supabase.from("leave_balances").select("*").eq("user_id", profile.user_id).eq("year", new Date().getFullYear()).maybeSingle(),
        supabase.from("leave_requests").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }).limit(20),
        supabase.from("employee_loans").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }),
        supabase.from("employee_allowances").select("*").eq("user_id", profile.user_id),
        supabase.from("employee_deductions").select("*").eq("user_id", profile.user_id),
        supabase.from("attendance_settings").select("*").limit(1).single(),
      ]);
      setAttendance(attRes.data || []);
      setLeaveBalance(balRes.data);
      setLeaveRequests(leavesRes.data || []);
      setLoans(loansRes.data || []);
      setAllowances(allowRes.data || []);
      setDeductions(dedRes.data || []);
      setSettings(settingsRes.data);
      setLoading(false);
    };
    fetchAll();
  }, [profile.user_id]);

  // Fetch monthly attendance and holidays when month/year changes
  useEffect(() => {
    const fetchMonthly = async () => {
      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
      const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0];
      const [attRes, holRes] = await Promise.all([
        supabase.from("attendance_records").select("*").eq("user_id", profile.user_id).gte("date", startDate).lte("date", endDate).order("date", { ascending: true }),
        supabase.from("holidays").select("*").gte("date", startDate).lte("date", endDate),
      ]);
      setMonthlyAttendance(attRes.data || []);
      setHolidays(holRes.data || []);
    };
    fetchMonthly();
  }, [profile.user_id, selectedMonth, selectedYear]);

  const workDays = settings?.work_days || [1, 2, 3, 4, 5, 6];
  const requiredDailyHours = Number(profile.required_daily_hours) || Number(settings?.required_daily_hours) || DEFAULT_REQUIRED_DAILY_HOURS;
  const holidayDates = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  const monthlyHoursSummary = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    let totalWorkingDays = 0;
    const today = new Date();
    
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

    monthlyAttendance.forEach((a) => {
      const h = calcHours(a.clock_in, a.clock_out);
      if (h !== null) {
        actualHours += h;
        daysWorked++;
      }
    });

    const shortfall = Math.max(0, requiredHours - actualHours);
    const overtime = Math.max(0, actualHours - requiredHours);
    const completionPct = requiredHours > 0 ? Math.min(100, (actualHours / requiredHours) * 100) : 0;

    return { totalWorkingDays, requiredHours, actualHours, shortfall, overtime, completionPct, daysWorked };
  }, [monthlyAttendance, selectedMonth, selectedYear, workDays, holidayDates]);

  const initials = (profile.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const balanceCards = [
    { label: "Casual", total: "casual_total", used: "casual_used", color: "text-primary" },
    { label: "Sick", total: "sick_total", used: "sick_used", color: "text-destructive" },
    { label: "Annual", total: "annual_total", used: "annual_used", color: "text-on-time" },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Employee List
      </Button>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {initials}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
                <Badge variant="secondary" className="font-mono text-xs">{profile.employee_id || "—"}</Badge>
                <Badge variant="outline" className={profile.job_status === "permanent" ? "bg-on-time/10 text-on-time border-on-time/20" : "bg-warning/10 text-warning border-warning/20"}>
                  {profile.job_status === "permanent" ? "Permanent" : "Probation"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{profile.designation || "No designation"} · {profile.department}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {profile.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{profile.email}</span>}
                {profile.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{profile.phone}</span>}
                {profile.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.city}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile"><User className="w-4 h-4 mr-1" />Profile</TabsTrigger>
          <TabsTrigger value="attendance"><CalendarDays className="w-4 h-4 mr-1" />Attendance</TabsTrigger>
          <TabsTrigger value="leaves"><TreePalm className="w-4 h-4 mr-1" />Leaves</TabsTrigger>
          <TabsTrigger value="loans"><Wallet className="w-4 h-4 mr-1" />Loans</TabsTrigger>
          <TabsTrigger value="payroll"><FileText className="w-4 h-4 mr-1" />Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Personal Information</CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => { setEditing(true); setEditData({ ...profile }); }} className="gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="gap-1">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </Button>
                  <Button size="sm" disabled={saving} onClick={async () => {
                    setSaving(true);
                    const { error } = await supabase.from("profiles").update({
                      name: editData.name,
                      email: editData.email,
                      phone: editData.phone,
                      cnic: editData.cnic,
                      date_of_birth: editData.date_of_birth || null,
                      city: editData.city,
                      address: editData.address,
                      department: editData.department,
                      designation: editData.designation,
                      employment_type: editData.employment_type,
                      job_status: editData.job_status,
                      joining_date: editData.joining_date || null,
                      shift_start: editData.shift_start || null,
                      shift_end: editData.shift_end || null,
                      salary: editData.salary ? Number(editData.salary) : null,
                      required_daily_hours: editData.required_daily_hours ? Number(editData.required_daily_hours) : null,
                      emergency_contact_name: editData.emergency_contact_name,
                      emergency_contact_phone: editData.emergency_contact_phone,
                    }).eq("id", profile.id);
                    setSaving(false);
                    if (error) { toast.error("Failed to save", { description: error.message }); }
                    else { setProfile({ ...profile, ...editData }); setEditing(false); toast.success("Profile updated"); }
                  }} className="gap-1">
                    <Save className="w-3.5 h-3.5" /> Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: "Full Name", key: "name", type: "text" },
                    { label: "Email", key: "email", type: "email" },
                    { label: "Phone", key: "phone", type: "text" },
                    { label: "CNIC", key: "cnic", type: "text" },
                    { label: "Date of Birth", key: "date_of_birth", type: "date" },
                    { label: "City", key: "city", type: "text" },
                    { label: "Address", key: "address", type: "text" },
                    { label: "Department", key: "department", type: "text" },
                    { label: "Designation", key: "designation", type: "text" },
                    { label: "Joining Date", key: "joining_date", type: "date" },
                    { label: "Shift Start", key: "shift_start", type: "time" },
                    { label: "Shift End", key: "shift_end", type: "time" },
                    { label: "Salary", key: "salary", type: "number" },
                    { label: "Required Daily Hours", key: "required_daily_hours", type: "number" },
                    { label: "Emergency Contact", key: "emergency_contact_name", type: "text" },
                    { label: "Emergency Phone", key: "emergency_contact_phone", type: "text" },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type={field.type}
                        value={editData[field.key] || ""}
                        onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Employment Type</Label>
                    <Select value={editData.employment_type || "full-time"} onValueChange={(v) => setEditData({ ...editData, employment_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Job Status</Label>
                    <Select value={editData.job_status || "probation"} onValueChange={(v) => setEditData({ ...editData, job_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="probation">Probation</SelectItem>
                        <SelectItem value="permanent">Permanent</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: "Full Name", value: profile.name },
                    { label: "Email", value: profile.email },
                    { label: "Phone", value: profile.phone },
                    { label: "CNIC", value: profile.cnic },
                    { label: "Date of Birth", value: profile.date_of_birth },
                    { label: "City", value: profile.city },
                    { label: "Address", value: profile.address },
                    { label: "Department", value: profile.department },
                    { label: "Designation", value: profile.designation },
                    { label: "Employment Type", value: profile.employment_type },
                    { label: "Job Status", value: profile.job_status },
                    { label: "Joining Date", value: profile.joining_date },
                    { label: "Shift", value: profile.shift_start && profile.shift_end ? `${profile.shift_start.slice(0, 5)} - ${profile.shift_end.slice(0, 5)}` : null },
                    { label: "Salary", value: profile.salary ? `Rs ${Number(profile.salary).toLocaleString()}` : null },
                    { label: "Emergency Contact", value: profile.emergency_contact_name },
                    { label: "Emergency Phone", value: profile.emergency_contact_phone },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.value || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <div className="space-y-4">
            {/* Month/Year Selector */}
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
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Monthly Hours Summary */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Timer className="w-4 h-4" /> Monthly Hours Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Working Days</p>
                    <p className="text-lg font-bold text-foreground">{monthlyHoursSummary.totalWorkingDays}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Days Worked</p>
                    <p className="text-lg font-bold text-foreground">{monthlyHoursSummary.daysWorked}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Required Hours</p>
                    <p className="text-lg font-bold text-foreground">{formatHours(monthlyHoursSummary.requiredHours)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Actual Hours</p>
                    <p className="text-lg font-bold text-primary">{formatHours(monthlyHoursSummary.actualHours)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Short Hours</p>
                    <p className={`text-lg font-bold ${monthlyHoursSummary.shortfall > 0 ? "text-destructive" : "text-on-time"}`}>
                      {monthlyHoursSummary.shortfall > 0 ? formatHours(monthlyHoursSummary.shortfall) : "None"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Overtime</p>
                    <p className={`text-lg font-bold ${monthlyHoursSummary.overtime > 0 ? "text-on-time" : "text-muted-foreground"}`}>
                      {monthlyHoursSummary.overtime > 0 ? formatHours(monthlyHoursSummary.overtime) : "None"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Hours Completion</span>
                    <span>{monthlyHoursSummary.completionPct.toFixed(1)}%</span>
                  </div>
                  <Progress value={monthlyHoursSummary.completionPct} className="h-2" />
                  {monthlyHoursSummary.shortfall > 0 && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      Employee is {formatHours(monthlyHoursSummary.shortfall)} short of required hours this month
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attendance Calendar */}
            <AttendanceCalendar
              month={selectedMonth}
              year={selectedYear}
              attendance={monthlyAttendance}
              holidays={holidayDates}
              workDays={workDays}
              leaveRequests={leaveRequests}
            />

            {/* Daily Attendance with Hours */}
            <Card>
              <CardHeader><CardTitle className="text-base">Daily Attendance</CardTitle></CardHeader>
              <CardContent>
                {monthlyAttendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No attendance records for this month</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Hours Worked</TableHead>
                        <TableHead>Short/Over</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyAttendance.map((a) => {
                        const config = statusConfig[a.status] || statusConfig.pending;
                        const hours = calcHours(a.clock_in, a.clock_out);
                        const diff = hours !== null ? hours - requiredDailyHours : null;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="text-sm">{a.date}</TableCell>
                            <TableCell className="text-sm">
                              {a.clock_in ? (
                                <span className="flex items-center gap-1">
                                  <LogIn className="w-3.5 h-3.5 text-muted-foreground" />
                                  {new Date(a.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {a.clock_out ? (
                                <span className="flex items-center gap-1">
                                  <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
                                  {new Date(a.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {formatHours(hours)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {diff !== null ? (
                                <span className={diff >= 0 ? "text-on-time" : "text-destructive"}>
                                  {diff >= 0 ? `+${formatHours(diff)}` : `-${formatHours(Math.abs(diff))}`}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={config.className}>{config.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leaves Tab */}
        <TabsContent value="leaves">
          <div className="space-y-4">
            {/* Leave Balance */}
            {leaveBalance && (
              <Card>
                <CardHeader><CardTitle className="text-base">Leave Balance ({new Date().getFullYear()})</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {balanceCards.map((c) => {
                      const total = leaveBalance[c.total] || 0;
                      const used = leaveBalance[c.used] || 0;
                      const remaining = total - used;
                      const pct = total > 0 ? (used / total) * 100 : 0;
                      return (
                        <div key={c.label} className="rounded-lg border border-border p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${c.color}`}>{c.label}</span>
                            <span className="text-xs text-muted-foreground">{used}/{total} used</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                          <p className="text-lg font-bold text-foreground">{remaining} <span className="text-xs font-normal text-muted-foreground">remaining</span></p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Leave Requests */}
            <Card>
              <CardHeader><CardTitle className="text-base">Leave Requests</CardTitle></CardHeader>
              <CardContent>
                {leaveRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No leave requests</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.map((l) => {
                        const days = Math.ceil((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / (86400000)) + 1;
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="text-sm capitalize">{l.leave_type}</TableCell>
                            <TableCell className="text-sm">{l.start_date}</TableCell>
                            <TableCell className="text-sm">{l.end_date}</TableCell>
                            <TableCell className="text-sm">{days}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{l.reason || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={leaveStatusColors[l.status]}>{l.status}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans">
          <Card>
            <CardHeader><CardTitle className="text-base">Loans</CardTitle></CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No loans</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Monthly Deduction</TableHead>
                      <TableHead>Total Deducted</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="text-sm">{loan.description}</TableCell>
                        <TableCell className="text-sm">Rs {Number(loan.total_amount).toLocaleString()}</TableCell>
                        <TableCell className="text-sm">Rs {Number(loan.monthly_deduction).toLocaleString()}</TableCell>
                        <TableCell className="text-sm">Rs {Number(loan.total_deducted).toLocaleString()}</TableCell>
                        <TableCell className="text-sm font-medium">Rs {Number(loan.total_amount - loan.total_deducted).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={leaveStatusColors[loan.approval_status] || ""}>{loan.approval_status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Salary & Compensation</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Base Salary</p>
                    <p className="text-lg font-bold text-foreground">{profile.salary ? `Rs ${Number(profile.salary).toLocaleString()}` : "Not set"}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Total Allowances</p>
                    <p className="text-lg font-bold text-on-time">Rs {allowances.filter(a => a.is_active).reduce((s, a) => s + Number(a.amount), 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Total Deductions</p>
                    <p className="text-lg font-bold text-destructive">Rs {deductions.filter(d => d.is_active).reduce((s, d) => s + Number(d.amount), 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {allowances.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Allowances</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allowances.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm">{a.label}</TableCell>
                          <TableCell className="text-sm capitalize">{a.allowance_type}</TableCell>
                          <TableCell className="text-sm">Rs {Number(a.amount).toLocaleString()}</TableCell>
                          <TableCell><Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Yes" : "No"}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {deductions.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Deductions</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deductions.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-sm">{d.label}</TableCell>
                          <TableCell className="text-sm capitalize">{d.deduction_type}</TableCell>
                          <TableCell className="text-sm">{d.is_percentage ? `${d.amount}%` : `Rs ${Number(d.amount).toLocaleString()}`}</TableCell>
                          <TableCell><Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? "Yes" : "No"}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <SalaryIncrementManager
              profile={profile}
              onSalaryUpdated={() => {
                supabase.from("profiles").select("*").eq("id", profile.id).single().then(({ data }) => {
                  if (data) setProfile(data);
                });
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetailView;
