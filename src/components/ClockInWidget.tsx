import { useState } from "react";
import { MapPin, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ClockInWidget = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [clockInTime, setClockInTime] = useState<string | null>(null);

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

  const handleClockAction = async () => {
    setIsLoading(true);
    try {
      const position = await getLocation();
      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lng: longitude });

      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const cutoff = new Date();
      cutoff.setHours(9, 0, 0, 0);

      if (!isClockedIn) {
        setClockInTime(timeStr);
        setIsClockedIn(true);

        if (now > cutoff) {
          toast.error("Late Check-in!", {
            description: `You clocked in at ${timeStr}. The deadline was 9:00 AM. A notification has been sent to your manager.`,
            duration: 6000,
          });
        } else {
          toast.success("Clocked In!", {
            description: `Checked in at ${timeStr} from coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          });
        }
      } else {
        setIsClockedIn(false);
        setClockInTime(null);
        toast.success("Clocked Out!", {
          description: `Checked out at ${timeStr}. Have a great evening!`,
        });
      }
    } catch {
      toast.error("Location Required", {
        description: "Please enable location services to clock in.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Quick Clock In</h2>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <button
            onClick={handleClockAction}
            disabled={isLoading}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 font-semibold text-sm ${
              isClockedIn
                ? "bg-on-time text-on-time-foreground shadow-[0_0_30px_-5px_hsl(var(--on-time)/0.4)]"
                : "bg-primary text-primary-foreground shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.6)]"
            } hover:scale-105 active:scale-95`}
          >
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isClockedIn ? (
              <div className="text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-1" />
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

        {clockInTime && (
          <p className="text-sm text-muted-foreground">
            Clocked in at <span className="font-semibold text-foreground">{clockInTime}</span>
          </p>
        )}

        {location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClockInWidget;
