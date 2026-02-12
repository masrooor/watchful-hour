import { MapPin, Clock, LogIn, LogOut } from "lucide-react";
import { Employee, AttendanceRecord } from "@/types/attendance";
import { Badge } from "@/components/ui/badge";

interface EmployeeListProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
}

const statusConfig = {
  "on-time": { label: "On Time", className: "bg-on-time/10 text-on-time border-on-time/20" },
  late: { label: "Late", className: "bg-late/10 text-late border-late/20" },
  absent: { label: "Absent", className: "bg-muted text-muted-foreground border-border" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
};

const EmployeeList = ({ employees, attendance }: EmployeeListProps) => {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Today's Attendance</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time employee status</p>
      </div>
      <div className="divide-y divide-border">
        {employees.map((employee) => {
          const record = attendance.find((a) => a.employeeId === employee.id);
          const status = record?.status || "absent";
          const config = statusConfig[status];

          return (
            <div
              key={employee.id}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {employee.avatar}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{employee.name}</p>
                  <p className="text-xs text-muted-foreground">{employee.department}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {record?.clockIn && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{record.clockIn}</span>
                  </div>
                )}
                {record?.clockOut && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{record.clockOut}</span>
                  </div>
                )}
                {record?.locationName && (
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{record.locationName}</span>
                  </div>
                )}
                <Badge variant="outline" className={config.className}>
                  {config.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeeList;
