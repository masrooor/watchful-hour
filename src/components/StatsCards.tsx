import { Users, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { AttendanceStats } from "@/types/attendance";

interface StatsCardsProps {
  stats: AttendanceStats;
}

const StatsCards = ({ stats }: StatsCardsProps) => {
  const cards = [
    {
      label: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      colorClass: "text-primary",
      bgClass: "bg-accent",
    },
    {
      label: "On Time",
      value: stats.onTime,
      icon: CheckCircle,
      colorClass: "text-on-time",
      bgClass: "bg-on-time/10",
    },
    {
      label: "Late Arrivals",
      value: stats.late,
      icon: AlertTriangle,
      colorClass: "text-warning",
      bgClass: "bg-warning/10",
    },
    {
      label: "Absent",
      value: stats.absent,
      icon: Clock,
      colorClass: "text-late",
      bgClass: "bg-late/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
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
  );
};

export default StatsCards;
