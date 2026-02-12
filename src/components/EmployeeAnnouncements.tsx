import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

const priorityVariant = (p: string) => {
  if (p === "urgent") return "destructive";
  if (p === "high") return "default";
  return "secondary";
};

const EmployeeAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, content, priority, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      setAnnouncements(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements.</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="border border-border rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium leading-tight">{a.title}</h4>
                <Badge variant={priorityVariant(a.priority)} className="text-[10px] shrink-0">
                  {a.priority}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(a.created_at).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeAnnouncements;
