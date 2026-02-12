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

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    
    const fetchToday = async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      setTodayRecord(data);
      setFetchingRecord(false);
    };
    
    fetchToday();

    const channel = supabase
      .channel('my-attendance')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new) setTodayRecord(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isClockedIn = todayRecord?.clock_in && !todayRecord?.clock_out;
  const isClockedOut = todayRecord?.clock_out;

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

  const clockInTime = todayRecord?.clock_in
    ? new Date(todayRecord.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Quick Clock In</h2>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {isClockedOut ? (
            <div className="w-32 h-32 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-1" />
                <span className="text-xs">Done for today</span>
              </div>
            </div>
          ) : (
            <button
              onClick={isClockedIn ? handleClockOut : handleClockIn}
              disabled={loading}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 font-semibold text-sm ${
                isClockedIn
                  ? "bg-on-time text-on-time-foreground shadow-[0_0_30px_-5px_hsl(var(--on-time)/0.4)]"
                  : "bg-primary text-primary-foreground shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.6)]"
              } hover:scale-105 active:scale-95`}
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
          )}
        </div>

        {clockInTime && (
          <p className="text-sm text-muted-foreground">
            Clocked in at <span className="font-semibold text-foreground">{clockInTime}</span>
          </p>
        )}

        {todayRecord?.latitude && todayRecord.latitude !== 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>
              {todayRecord.latitude.toFixed(4)}, {todayRecord.longitude.toFixed(4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClockInWidget;
