import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, LogIn, LogOut, Users } from "lucide-react";

interface LiveClockInPanelProps {
  profiles: any[];
  attendance: any[];
}

const LiveClockInPanel = ({ profiles, attendance }: LiveClockInPanelProps) => {
  const profileMap = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.user_id, p])),
    [profiles]
  );

  const { clockedIn, clockedOut, notYet } = useMemo(() => {
    const attendanceMap = new Map(attendance.map((a) => [a.user_id, a]));
    const clockedIn: { profile: any; record: any }[] = [];
    const clockedOut: { profile: any; record: any }[] = [];
    const notYet: any[] = [];

    profiles.forEach((p) => {
      const record = attendanceMap.get(p.user_id);
      if (record?.clock_in && !record?.clock_out) {
        clockedIn.push({ profile: p, record });
      } else if (record?.clock_out) {
        clockedOut.push({ profile: p, record });
      } else {
        notYet.push(p);
      }
    });

    return { clockedIn, clockedOut, notYet };
  }, [profiles, attendance]);

  const getInitials = (name: string) =>
    (name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Live Clock-In Status
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-on-time/10 text-on-time border-on-time/20 text-xs">
              {clockedIn.length} In
            </Badge>
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
              {clockedOut.length} Out
            </Badge>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
              {notYet.length} Pending
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px]">
          <div className="space-y-2">
            {clockedIn.map(({ profile, record }) => (
              <div
                key={profile.user_id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-on-time/20 bg-on-time/5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-on-time/20 flex items-center justify-center text-xs font-semibold text-on-time">
                    {getInitials(profile.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.department || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-on-time">
                  <LogIn className="w-3.5 h-3.5" />
                  {new Date(record.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}

            {clockedOut.map(({ profile, record }) => (
              <div
                key={profile.user_id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {getInitials(profile.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.department || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LogOut className="w-3.5 h-3.5" />
                  {new Date(record.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}

            {notYet.map((profile) => (
              <div
                key={profile.user_id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-warning/20 bg-warning/5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-xs font-semibold text-warning">
                    {getInitials(profile.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.department || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-warning">
                  <Clock className="w-3.5 h-3.5" />
                  Not clocked in
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveClockInPanel;
