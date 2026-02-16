import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, User, CalendarDays, TreePalm, Wallet, FileText,
  Phone, Mail, MapPin, Briefcase, Clock, LogIn, LogOut,
} from "lucide-react";

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

const EmployeeDetailView = ({ profile, onBack }: EmployeeDetailViewProps) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [attRes, balRes, leavesRes, loansRes, allowRes, dedRes] = await Promise.all([
        supabase.from("attendance_records").select("*").eq("user_id", profile.user_id).order("date", { ascending: false }).limit(30),
        supabase.from("leave_balances").select("*").eq("user_id", profile.user_id).eq("year", new Date().getFullYear()).maybeSingle(),
        supabase.from("leave_requests").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }).limit(20),
        supabase.from("employee_loans").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }),
        supabase.from("employee_allowances").select("*").eq("user_id", profile.user_id),
        supabase.from("employee_deductions").select("*").eq("user_id", profile.user_id),
      ]);
      setAttendance(attRes.data || []);
      setLeaveBalance(balRes.data);
      setLeaveRequests(leavesRes.data || []);
      setLoans(loansRes.data || []);
      setAllowances(allowRes.data || []);
      setDeductions(dedRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [profile.user_id]);

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

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Attendance (Last 30 Records)</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
              ) : attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No attendance records</p>
              ) : (
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
                    {attendance.map((a) => {
                      const config = statusConfig[a.status] || statusConfig.pending;
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
                          <TableCell className="text-sm text-muted-foreground">{a.location_name || "—"}</TableCell>
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetailView;
