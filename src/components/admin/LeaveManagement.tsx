import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CalendarDays, Check, X, Plus, Clock } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-on-time/10 text-on-time border-on-time/20",
  rejected: "bg-late/10 text-late border-late/20",
};

const leaveTypeLabels: Record<string, string> = {
  casual: "Casual",
  sick: "Sick",
  annual: "Annual",
  unpaid: "Unpaid",
  other: "Other",
};

interface LeaveManagementProps {
  profiles: any[];
  profileMap: Record<string, any>;
  isAdminOrHR: boolean;
}

const LeaveManagement = ({ profiles, profileMap, isAdminOrHR }: LeaveManagementProps) => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    leave_type: "casual",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const fetchLeaves = async () => {
    const { data } = await supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setLeaves(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaves();

    const channel = supabase
      .channel("leave-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, fetchLeaves)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date) {
      toast.error("Start and end dates are required");
      return;
    }

    const { error } = await supabase.from("leave_requests").insert({
      user_id: user!.id,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason.trim() || null,
    });

    if (error) {
      toast.error("Failed to submit leave request");
    } else {
      toast.success("Leave request submitted");
      setShowApply(false);
      setForm({ leave_type: "casual", start_date: "", end_date: "", reason: "" });
    }
  };

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("leave_requests")
      .update({ status, approved_by: user!.id, approved_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error(`Failed to ${status} leave`);
    } else {
      toast.success(`Leave ${status}`);
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    if (filter === "all") return true;
    return l.status === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setShowApply(true)}>
          <Plus className="w-4 h-4 mr-1" /> Apply Leave
        </Button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              {isAdminOrHR && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdminOrHR ? 8 : 7} className="text-center py-8 text-muted-foreground">
                  No leave requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredLeaves.map((l) => {
                const p = profileMap[l.user_id];
                const days = Math.ceil(
                  (new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {(p?.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{p?.name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{leaveTypeLabels[l.leave_type] || l.leave_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.start_date}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.end_date}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{days}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{l.reason || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[l.status]}>{l.status}</Badge>
                    </TableCell>
                    {isAdminOrHR && (
                      <TableCell>
                        {l.status === "pending" ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-on-time" onClick={() => handleAction(l.id, "approved")}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-late" onClick={() => handleAction(l.id, "rejected")}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={form.leave_type} onValueChange={(v) => setForm((p) => ({ ...p, leave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Optional reason..." rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
              <Button type="submit">Submit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagement;
