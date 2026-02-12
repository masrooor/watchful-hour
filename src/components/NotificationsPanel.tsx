import { Bell, AlertTriangle, Clock } from "lucide-react";
import { Employee, AttendanceRecord } from "@/types/attendance";

interface NotificationsPanelProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
}

const NotificationsPanel = ({ employees, attendance }: NotificationsPanelProps) => {
  const lateRecords = attendance.filter((a) => a.status === "late");
  const absentRecords = attendance.filter((a) => a.status === "absent");

  const getEmployee = (id: string) => employees.find((e) => e.id === id);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        {(lateRecords.length + absentRecords.length) > 0 && (
          <span className="ml-auto bg-late text-late-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {lateRecords.length + absentRecords.length}
          </span>
        )}
      </div>
      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {lateRecords.map((record) => {
          const emp = getEmployee(record.employeeId);
          if (!emp) return null;
          return (
            <div key={record.id} className="p-4 flex items-start gap-3">
              <div className="bg-warning/10 p-2 rounded-lg mt-0.5">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {emp.name} arrived late
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Clocked in at {record.clockIn} • {emp.department}
                </p>
                <p className="text-xs text-muted-foreground">
                  Manager notification sent automatically
                </p>
              </div>
            </div>
          );
        })}
        {absentRecords.map((record) => {
          const emp = getEmployee(record.employeeId);
          if (!emp) return null;
          return (
            <div key={record.id} className="p-4 flex items-start gap-3">
              <div className="bg-late/10 p-2 rounded-lg mt-0.5">
                <Clock className="w-4 h-4 text-late" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {emp.name} is absent
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No check-in recorded • {emp.department}
                </p>
              </div>
            </div>
          );
        })}
        {lateRecords.length === 0 && absentRecords.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No alerts today — everyone is on time! 🎉
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
