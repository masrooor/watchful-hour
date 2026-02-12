import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatsCards from "@/components/StatsCards";
import EmployeeList from "@/components/EmployeeList";
import ClockInWidget from "@/components/ClockInWidget";
import NotificationsPanel from "@/components/NotificationsPanel";
import LocationMap from "@/components/LocationMap";
import EmployeeLoanDetails from "@/components/EmployeeLoanDetails";
import EmployeeLeaveWidget from "@/components/EmployeeLeaveWidget";
import EmployeeProfileEditor from "@/components/EmployeeProfileEditor";
import EmployeeAnnouncements from "@/components/EmployeeAnnouncements";
import EmployeeSidebar from "@/components/EmployeeSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AttendanceStats } from "@/types/attendance";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Check admin status and redirect if admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const admin = roles?.some(r => r.role === 'admin') ?? false;
      setIsAdmin(admin);

      if (admin) {
        setRedirecting(true);
        navigate('/admin', { replace: true });
        return;
      }

      // Fetch attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: att } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', today);
      setAttendance(att || []);

      // Fetch profiles  
      const { data: profs } = await supabase
        .from('profiles')
        .select('*');
      setProfiles(profs || []);

      setLoading(false);
    };

    fetchData();

    // Realtime subscription for attendance updates
    const channel = supabase
      .channel('all-attendance')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
      }, () => {
        const today = new Date().toISOString().split('T')[0];
        supabase
          .from('attendance_records')
          .select('*')
          .eq('date', today)
          .then(({ data }) => setAttendance(data || []));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const stats: AttendanceStats = useMemo(() => {
    const totalEmployees = Math.max(profiles.length, 1);
    const present = attendance.filter(a => a.clock_in).length;
    const late = attendance.filter(a => a.status === 'late').length;
    const onTime = attendance.filter(a => a.status === 'on-time').length;
    const absent = totalEmployees - present;
    return { totalEmployees, present, late, absent, onTime };
  }, [attendance, profiles]);

  const employees = useMemo(() =>
    profiles.map(p => ({
      id: p.user_id,
      name: p.name || p.email || 'Unknown',
      department: p.department || 'Unassigned',
      avatar: (p.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
      email: p.email || '',
    }))
  , [profiles]);

  const attendanceRecords = useMemo(() =>
    attendance.map(a => ({
      id: a.id,
      employeeId: a.user_id,
      date: a.date,
      clockIn: a.clock_in ? new Date(a.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null,
      clockOut: a.clock_out ? new Date(a.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null,
      status: a.status as 'on-time' | 'late' | 'absent' | 'pending',
      latitude: a.latitude,
      longitude: a.longitude,
      locationName: a.location_name,
    }))
  , [attendance]);

  const userName = profiles.find(p => p.user_id === user?.id)?.name || user?.email || '';

  if (loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <EmployeeProfileEditor />;
      case "attendance":
        return (
          <div className="space-y-6">
            <ClockInWidget />
            <LocationMap employees={employees} attendance={attendanceRecords} />
          </div>
        );
      case "leave":
        return <EmployeeLeaveWidget />;
      case "loans":
        return <EmployeeLoanDetails />;
      case "announcements":
        return <EmployeeAnnouncements />;
      case "dashboard":
      default:
        return (
          <div className="space-y-6">
            <StatsCards stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ClockInWidget />
                <EmployeeAnnouncements />
              </div>
              <div className="space-y-6">
                <EmployeeLeaveWidget />
                <EmployeeLoanDetails />
                <NotificationsPanel employees={employees} attendance={attendanceRecords} />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <EmployeeSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          userName={userName}
        />
        <main className="flex-1 overflow-auto">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {activeSection === "dashboard" ? "Dashboard" :
                   activeSection === "profile" ? "My Profile" :
                   activeSection === "attendance" ? "Attendance" :
                   activeSection === "leave" ? "Leave Management" :
                   activeSection === "loans" ? "Loan Details" :
                   "Announcements"}
                </h1>
              </div>
            </div>
          </header>
          <div className="p-4 sm:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
