import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarDays, Plus, TreePalm, Thermometer, Briefcase } from "lucide-react";

const leaveTypeLabels: Record<string, string> = {
  casual: "Casual", sick: "Sick", annual: "Annual", unpaid: "Unpaid", other: "Other",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-on-time/10 text-on-time",
  rejected: "bg-late/10 text-late",
};

const EmployeeLeaveWidget = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [showApply, setShowApply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    leave_type: "casual", start_date: "", end_date: "", reason: "",
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      await supabase.rpc("ensure_leave_balance", { _user_id: user.id });

      const [leavesRes, balanceRes] = await Promise.all([
        supabase.from("leave_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("leave_balances").select("*").eq("user_id", user.id).eq("year", new Date().getFullYear()).maybeSingle(),
      ]);

      setLeaves(leavesRes.data || []);
      setBalance(balanceRes.data);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("my-leaves")
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests", filter: `user_id=eq.${user.id}` }, () => {
        supabase.from("leave_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
          .then(({ data }) => setLeaves(data || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_balances", filter: `user_id=eq.${user.id}` }, () => {
        supabase.from("leave_balances").select("*").eq("user_id", user.id).eq("year", new Date().getFullYear()).maybeSingle()
          .then(({ data }) => setBalance(data));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date) {
      toast.error("Start and end dates are required");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error("End date must be after start date");
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

  if (loading) return null;

  const balanceCards = [
    { label: "Casual", icon: TreePalm, total: "casual_total", used: "casual_used", color: "text-primary" },
    { label: "Sick", icon: Thermometer, total: "sick_total", used: "sick_used", color: "text-destructive" },
    { label: "Annual", icon: Briefcase, total: "annual_total", used: "annual_used", color: "text-on-time" },
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            My Leaves
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowApply(true)}>
            <Plus className="w-3 h-3 mr-1" /> Apply
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance summary */}
          {balance && (
            <div className="grid grid-cols-3 gap-2">
              {balanceCards.map((c) => {
                const total = balance[c.total] || 0;
                const used = balance[c.used] || 0;
                const remaining = total - used;
                const pct = total > 0 ? (used / total) * 100 : 0;
                return (
                  <div key={c.label} className="rounded-lg border border-border p-2 space-y-1">
                    <div className="flex items-center gap-1">
                      <c.icon className={`w-3 h-3 ${c.color}`} />
                      <span className="text-xs font-medium">{c.label}</span>
                    </div>
                    <Progress value={pct} className="h-1" />
                    <p className="text-[10px] text-muted-foreground">{remaining}/{total} left</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent requests */}
          {leaves.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No leave requests yet</p>
          ) : (
            <div className="space-y-2">
              {leaves.map((l) => {
                const days = Math.ceil(
                  (new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;
                return (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {leaveTypeLabels[l.leave_type] || l.leave_type}
                        </span>
                        <span className="text-xs text-muted-foreground">· {days} day{days > 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{l.start_date} → {l.end_date}</p>
                    </div>
                    <Badge variant="outline" className={statusColors[l.status]}>
                      {l.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Optional reason..." rows={3} maxLength={500} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
              <Button type="submit">Submit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeeLeaveWidget;
