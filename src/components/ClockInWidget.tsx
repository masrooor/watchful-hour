import { useState, useEffect } from "react";
import { MapPin, Loader2, CheckCircle, LogOut } from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ClockInWidget = () => {
  const { user } = useAuth();
  const { clockIn, clockOut, loading } = useAttendance();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [fetchingRecord, setFetchingRecord] = useState(true);

  const [todayRecords, setTodayRecords] = useState<any[]>([]);

  const fetchTodayRecords = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('clock_in', { ascending: true });
    setTodayRecords(data || []);
    setTodayRecord(data && data.length > 0 ? data[data.length - 1] : null);
    setFetchingRecord(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchTodayRecords();

    const channel = supabase
      .channel('my-attendance')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchTodayRecords();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Latest record determines current state
  const latestRecord = todayRecords.length > 0 ? todayRecords[todayRecords.length - 1] : null;
  const isClockedIn = latestRecord?.clock_in && !latestRecord?.clock_out;
  const allClockedOut = todayRecords.length > 0 && todayRecords.every(r => r.clock_out);

  const getLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  };

  const handleClockIn = async () => {
    try {
      const position = await getLocation();
      const { latitude, longitude } = position.coords;
      await clockIn(latitude, longitude, "Office");
    } catch {
      // Try without location
      await clockIn(0, 0, "Unknown");
    }
  };

  const handleClockOut = async () => {
    await clockOut();
  };

  if (fetchingRecord) {
    return (
      <div className="glass-card rounded-xl p-6 flex items-center justify-center h-56">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const latestClockIn = latestRecord?.clock_in
    ? new Date(latestRecord.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Quick Clock In</h2>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
           <button
             onClick={isClockedIn ? handleClockOut : handleClockIn}
             disabled={loading || allClockedOut}
             className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 font-semibold text-sm ${
               loading || allClockedOut
                 ? "opacity-70 cursor-not-allowed"
                 : "hover:scale-105 active:scale-95"
             } ${
              isClockedIn
                ? "bg-destructive text-destructive-foreground shadow-[0_0_30px_-5px_hsl(var(--destructive)/0.4)]"
                : "bg-primary text-primary-foreground shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.6)]"
            }`}
          >
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isClockedIn ? (
              <div className="text-center">
                <LogOut className="w-8 h-8 mx-auto mb-1" />
                <span>Clock Out</span>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-2xl font-bold block">IN</span>
                <span className="text-xs opacity-80">Tap to Clock In</span>
              </div>
            )}
          </button>
        </div>

        {latestClockIn && (
          <p className="text-sm text-muted-foreground">
            Latest check-in at <span className="font-semibold text-foreground">{latestClockIn}</span>
          </p>
        )}

        {/* Show all sessions for today */}
        {todayRecords.length > 0 && (
          <div className="w-full space-y-1.5 mt-1">
            <p className="text-xs font-medium text-muted-foreground">Today's Sessions ({todayRecords.length})</p>
            {todayRecords.map((r, i) => {
              const inTime = r.clock_in ? new Date(r.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
              const outTime = r.clock_out ? new Date(r.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
              return (
                <div key={r.id} className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-3 py-1.5">
                  <span className="text-muted-foreground">Session {i + 1}</span>
                  <span className="text-foreground font-medium">{inTime} → {outTime}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClockInWidget;
