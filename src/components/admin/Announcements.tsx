import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Megaphone, Trash2, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-warning/10 text-warning",
  urgent: "bg-late/10 text-late",
};

interface AnnouncementsProps {
  profileMap: Record<string, any>;
  isAdminOrHR: boolean;
}

const Announcements = ({ profileMap, isAdminOrHR }: AnnouncementsProps) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", priority: "normal" });
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
  };

  useEffect(() => {
    fetchAnnouncements();
    const channel = supabase
      .channel("announcement-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, fetchAnnouncements)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("announcements").insert({
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        author_id: user!.id,
      });

      if (error) {
        toast.error("Failed to create announcement");
        return;
      }

      if (sendEmail) {
        const { error: fnError } = await supabase.functions.invoke("notify-announcement", {
          body: {
            title: form.title.trim(),
            content: form.content.trim(),
            priority: form.priority,
            authorId: user!.id,
          },
        });
        if (fnError) {
          console.error("Email notification failed:", fnError);
          toast.warning("Announcement published but email notification failed");
        } else {
          toast.success("Announcement published & emails sent");
        }
      } else {
        toast.success("Announcement published");
      }

      setShowCreate(false);
      setForm({ title: "", content: "", priority: "normal" });
      setSendEmail(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("announcements").update({ is_active: false }).eq("id", id);
    if (error) toast.error("Failed to remove announcement");
    else toast.success("Announcement removed");
  };

  return (
    <div className="space-y-4">
      {isAdminOrHR && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Announcement
          </Button>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const author = profileMap[a.author_id];
            return (
              <div key={a.id} className="glass-card rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={`text-xs ${priorityColors[a.priority]}`}>
                        {a.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{a.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">— {author?.name || "Unknown"}</p>
                  </div>
                  {isAdminOrHR && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-late" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Announcement title" required />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="Write your announcement..." rows={4} required />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox id="sendEmail" checked={sendEmail} onCheckedChange={(v) => setSendEmail(!!v)} />
              <Label htmlFor="sendEmail" className="flex items-center gap-1.5 text-sm font-normal cursor-pointer">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Also send via email to all employees
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Publishing..." : "Publish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Announcements;
