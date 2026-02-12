import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Wallet, Plus } from "lucide-react";
import { toast } from "sonner";

const EmployeeLoanDetails = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    description: "",
    total_amount: "",
    monthly_deduction: "",
    reason: "",
  });

  const fetchLoans = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("employee_loans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLoans(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLoans();
  }, [user]);

  const handleApply = async () => {
    if (!form.description || !form.total_amount || !form.monthly_deduction) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("employee_loans").insert({
      user_id: user!.id,
      description: form.description,
      total_amount: parseFloat(form.total_amount),
      monthly_deduction: parseFloat(form.monthly_deduction),
      reason: form.reason || null,
      approval_status: "pending",
      is_active: false,
    });
    if (error) {
      toast.error("Failed to submit loan request");
    } else {
      toast.success("Loan request submitted successfully");
      setShowApply(false);
      setForm({ description: "", total_amount: "", monthly_deduction: "", reason: "" });
      fetchLoans();
    }
    setSubmitting(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="bg-on-time/10 text-on-time">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            My Loans & Deductions
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowApply(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Apply for Loan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No loan requests yet. Apply for a loan to get started.</p>
        ) : (
          loans.map((loan) => {
            const remaining = Math.max(0, Number(loan.total_amount) - Number(loan.total_deducted));
            const progress = Number(loan.total_amount) > 0
              ? (Number(loan.total_deducted) / Number(loan.total_amount)) * 100
              : 0;
            const approvalStatus = loan.approval_status || "approved";

            return (
              <div key={loan.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{loan.description}</p>
                  <div className="flex items-center gap-2">
                    {statusBadge(approvalStatus)}
                    {approvalStatus === "approved" && (
                      <Badge
                        variant="outline"
                        className={loan.is_active ? "bg-on-time/10 text-on-time" : "bg-muted text-muted-foreground"}
                      >
                        {loan.is_active ? "Active" : "Completed"}
                      </Badge>
                    )}
                  </div>
                </div>
                {loan.reason && (
                  <p className="text-xs text-muted-foreground italic">Reason: {loan.reason}</p>
                )}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold text-foreground">Rs {Number(loan.total_amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly</p>
                    <p className="font-semibold text-destructive">Rs {Number(loan.monthly_deduction).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-semibold text-foreground">Rs {remaining.toLocaleString()}</p>
                  </div>
                </div>
                {approvalStatus === "approved" && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Repaid: Rs {Number(loan.total_deducted).toLocaleString()}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Personal Loan, Salary Advance"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Amount *</Label>
                <Input
                  type="number"
                  value={form.total_amount}
                  onChange={(e) => setForm((p) => ({ ...p, total_amount: e.target.value }))}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Deduction *</Label>
                <Input
                  type="number"
                  value={form.monthly_deduction}
                  onChange={(e) => setForm((p) => ({ ...p, monthly_deduction: e.target.value }))}
                  placeholder="5000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Explain the purpose of this loan request..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EmployeeLoanDetails;
