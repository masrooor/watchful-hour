import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AttendanceCalendarProps {
  month: number;
  year: number;
  attendance: any[];
  holidays: Set<string>;
  workDays: number[];
  leaveRequests?: any[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AttendanceCalendar = ({ month, year, attendance, holidays, workDays, leaveRequests = [] }: AttendanceCalendarProps) => {
  const calendarData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Build attendance map: date -> status
    const attMap = new Map<string, { status: string; clockIn?: string; clockOut?: string }>();
    attendance.forEach((a) => {
      const existing = attMap.get(a.date);
      // Keep worst status or latest record
      if (!existing || (a.status === "late" && existing.status !== "late")) {
        attMap.set(a.date, {
          status: a.status,
          clockIn: a.clock_in,
          clockOut: a.clock_out,
        });
      }
    });

    // Build approved leaves map
    const leaveMap = new Set<string>();
    leaveRequests
      .filter((l) => l.status === "approved")
      .forEach((l) => {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          leaveMap.add(d.toISOString().split("T")[0]);
        }
      });

    const days: Array<{
      day: number;
      dateStr: string;
      type: "on-time" | "late" | "absent" | "holiday" | "off-day" | "leave" | "future" | "pending";
      tooltip: string;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isWorkDay = workDays.includes(date.getDay());
      const isHoliday = holidays.has(dateStr);
      const isFuture = date > today;
      const att = attMap.get(dateStr);
      const isLeave = leaveMap.has(dateStr);

      let type: typeof days[0]["type"];
      let tooltip: string;

      if (isFuture) {
        type = "future";
        tooltip = "Upcoming";
      } else if (isHoliday) {
        type = "holiday";
        tooltip = "Holiday";
      } else if (!isWorkDay) {
        type = "off-day";
        tooltip = "Off Day";
      } else if (isLeave) {
        type = "leave";
        tooltip = "On Leave";
      } else if (att) {
        type = att.status === "late" ? "late" : att.status === "on-time" ? "on-time" : "pending";
        const inTime = att.clockIn ? new Date(att.clockIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";
        const outTime = att.clockOut ? new Date(att.clockOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";
        tooltip = `${type === "late" ? "Late" : "On Time"}${inTime ? ` · ${inTime}` : ""}${outTime ? ` – ${outTime}` : ""}`;
      } else {
        type = "absent";
        tooltip = "Absent";
      }

      days.push({ day: d, dateStr, type, tooltip });
    }

    return { days, firstDayOfWeek };
  }, [month, year, attendance, holidays, workDays, leaveRequests]);

  const typeStyles: Record<string, string> = {
    "on-time": "bg-on-time/20 text-on-time border-on-time/30 hover:bg-on-time/30",
    late: "bg-late/20 text-late border-late/30 hover:bg-late/30",
    absent: "bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/25",
    holiday: "bg-primary/15 text-primary border-primary/25",
    "off-day": "bg-muted text-muted-foreground border-border",
    leave: "bg-accent text-accent-foreground border-accent hover:bg-accent/80",
    future: "bg-background text-muted-foreground/40 border-border/50",
    pending: "bg-warning/15 text-warning border-warning/25 hover:bg-warning/25",
  };

  // Count stats
  const stats = useMemo(() => {
    const counts = { "on-time": 0, late: 0, absent: 0, leave: 0, holiday: 0 };
    calendarData.days.forEach((d) => {
      if (d.type in counts) counts[d.type as keyof typeof counts]++;
    });
    return counts;
  }, [calendarData]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Attendance Calendar
          </span>
          <div className="flex items-center gap-3 text-xs font-normal">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-on-time inline-block" /> Present ({stats["on-time"]})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-late inline-block" /> Late ({stats.late})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block" /> Absent ({stats.absent})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" /> Leave ({stats.leave})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Holiday ({stats.holiday})</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DAY_LABELS.map((label) => (
              <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty cells for offset */}
            {Array.from({ length: calendarData.firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {calendarData.days.map((day) => (
              <Tooltip key={day.day}>
                <TooltipTrigger asChild>
                  <div
                    className={`aspect-square flex items-center justify-center rounded-md border text-xs font-medium cursor-default transition-colors ${typeStyles[day.type]}`}
                  >
                    {day.day}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>{day.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default AttendanceCalendar;
