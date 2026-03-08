import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  BarChart3,
  Settings,
  Users,
  TreePalm,
  Wallet,
  Megaphone,
  FileText,
  ChevronDown,
  DollarSign,
  ClipboardList,
  MinusCircle,
  LayoutDashboard,
  ShieldCheck,
  UserCog,
  Lock,
  ClipboardCheck,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type AdminSection =
  | "dashboard"
  | "attendance"
  | "analytics"
  | "settings"
  | "employees"
  | "leaves"
  | "leave-settings"
  | "announcements"
  | "documents"
  | "payroll"
  | "monthly-report"
  | "loans"
  | "allowances-deductions"
  | "audit-logs"
  | "role-management"
  | "change-password"
  | "employee-detail"
  | "onboarding";

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  userRole?: string;
}

const menuGroups = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Attendance",
    icon: CalendarDays,
    items: [
      { id: "attendance" as const, label: "Records", icon: CalendarDays },
      { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
      { id: "settings" as const, label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Leaves",
    icon: TreePalm,
    items: [
      { id: "leaves" as const, label: "Leave Management", icon: TreePalm },
    ],
  },
  {
    label: "Employees",
    icon: Users,
    items: [
      { id: "employees" as const, label: "Employee List", icon: Users },
      { id: "documents" as const, label: "Documents", icon: FileText },
    ],
  },
  {
    label: "Payroll",
    icon: DollarSign,
    items: [
      { id: "payroll" as const, label: "Salary & Payroll", icon: DollarSign },
      { id: "allowances-deductions" as const, label: "Allowances & Deductions", icon: Wallet },
      { id: "loans" as const, label: "Loans & Deductions", icon: MinusCircle },
      { id: "monthly-report" as const, label: "Monthly Report", icon: ClipboardList },
    ],
  },
  {
    label: "Communication",
    icon: Megaphone,
    items: [
      { id: "announcements" as const, label: "Announcements", icon: Megaphone },
    ],
  },
  {
    label: "Security",
    icon: ShieldCheck,
    items: [
      { id: "role-management" as const, label: "Role Management", icon: UserCog },
      { id: "audit-logs" as const, label: "Audit Logs", icon: ShieldCheck },
      { id: "change-password" as const, label: "Change Password", icon: Lock },
    ],
  },
];

const MANAGER_SECTIONS: AdminSection[] = ["dashboard", "attendance", "analytics", "employees", "leaves", "loans"];
const PAYROLL_SECTIONS: AdminSection[] = ["dashboard", "payroll", "allowances-deductions", "loans", "monthly-report"];

const AdminSidebar = ({ activeSection, onSectionChange, userRole }: AdminSidebarProps) => {
  const navigate = useNavigate();

  // Filter menu groups based on role
  const allowedSections = userRole === 'manager'
    ? MANAGER_SECTIONS
    : userRole === 'payroll_officer'
    ? PAYROLL_SECTIONS
    : null; // admin/hr see everything

  const filteredGroups = allowedSections
    ? menuGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => allowedSections.includes(item.id)),
        }))
        .filter((group) => group.items.length > 0)
    : menuGroups;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Settings className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-sidebar-foreground">HR Portal</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => navigate("/")}
        >
          <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
          Employee Dashboard
        </Button>
      </SidebarHeader>
      <SidebarContent>
        {filteredGroups.map((group) => {
          const groupActive = group.items.some((i) => i.id === activeSection);
          return (
            <Collapsible key={group.label} defaultOpen={groupActive}>
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover:text-sidebar-foreground transition-colors">
                    <group.icon className="w-4 h-4 mr-2" />
                    {group.label}
                    <ChevronDown className="ml-auto w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={activeSection === item.id}
                          onClick={() => onSectionChange(item.id)}
                          className={cn(
                            activeSection === item.id &&
                              "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          )}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
