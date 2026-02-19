import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, TreePalm, Wallet, FileText, CalendarDays, Megaphone } from "lucide-react";

interface QuickActionButtonsProps {
  onNavigate: (section: string) => void;
  onAddEmployee: () => void;
  isAdmin: boolean;
}

const QuickActionButtons = ({ onNavigate, onAddEmployee, isAdmin }: QuickActionButtonsProps) => {
  const actions = [
    { label: "Add Employee", icon: UserPlus, onClick: onAddEmployee, show: isAdmin },
    { label: "Leave Requests", icon: TreePalm, onClick: () => onNavigate("leaves"), show: true },
    { label: "Loan Requests", icon: Wallet, onClick: () => onNavigate("loans"), show: true },
    { label: "Attendance", icon: CalendarDays, onClick: () => onNavigate("attendance"), show: true },
    { label: "Payroll", icon: FileText, onClick: () => onNavigate("payroll"), show: true },
    { label: "Announcements", icon: Megaphone, onClick: () => onNavigate("announcements"), show: true },
  ].filter((a) => a.show);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          ⚡ Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs font-medium"
              onClick={action.onClick}
            >
              <action.icon className="w-4 h-4 text-primary" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionButtons;
