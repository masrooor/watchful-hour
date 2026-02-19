import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardCharts from "./DashboardCharts";
import LiveClockInPanel from "./LiveClockInPanel";
import QuickActionButtons from "./QuickActionButtons";
import {
  Cake,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  FileText,
  TreePalm,
  Wallet,
  CalendarDays,
} from "lucide-react";

interface AdminDashboardOverviewProps {
  profiles: any[];
  attendance: any[];
  allAttendance: any[];
  pendingLeaves: number;
  pendingLoans: number;
  probationPeriodDays: number;
  isAdmin: boolean;
  onNavigate: (section: string) => void;
  onAddEmployee: () => void;
}

const AdminDashboardOverview = ({
  profiles,
  attendance,
  allAttendance,
  pendingLeaves,
  pendingLoans,
  probationPeriodDays,
  isAdmin,
  onNavigate,
  onAddEmployee,
}: AdminDashboardOverviewProps) => {
  const todayStats = useMemo(() => {
    const total = profiles.length;
    const present = attendance.filter((a) => a.clock_in).length;
    const late = attendance.filter((a) => a.status === "late").length;
    const onTime = attendance.filter((a) => a.status === "on-time").length;
    const absent = total - present;
    return { total, present, late, onTime, absent };
  }, [attendance, profiles]);

  // Upcoming birthdays (next 30 days)
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const results: { name: string; date: string; daysUntil: number; department: string }[] = [];

    profiles.forEach((p) => {
      if (!p.date_of_birth) return;
      const dob = new Date(p.date_of_birth);
      const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (thisYearBday < today) {
        thisYearBday.setFullYear(today.getFullYear() + 1);
      }
      const diffMs = thisYearBday.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysUntil <= 30) {
        results.push({
          name: p.name || "Unknown",
          date: thisYearBday.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          daysUntil,
          department: p.department || "—",
        });
      }
    });

    return results.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [profiles]);

  // Probation ending soon (next 30 days, using configurable probation period)
  const probationEnding = useMemo(() => {
    const today = new Date();
    const results: { name: string; endDate: string; daysLeft: number; department: string }[] = [];

    profiles.forEach((p) => {
      if (p.job_status !== "probation" || !p.joining_date) return;
      const joinDate = new Date(p.joining_date);
      const probEnd = new Date(joinDate);
      probEnd.setDate(probEnd.getDate() + probationPeriodDays);

      const diffMs = probEnd.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysLeft <= 30 && daysLeft >= -7) {
        results.push({
          name: p.name || "Unknown",
          endDate: probEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          daysLeft,
          department: p.department || "—",
        });
      }
    });

    return results.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [profiles, probationPeriodDays]);

  const statCards = [
    { label: "Total Employees", value: todayStats.total, icon: Users, colorClass: "text-primary", bgClass: "bg-accent" },
    { label: "Present Today", value: todayStats.present, icon: CheckCircle, colorClass: "text-on-time", bgClass: "bg-on-time/10" },
    { label: "Late Arrivals", value: todayStats.late, icon: AlertTriangle, colorClass: "text-warning", bgClass: "bg-warning/10" },
    { label: "Absent Today", value: todayStats.absent, icon: Clock, colorClass: "text-late", bgClass: "bg-late/10" },
  ];

  const actionItems = [
    {
      label: "Pending Leave Requests",
      count: pendingLeaves,
      icon: TreePalm,
      section: "leaves",
      colorClass: "text-primary",
    },
    {
      label: "Pending Loan Requests",
      count: pendingLoans,
      icon: Wallet,
      section: "loans",
      colorClass: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="glass-card rounded-xl p-5 stat-glow transition-all duration-300 hover:scale-[1.02]"
          >
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionItems.map((item) => (
              <button
                key={item.label}
                onClick={() => onNavigate(item.section)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${item.colorClass}`} />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <Badge variant={item.count > 0 ? "default" : "secondary"}>
                  {item.count}
                </Badge>
              </button>
            ))}
            {pendingLeaves === 0 && pendingLoans === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                ✅ No pending actions
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Birthdays */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cake className="w-4 h-4 text-primary" />
              Upcoming Birthdays
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBirthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming birthdays in the next 30 days
              </p>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {upcomingBirthdays.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{b.date}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.daysUntil === 0
                          ? "🎂 Today!"
                          : b.daysUntil === 1
                          ? "Tomorrow"
                          : `In ${b.daysUntil} days`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Probation Ending */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-warning" />
              Probation Ending Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            {probationEnding.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No probation periods ending soon
              </p>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {probationEnding.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{p.endDate}</p>
                      <Badge
                        variant="outline"
                        className={
                          p.daysLeft <= 0
                            ? "bg-late/10 text-late border-late/20 text-xs"
                            : p.daysLeft <= 7
                            ? "bg-warning/10 text-warning border-warning/20 text-xs"
                            : "bg-on-time/10 text-on-time border-on-time/20 text-xs"
                        }
                      >
                        {p.daysLeft <= 0
                          ? "Overdue"
                          : p.daysLeft === 1
                          ? "1 day left"
                          : `${p.daysLeft} days left`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Live Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActionButtons onNavigate={onNavigate} onAddEmployee={onAddEmployee} isAdmin={isAdmin} />
        <LiveClockInPanel profiles={profiles} attendance={attendance} />
      </div>

      {/* Charts Section */}
      <DashboardCharts profiles={profiles} allAttendance={allAttendance} />
    </div>
  );
};

export default AdminDashboardOverview;
