import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  CalendarDays,
  Clock,
  Wallet,
  Megaphone,
  LogOut,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface EmployeeSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userName: string;
}

const menuItems = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  { id: "profile", title: "My Profile", icon: User },
  { id: "attendance", title: "Attendance", icon: Clock },
  { id: "leave", title: "Leave", icon: CalendarDays },
  { id: "loans", title: "Loans", icon: Wallet },
  { id: "announcements", title: "Announcements", icon: Megaphone },
];

const EmployeeSidebar = ({ activeSection, onSectionChange, userName }: EmployeeSidebarProps) => {
  const { signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-sm text-sidebar-foreground block">AttendTrack</span>
            <span className="text-xs text-sidebar-foreground/60 truncate block">{userName}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => onSectionChange(item.id)}
                    tooltip={item.title}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={signOut}
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default EmployeeSidebar;
