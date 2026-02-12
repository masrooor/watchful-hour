import { MapPin } from "lucide-react";
import { Employee, AttendanceRecord } from "@/types/attendance";

interface LocationMapProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
}

const LocationMap = ({ employees, attendance }: LocationMapProps) => {
  const checkedIn = attendance.filter((a) => a.latitude && a.longitude);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Check-in Locations</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Where employees clocked in today</p>
      </div>
      <div className="relative bg-muted/50 h-48 flex items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.15) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-2">
          <MapPin className="w-8 h-8 text-primary" />
          <p className="text-sm font-medium text-foreground">{checkedIn.length} check-ins recorded</p>
          <div className="flex flex-wrap gap-1.5 justify-center mt-1">
            {[...new Set(checkedIn.map(a => a.locationName).filter(Boolean))].map(loc => (
              <span key={loc} className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                {loc}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;
