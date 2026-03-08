import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useAttendance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const clockIn = useCallback(async (latitude: number, longitude: number, locationName: string) => {
    if (!user) return null;
    setLoading(true);
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const cutoff = new Date();
      cutoff.setHours(10, 30, 0, 0);
      const status = now > cutoff ? 'late' : 'on-time';
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          user_id: user.id,
          date: now.toISOString().split('T')[0],
          clock_in: now.toISOString(),
          status,
          latitude,
          longitude,
          location_name: locationName,
        })
        .select()
        .single();

      if (error) throw error;

      // Get user profile for notifications
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, department')
        .eq('user_id', user.id)
        .single();

      // Weekend clock-in notification
      if (isWeekend) {
        const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
        try {
          await supabase.functions.invoke('notify-weekend-clockin', {
            body: {
              employeeName: profile?.name || user.email,
              clockInTime: timeStr,
              department: profile?.department || 'Unknown',
              dayName,
              userId: user.id,
            },
          });
        } catch (notifError) {
          console.error('Failed to send weekend notification:', notifError);
        }

        toast.warning("Weekend Clock-in!", {
          description: `You clocked in on ${dayName} at ${timeStr}. Admin and managers have been notified.`,
          duration: 6000,
        });
      }

      if (status === 'late') {
        // Send late notification
        try {
          await supabase.functions.invoke('notify-late-arrival', {
            body: {
              employeeName: profile?.name || user.email,
              clockInTime: timeStr,
              department: profile?.department || 'Unknown',
              userId: user.id,
            },
          });
        } catch (notifError) {
          console.error('Failed to send late notification:', notifError);
        }

        if (!isWeekend) {
          toast.error("Late Check-in!", {
            description: `You clocked in at ${timeStr}. The deadline was 9:00 AM. Your manager has been notified.`,
            duration: 6000,
          });
        }
      } else if (!isWeekend) {
        toast.success("Clocked In!", {
          description: `Checked in at ${timeStr}. You're on time!`,
        });
      }

      return data;
    } catch (error: any) {
      toast.error("Clock-in failed", { description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clockOut = useCallback(async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      // Find the latest open record first
      const { data: latestOpen, error: findError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) throw findError;
      if (!latestOpen) throw new Error("No open clock-in record found for today");

      // Update only that specific record
      const { data, error } = await supabase
        .from('attendance_records')
        .update({ clock_out: now.toISOString() })
        .eq('id', latestOpen.id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Clocked Out!", {
        description: `Checked out at ${timeStr}. Have a great evening!`,
      });

      return data;
    } catch (error: any) {
      toast.error("Clock-out failed", { description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { clockIn, clockOut, loading };
};
