import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

interface AttendanceAnalyticsProps {
  allAttendance: any[];
  profiles: any[];
  profileMap: Record<string, any>;
}

const COLORS = {
  "on-time": "hsl(152, 60%, 40%)",
  late: "hsl(38, 92%, 50%)",
  absent: "hsl(215, 12%, 50%)",
  pending: "hsl(215, 20%, 70%)",
};

const AttendanceAnalytics = ({ allAttendance, profiles, profileMap }: AttendanceAnalyticsProps) => {
  // Weekly trend data (last 14 days)
  const weeklyTrend = useMemo(() => {
    const days: Record<string, { date: string; onTime: number; late: number; absent: number }> = {};
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days[key] = {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        onTime: 0,
        late: 0,
        absent: 0,
      };
    }

    allAttendance.forEach((a) => {
      if (days[a.date]) {
        if (a.status === "on-time") days[a.date].onTime++;
        else if (a.status === "late") days[a.date].late++;
      }
    });

    // Calculate absent for each day
    Object.keys(days).forEach((date) => {
      const totalPresent = days[date].onTime + days[date].late;
      days[date].absent = Math.max(0, profiles.length - totalPresent);
    });

    return Object.values(days);
  }, [allAttendance, profiles]);

  // Status distribution pie chart
  const statusDistribution = useMemo(() => {
    const counts = { "on-time": 0, late: 0, pending: 0 };
    allAttendance.forEach((a) => {
      if (counts[a.status as keyof typeof counts] !== undefined) {
        counts[a.status as keyof typeof counts]++;
      }
    });
    return [
      { name: "On Time", value: counts["on-time"], color: COLORS["on-time"] },
      { name: "Late", value: counts.late, color: COLORS.late },
      { name: "Pending", value: counts.pending, color: COLORS.pending },
    ].filter((d) => d.value > 0);
  }, [allAttendance]);

  // Department breakdown
  const departmentBreakdown = useMemo(() => {
    const depts: Record<string, { name: string; onTime: number; late: number; total: number }> = {};

    allAttendance.forEach((a) => {
      const p = profileMap[a.user_id];
      const dept = p?.department || "Unassigned";
      if (!depts[dept]) depts[dept] = { name: dept, onTime: 0, late: 0, total: 0 };
      depts[dept].total++;
      if (a.status === "on-time") depts[dept].onTime++;
      else if (a.status === "late") depts[dept].late++;
    });

    return Object.values(depts).sort((a, b) => b.total - a.total);
  }, [allAttendance, profileMap]);

  // Top late arrivals
  const topLateEmployees = useMemo(() => {
    const lateCounts: Record<string, number> = {};
    allAttendance.forEach((a) => {
      if (a.status === "late") {
        lateCounts[a.user_id] = (lateCounts[a.user_id] || 0) + 1;
      }
    });
    return Object.entries(lateCounts)
      .map(([userId, count]) => ({
        name: profileMap[userId]?.name || "Unknown",
        department: profileMap[userId]?.department || "—",
        lateCount: count,
      }))
      .sort((a, b) => b.lateCount - a.lateCount)
      .slice(0, 5);
  }, [allAttendance, profileMap]);

  const totalRecords = allAttendance.length;
  const onTimeRate = totalRecords
    ? Math.round((allAttendance.filter((a) => a.status === "on-time").length / totalRecords) * 100)
    : 0;
  const lateRate = totalRecords
    ? Math.round((allAttendance.filter((a) => a.status === "late").length / totalRecords) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground font-medium">On-Time Rate</p>
          <p className="text-4xl font-bold mt-1 text-on-time">{onTimeRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">across {totalRecords} records</p>
        </div>
        <div className="glass-card rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground font-medium">Late Rate</p>
          <p className="text-4xl font-bold mt-1 text-warning">{lateRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">arrivals after 9:00 AM</p>
        </div>
        <div className="glass-card rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground font-medium">Total Records</p>
          <p className="text-4xl font-bold mt-1 text-foreground">{totalRecords}</p>
          <p className="text-xs text-muted-foreground mt-1">attendance entries</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">14-Day Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="onTime" stackId="1" stroke={COLORS["on-time"]} fill={COLORS["on-time"]} fillOpacity={0.6} name="On Time" />
              <Area type="monotone" dataKey="late" stackId="1" stroke={COLORS.late} fill={COLORS.late} fillOpacity={0.6} name="Late" />
              <Area type="monotone" dataKey="absent" stackId="1" stroke={COLORS.absent} fill={COLORS.absent} fillOpacity={0.3} name="Absent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status Distribution</h3>
          {statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department breakdown */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Department Breakdown</h3>
          {departmentBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={departmentBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="onTime" stackId="a" fill={COLORS["on-time"]} name="On Time" radius={[0, 0, 0, 0]} />
                <Bar dataKey="late" stackId="a" fill={COLORS.late} name="Late" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>

        {/* Top late employees */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Frequent Late Arrivals</h3>
          {topLateEmployees.length > 0 ? (
            <div className="space-y-3">
              {topLateEmployees.map((emp, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center text-xs font-bold text-warning">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.department}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-warning">{emp.lateCount} late</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No late arrivals recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceAnalytics;
