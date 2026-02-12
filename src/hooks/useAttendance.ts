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
      const cutoff = new Date();
      cutoff.setHours(9, 0, 0, 0);
      const status = now > cutoff ? 'late' : 'on-time';
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      const { data, error } = await supabase
        .from('attendance_records')
        .upsert({
          user_id: user.id,
          date: now.toISOString().split('T')[0],
          clock_in: now.toISOString(),
          status,
          latitude,
          longitude,
          location_name: locationName,
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;

      if (status === 'late') {
        // Get user profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, department')
          .eq('user_id', user.id)
          .single();

        // Send late notification
        try {
          await supabase.functions.invoke('notify-late-arrival', {
            body: {
              employeeName: profile?.name || user.email,
              clockInTime: timeStr,
              department: profile?.department || 'Unknown',
            },
          });
        } catch (notifError) {
          console.error('Failed to send late notification:', notifError);
        }

        toast.error("Late Check-in!", {
          description: `You clocked in at ${timeStr}. The deadline was 9:00 AM. Your manager has been notified.`,
          duration: 6000,
        });
      } else {
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

      const { data, error } = await supabase
        .from('attendance_records')
        .update({ clock_out: now.toISOString() })
        .eq('user_id', user.id)
        .eq('date', today)
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
