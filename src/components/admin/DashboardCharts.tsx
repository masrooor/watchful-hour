import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from "recharts";
import { BarChart3, TrendingUp, PieChartIcon } from "lucide-react";

interface DashboardChartsProps {
  profiles: any[];
  allAttendance: any[];
}

const attendanceChartConfig: ChartConfig = {
  onTime: { label: "On Time", color: "hsl(var(--on-time))" },
  late: { label: "Late", color: "hsl(var(--warning))" },
  absent: { label: "Absent", color: "hsl(var(--late))" },
};

const lateChartConfig: ChartConfig = {
  lateCount: { label: "Late Arrivals", color: "hsl(var(--warning))" },
};

const DEPT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--warning))",
  "hsl(var(--on-time))",
  "hsl(var(--late))",
  "hsl(172 50% 55%)",
  "hsl(215 60% 50%)",
  "hsl(280 50% 55%)",
  "hsl(38 70% 60%)",
];

const DashboardCharts = ({ profiles, allAttendance }: DashboardChartsProps) => {
  // Monthly attendance trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months: { month: string; onTime: number; late: number; absent: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      const monthRecords = allAttendance.filter((a) => {
        const ad = new Date(a.date);
        return ad.getFullYear() === year && ad.getMonth() === month;
      });

      months.push({
        month: label,
        onTime: monthRecords.filter((a) => a.status === "on-time").length,
        late: monthRecords.filter((a) => a.status === "late").length,
        absent: monthRecords.filter((a) => a.status === "absent").length,
      });
    }
    return months;
  }, [allAttendance]);

  // Late arrivals trend (last 30 days, grouped by week)
  const lateTrend = useMemo(() => {
    const now = new Date();
    const weeks: { week: string; lateCount: number }[] = [];

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { day: "numeric" })}`;

      const count = allAttendance.filter((a) => {
        const ad = new Date(a.date);
        return a.status === "late" && ad >= weekStart && ad <= weekEnd;
      }).length;

      weeks.push({ week: label, lateCount: count });
    }
    return weeks;
  }, [allAttendance]);

  // Department breakdown
  const deptBreakdown = useMemo(() => {
    const deptMap: Record<string, number> = {};
    profiles.forEach((p) => {
      const dept = p.department || "Unassigned";
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    return Object.entries(deptMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [profiles]);

  const deptChartConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    deptBreakdown.forEach((d, i) => {
      cfg[d.name] = { label: d.name, color: DEPT_COLORS[i % DEPT_COLORS.length] };
    });
    return cfg;
  }, [deptBreakdown]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Monthly Attendance Trend */}
      <Card className="xl:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Monthly Attendance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={attendanceChartConfig} className="h-[280px] w-full">
            <BarChart data={monthlyTrend} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="onTime" stackId="a" fill="var(--color-onTime)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="late" stackId="a" fill="var(--color-late)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="absent" stackId="a" fill="var(--color-absent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Department Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-primary" />
            Department Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={deptChartConfig} className="h-[280px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie
                data={deptBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {deptBreakdown.map((_, i) => (
                  <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Late Arrivals Trend */}
      <Card className="xl:col-span-3 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-warning" />
            Late Arrivals Trend (Last 4 Weeks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={lateChartConfig} className="h-[220px] w-full">
            <LineChart data={lateTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="lateCount"
                stroke="var(--color-lateCount)"
                strokeWidth={2.5}
                dot={{ r: 5, fill: "var(--color-lateCount)" }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCharts;
