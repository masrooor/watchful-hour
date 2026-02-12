import {
  CalendarDays,
  BarChart3,
  Settings,
  Users,
  TreePalm,
  Megaphone,
  FileText,
  ChevronDown,
} from "lucide-react";
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
  | "attendance"
  | "analytics"
  | "settings"
  | "employees"
  | "leaves"
  | "announcements"
  | "documents";

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}

const menuGroups = [
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
    label: "Communication",
    icon: Megaphone,
    items: [
      { id: "announcements" as const, label: "Announcements", icon: Megaphone },
    ],
  },
];

const AdminSidebar = ({ activeSection, onSectionChange }: AdminSidebarProps) => {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Settings className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-sidebar-foreground">HR Portal</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuGroups.map((group) => {
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
