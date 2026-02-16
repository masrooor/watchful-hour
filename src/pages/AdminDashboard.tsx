import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, CalendarDays, Clock, AlertTriangle, CheckCircle,
  ArrowLeft, Search, Filter, Download, MapPin, LogIn, LogOut,
  Pencil, Trash2, MoreHorizontal, Shield, Plus, Lock, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import AdminSidebar, { type AdminSection } from "@/components/admin/AdminSidebar";
import EditAttendanceDialog from "@/components/admin/EditAttendanceDialog";
import DeleteAttendanceDialog from "@/components/admin/DeleteAttendanceDialog";
import AddEmployeeDialog from "@/components/admin/AddEmployeeDialog";
import AttendanceAnalytics from "@/components/admin/AttendanceAnalytics";
import LeaveManagement from "@/components/admin/LeaveManagement";
import Announcements from "@/components/admin/Announcements";
import EmployeeDocuments from "@/components/admin/EmployeeDocuments";
import AttendanceSettings from "@/components/admin/AttendanceSettings";
import Payroll from "@/components/admin/Payroll";
import MonthlyAttendanceReport from "@/components/admin/MonthlyAttendanceReport";
import EmployeeLoanManager from "@/components/admin/EmployeeLoanManager";
import EditSalaryDialog from "@/components/admin/EditSalaryDialog";
import AddAttendanceDialog from "@/components/admin/AddAttendanceDialog";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import EmployeeAllowancesDeductions from "@/components/admin/EmployeeAllowancesDeductions";
import RoleManagement from "@/components/admin/RoleManagement";
import AdminDashboardOverview from "@/components/admin/AdminDashboardOverview";
import { logAudit } from "@/lib/auditLog";
import NotificationBell from "@/components/NotificationBell";
import ClockInWidget from "@/components/ClockInWidget";

const statusConfig: Record<string, { label: string; className: string }> = {
  "on-time": { label: "On Time", className: "bg-on-time/10 text-on-time border-on-time/20" },
  late: { label: "Late", className: "bg-late/10 text-late border-late/20" },
  absent: { label: "Absent", className: "bg-muted text-muted-foreground border-border" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
};

const sectionTitles: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  attendance: "Attendance Records",
  analytics: "Attendance Analytics",
  settings: "Attendance Settings",
  employees: "Employee List",
  leaves: "Leave Management",
  announcements: "Announcements",
  documents: "Employee Documents",
  payroll: "Salary & Payroll",
  "monthly-report": "Monthly Attendance Report",
  loans: "Loans & Deductions",
  "allowances-deductions": "Allowances & Deductions",
  "audit-logs": "Audit Logs",
  "role-management": "Role Management",
  "change-password": "Change Password",
};

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isHR, setIsHR] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isPayrollOfficer, setIsPayrollOfficer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editRecord, setEditRecord] = useState<any>(null);
  const [deleteRecord, setDeleteRecord] = useState<any>(null);
  const [dateRange, setDateRange] = useState("today");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [editSalaryProfile, setEditSalaryProfile] = useState<any>(null);
  const [showAddAttendance, setShowAddAttendance] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingLoans, setPendingLoans] = useState(0);
  const [probationPeriodDays, setProbationPeriodDays] = useState(90);

  const handlePasswordChange = async () => {
    if (pwForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    if (error) {
      toast.error(error.message || "Failed to update password");
    } else {
      toast.success("Password updated successfully");
      setPwForm({ newPassword: "", confirmPassword: "" });
      setPwOpen(false);
    }
    setPwSaving(false);
  };

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const admin = roles?.some((r) => r.role === "admin") ?? false;
      const hr = roles?.some((r) => r.role === "hr") ?? false;
      const manager = roles?.some((r) => r.role === "manager") ?? false;
      const payrollOfficer = roles?.some((r) => r.role === "payroll_officer") ?? false;
      setIsAdmin(admin);
      setIsHR(hr);
      setIsManager(manager);
      setIsPayrollOfficer(payrollOfficer);

      if (!admin && !hr && !manager && !payrollOfficer) return;

      // Set default section based on role
      if (!admin && !hr && !manager && payrollOfficer) {
        setActiveSection("payroll");
      }

      const { data: profs } = await supabase.from("profiles").select("*");
      setProfiles(profs || []);

      const { data: allRoles } = await supabase.from("user_roles").select("*");
      const rolesMap: Record<string, string> = {};
      allRoles?.forEach((r) => { rolesMap[r.user_id] = r.role; });
      setUserRoles(rolesMap);

      const today = new Date().toISOString().split("T")[0];
      const { data: att } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("date", today);
      setAttendance(att || []);

      const { data: allAtt } = await supabase
        .from("attendance_records")
        .select("*")
        .order("date", { ascending: false })
        .limit(500);
      setAllAttendance(allAtt || []);

      // Fetch pending counts
      const { count: leaveCount } = await supabase
        .from("leave_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingLeaves(leaveCount || 0);

      const { count: loanCount } = await supabase
        .from("employee_loans")
        .select("*", { count: "exact", head: true })
        .eq("approval_status", "pending");
      setPendingLoans(loanCount || 0);

      // Fetch probation period setting
      const { data: settingsData } = await supabase
        .from("attendance_settings")
        .select("probation_period_days")
        .limit(1)
        .single();
      if (settingsData?.probation_period_days) {
        setProbationPeriodDays(settingsData.probation_period_days);
      }

      setLoading(false);
    };

    init();

    const channel = supabase
      .channel("admin-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, () => {
        const today = new Date().toISOString().split("T")[0];
        supabase
          .from("attendance_records")
          .select("*")
          .eq("date", today)
          .then(({ data }) => setAttendance(data || []));
        supabase
          .from("attendance_records")
          .select("*")
          .order("date", { ascending: false })
          .limit(500)
          .then(({ data }) => setAllAttendance(data || []));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const departments = useMemo(
    () => [...new Set(profiles.map((p) => p.department).filter(Boolean))],
    [profiles]
  );

  const profileMap = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.user_id, p])),
    [profiles]
  );

  const todayStats = useMemo(() => {
    const total = profiles.length;
    const present = attendance.filter((a) => a.clock_in).length;
    const late = attendance.filter((a) => a.status === "late").length;
    const onTime = attendance.filter((a) => a.status === "on-time").length;
    const absent = total - present;
    return { total, present, late, onTime, absent };
  }, [attendance, profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchSearch =
        !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === "all" || p.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [profiles, search, deptFilter]);

  const filteredAttendance = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    let records = allAttendance;

    if (dateRange === "today") {
      records = records.filter((a) => a.date === today);
    } else if (dateRange === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      records = records.filter((a) => new Date(a.date) >= weekAgo);
    } else if (dateRange === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      records = records.filter((a) => new Date(a.date) >= monthAgo);
    }

    return records.filter((a) => {
      const profile = profileMap[a.user_id];
      const matchSearch =
        !search ||
        profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
        profile?.email?.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === "all" || profile?.department === deptFilter;
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [allAttendance, search, deptFilter, statusFilter, dateRange, profileMap]);

  const exportCSV = () => {
    const headers = ["Name", "Email", "Department", "Date", "Clock In", "Clock Out", "Status"];
    const rows = filteredAttendance.map((a) => {
      const p = profileMap[a.user_id];
      return [
        p?.name || "",
        p?.email || "",
        p?.department || "",
        a.date,
        a.clock_in ? new Date(a.clock_in).toLocaleTimeString() : "",
        a.clock_out ? new Date(a.clock_out).toLocaleTimeString() : "",
        a.status,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isAdmin === false && !isHR && !isManager && !isPayrollOfficer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You need appropriate privileges to view this page.</p>
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Employees", value: todayStats.total, icon: Users, colorClass: "text-primary", bgClass: "bg-accent" },
    { label: "Present", value: todayStats.present, icon: CheckCircle, colorClass: "text-on-time", bgClass: "bg-on-time/10" },
    { label: "Late Arrivals", value: todayStats.late, icon: AlertTriangle, colorClass: "text-warning", bgClass: "bg-warning/10" },
    { label: "Absent", value: todayStats.absent, icon: Clock, colorClass: "text-late", bgClass: "bg-late/10" },
  ];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const showFilters = activeSection === "attendance" || activeSection === "employees";

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-6">
            {(isHR || isManager) && <ClockInWidget />}
            <AdminDashboardOverview
              profiles={profiles}
              attendance={attendance}
              pendingLeaves={pendingLeaves}
              pendingLoans={pendingLoans}
              probationPeriodDays={probationPeriodDays}
              onNavigate={(section) => setActiveSection(section as AdminSection)}
            />
          </div>
        );
      case "attendance":
        return (
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendance.map((a) => {
                    const p = profileMap[a.user_id];
                    const config = statusConfig[a.status] || statusConfig.pending;
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {(p?.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-foreground">{p?.name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{p?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p?.department || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.date}</TableCell>
                        <TableCell>
                          {a.clock_in ? (
                            <span className="flex items-center gap-1 text-sm">
                              <LogIn className="w-3.5 h-3.5 text-muted-foreground" />
                              {new Date(a.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a.clock_out ? (
                            <span className="flex items-center gap-1 text-sm">
                              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
                              {new Date(a.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a.location_name ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5" />
                              {a.location_name}
                            </span>
                          ) : a.latitude ? (
                            <span className="text-xs text-muted-foreground">
                              {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={config.className}>{config.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditRecord(a)}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteRecord(a)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        );

      case "analytics":
        return (
          <AttendanceAnalytics
            allAttendance={allAttendance}
            profiles={profiles}
            profileMap={profileMap}
          />
        );

      case "employees":
        return (
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                <TableHead>ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Job Status</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Today's Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfiles.map((p) => {
                    const todayRecord = attendance.find((a) => a.user_id === p.user_id);
                    const status = todayRecord?.status || "absent";
                    const config = statusConfig[status];
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">{p.employee_id || "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {(p.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <span className="font-medium text-sm text-foreground">{p.name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.email || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.department || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{p.employment_type || "full-time"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={p.job_status === "permanent" ? "bg-on-time/10 text-on-time border-on-time/20 text-xs" : "bg-warning/10 text-warning border-warning/20 text-xs"}>
                            {p.job_status === "permanent" ? "Permanent" : "Probation"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.shift_start && p.shift_end
                            ? `${p.shift_start.slice(0, 5)} - ${p.shift_end.slice(0, 5)}`
                            : "Default"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-xs font-medium" onClick={() => setEditSalaryProfile(p)}>
                            {p.salary ? `Rs ${Number(p.salary).toLocaleString()}` : "Set"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={userRoles[p.user_id] || "user"}
                            onValueChange={async (newRole: "admin" | "user" | "hr") => {
                              const prevRole = userRoles[p.user_id] || "user";
                              setUserRoles((prev) => ({ ...prev, [p.user_id]: newRole }));
                              const { error } = await supabase
                                .from("user_roles")
                                .update({ role: newRole })
                                .eq("user_id", p.user_id);
                              if (error) {
                                setUserRoles((prev) => ({ ...prev, [p.user_id]: prevRole }));
                                toast.error("Failed to update role");
                              } else {
                                toast.success(`${p.name} role updated to ${newRole}`);
                                logAudit("update", "role", p.user_id, {
                                  employee: p.name,
                                  old_role: prevRole,
                                  new_role: newRole,
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="hr">HR</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={config.className}>{config.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        );

      case "leaves":
        return <LeaveManagement profiles={profiles} profileMap={profileMap} isAdminOrHR={isAdmin || isHR} />;

      case "announcements":
        return <Announcements profileMap={profileMap} isAdminOrHR={isAdmin || isHR} />;

      case "documents":
        return <EmployeeDocuments profiles={profiles} isAdminOrHR={isAdmin || isHR} />;

      case "settings":
        return <AttendanceSettings />;

      case "payroll":
        return <Payroll profiles={profiles} profileMap={profileMap} />;

      case "monthly-report":
        return <MonthlyAttendanceReport profiles={profiles} profileMap={profileMap} />;

      case "loans":
        return <EmployeeLoanManager profiles={profiles} profileMap={profileMap} />;

      case "allowances-deductions":
        return <EmployeeAllowancesDeductions profiles={profiles} />;

      case "audit-logs":
        return <AuditLogViewer profileMap={profileMap} />;

      case "role-management":
        return <RoleManagement profiles={profiles} />;

      case "change-password":
        return (
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-new-pw">New Password</Label>
              <Input
                id="admin-new-pw"
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-confirm-pw">Confirm Password</Label>
              <Input
                id="admin-confirm-pw"
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Re-enter password"
              />
            </div>
            <Button onClick={handlePasswordChange} disabled={pwSaving}>
              {pwSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Update Password
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          userRole={isAdmin ? 'admin' : isHR ? 'hr' : isManager ? 'manager' : isPayrollOfficer ? 'payroll_officer' : 'user'}
        />
        <SidebarInset>
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">{sectionTitles[activeSection]}</h1>
                  <p className="text-xs text-muted-foreground">{today}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeSection === "attendance" && (
                  <Button size="sm" variant="outline" onClick={() => setShowAddAttendance(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Attendance
                  </Button>
                )}
                {activeSection === "employees" && (
                  <Button size="sm" onClick={() => setShowAddEmployee(true)}>
                    <Users className="w-4 h-4 mr-1" />
                    Add Employee
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
                <NotificationBell />
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Stats - show on attendance section */}
            {activeSection === "attendance" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                  <div key={card.label} className="glass-card rounded-xl p-5 stat-glow transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                        <p className="text-3xl font-bold mt-1 text-foreground">{card.value}</p>
                      </div>
                      <div className={`${card.bgClass} p-3 rounded-xl`}>
                        <card.icon className={`w-6 h-6 ${card.colorClass}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Filters - show on attendance and employees */}
            {showFilters && (
              <div className="glass-card rounded-xl p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="w-4 h-4 mr-1" />
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeSection === "attendance" && (
                  <>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="on-time">On Time</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="w-[130px]">
                        <CalendarDays className="w-4 h-4 mr-1" />
                        <SelectValue placeholder="Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            )}

            {renderContent()}
          </main>
        </SidebarInset>
      </div>

      {editRecord && (
        <EditAttendanceDialog
          record={editRecord}
          profileName={profileMap[editRecord.user_id]?.name || "Unknown"}
          open={!!editRecord}
          onOpenChange={(open) => !open && setEditRecord(null)}
        />
      )}

      {deleteRecord && (
        <DeleteAttendanceDialog
          record={deleteRecord}
          profileName={profileMap[deleteRecord.user_id]?.name || "Unknown"}
          open={!!deleteRecord}
          onOpenChange={(open) => !open && setDeleteRecord(null)}
        />
      )}

      <AddEmployeeDialog
        open={showAddEmployee}
        onOpenChange={setShowAddEmployee}
        onSuccess={async () => {
          const { data: profs } = await supabase.from("profiles").select("*");
          setProfiles(profs || []);
        }}
      />

      {editSalaryProfile && (
        <EditSalaryDialog
          open={!!editSalaryProfile}
          onOpenChange={(open) => !open && setEditSalaryProfile(null)}
          profile={editSalaryProfile}
          onSuccess={async () => {
            const { data: profs } = await supabase.from("profiles").select("*");
            setProfiles(profs || []);
          }}
        />
      )}

      <AddAttendanceDialog
        open={showAddAttendance}
        onOpenChange={setShowAddAttendance}
        profiles={profiles}
        onSuccess={async () => {
          const today = new Date().toISOString().split("T")[0];
          const { data: att } = await supabase.from("attendance_records").select("*").eq("date", today);
          setAttendance(att || []);
          const { data: allAtt } = await supabase.from("attendance_records").select("*").order("date", { ascending: false }).limit(500);
          setAllAttendance(allAtt || []);
        }}
      />

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-new-pw">New Password</Label>
              <Input
                id="admin-new-pw"
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-confirm-pw">Confirm Password</Label>
              <Input
                id="admin-confirm-pw"
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Re-enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button onClick={handlePasswordChange} disabled={pwSaving}>
              {pwSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminDashboard;
