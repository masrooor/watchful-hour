import { useMemo, useState, useEffect } from "react";
import { CalendarDays, MapPin, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/StatsCards";
import EmployeeList from "@/components/EmployeeList";
import ClockInWidget from "@/components/ClockInWidget";
import NotificationsPanel from "@/components/NotificationsPanel";
import LocationMap from "@/components/LocationMap";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AttendanceStats } from "@/types/attendance";

const Index = () => {
  const { user, signOut } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Check admin status
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const admin = roles?.some(r => r.role === 'admin') ?? false;
      setIsAdmin(admin);

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
        // Refetch on any change
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

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userName = profiles.find(p => p.user_id === user?.id)?.name || user?.email || '';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">AttendTrack</h1>
              <p className="text-xs text-muted-foreground">
                {userName && `Hi, ${userName} • `}{isAdmin ? 'Admin' : 'Employee'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span>{today}</span>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <EmployeeList employees={employees} attendance={attendanceRecords} />
          </div>
          <div className="space-y-6">
            <ClockInWidget />
            <NotificationsPanel employees={employees} attendance={attendanceRecords} />
            <LocationMap employees={employees} attendance={attendanceRecords} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
