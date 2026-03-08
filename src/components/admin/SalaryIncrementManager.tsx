import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { TrendingUp, Plus, CalendarDays } from "lucide-react";

interface SalaryIncrementManagerProps {
  profile: any;
  onSalaryUpdated: () => void;
}

const SalaryIncrementManager = ({ profile, onSalaryUpdated }: SalaryIncrementManagerProps) => {
  const [increments, setIncrements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    new_salary: "",
    effective_date: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const currentSalary = Number(profile.salary) || 0;

  const fetchIncrements = async () => {
    const { data } = await supabase
      .from("salary_increments")
      .select("*")
      .eq("user_id", profile.user_id)
      .order("effective_date", { ascending: false });
    setIncrements(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchIncrements();
  }, [profile.user_id]);

  const handleSubmit = async () => {
    const newSalary = parseFloat(form.new_salary);
    if (!newSalary || newSalary <= 0) {
      toast.error("Please enter a valid new salary");
      return;
    }
    if (!form.effective_date) {
      toast.error("Please select an effective date");
      return;
    }

    setSaving(true);
    const incrementAmount = newSalary - currentSalary;
    const incrementPct = currentSalary > 0 ? ((incrementAmount / currentSalary) * 100) : null;

    const { data: userData } = await supabase.auth.getUser();

    // Insert increment record
    const { error: incError } = await supabase.from("salary_increments").insert({
      user_id: profile.user_id,
      previous_salary: currentSalary,
      new_salary: newSalary,
      increment_amount: incrementAmount,
      increment_percentage: incrementPct ? Math.round(incrementPct * 100) / 100 : null,
      effective_date: form.effective_date,
      reason: form.reason.trim() || null,
      approved_by: userData?.user?.id || null,
    });

    if (incError) {
      toast.error("Failed to record increment");
      setSaving(false);
      return;
    }

    // Update profile salary
    const { error: profError } = await supabase
      .from("profiles")
      .update({ salary: newSalary })
      .eq("id", profile.id);

    if (profError) {
      toast.error("Increment recorded but failed to update salary");
    } else {
      toast.success(`Salary updated from Rs ${currentSalary.toLocaleString()} to Rs ${newSalary.toLocaleString()}`);
      logAudit("salary_increment", "salary", profile.id, {
        employee: profile.name,
        previous_salary: currentSalary,
        new_salary: newSalary,
        increment_amount: incrementAmount,
        effective_date: form.effective_date,
      });
      onSalaryUpdated();
    }

    setForm({ new_salary: "", effective_date: new Date().toISOString().split("T")[0], reason: "" });
    setOpen(false);
    setSaving(false);
    fetchIncrements();
  };

  const newSalaryNum = parseFloat(form.new_salary) || 0;
  const previewAmount = newSalaryNum - currentSalary;
  const previewPct = currentSalary > 0 ? ((previewAmount / currentSalary) * 100) : 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Salary Increments
          </CardTitle>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Increment
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border p-4 mb-4">
            <p className="text-xs text-muted-foreground">Current Salary</p>
            <p className="text-lg font-bold text-foreground">
              {currentSalary > 0 ? `Rs ${currentSalary.toLocaleString()}` : "Not set"}
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : increments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No increment history found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Previous</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {increments.map((inc) => {
                  const amt = Number(inc.increment_amount);
                  const isPositive = amt >= 0;
                  return (
                    <TableRow key={inc.id}>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                          {inc.effective_date}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">Rs {Number(inc.previous_salary).toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-medium">Rs {Number(inc.new_salary).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={isPositive ? "bg-on-time/10 text-on-time border-on-time/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                          {isPositive ? "+" : ""}Rs {Math.abs(amt).toLocaleString()}
                          {inc.increment_percentage != null && ` (${inc.increment_percentage > 0 ? "+" : ""}${inc.increment_percentage}%)`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{inc.reason || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Salary Increment — {profile.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Current Salary</p>
              <p className="text-base font-semibold text-foreground">
                {currentSalary > 0 ? `Rs ${currentSalary.toLocaleString()}` : "Not set"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>New Salary (Rs) *</Label>
              <Input
                type="number"
                value={form.new_salary}
                onChange={(e) => setForm((p) => ({ ...p, new_salary: e.target.value }))}
                placeholder="Enter new salary"
              />
              {newSalaryNum > 0 && (
                <p className={`text-xs font-medium ${previewAmount >= 0 ? "text-on-time" : "text-destructive"}`}>
                  {previewAmount >= 0 ? "+" : ""}Rs {Math.abs(previewAmount).toLocaleString()}
                  {currentSalary > 0 && ` (${previewPct >= 0 ? "+" : ""}${previewPct.toFixed(1)}%)`}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Effective Date *</Label>
              <Input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Annual performance review, promotion, etc."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : "Apply Increment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalaryIncrementManager;
