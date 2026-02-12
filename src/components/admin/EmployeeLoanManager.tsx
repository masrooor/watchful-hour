import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, DollarSign, Search, CheckCircle, XCircle } from "lucide-react";

interface EmployeeLoanManagerProps {
  profiles: any[];
  profileMap: Record<string, any>;
}

const EmployeeLoanManager = ({ profiles, profileMap }: EmployeeLoanManagerProps) => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    user_id: "", description: "", total_amount: "", monthly_deduction: "", start_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchLoans = async () => {
    setLoading(true);
    const { data } = await supabase.from("employee_loans").select("*").order("created_at", { ascending: false });
    setLoans(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLoans(); }, []);

  const handleAdd = async () => {
    if (!form.user_id || !form.description || !form.total_amount || !form.monthly_deduction) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("employee_loans").insert({
      user_id: form.user_id,
      description: form.description,
      total_amount: parseFloat(form.total_amount),
      monthly_deduction: parseFloat(form.monthly_deduction),
      start_date: form.start_date || new Date().toISOString().split("T")[0],
      approval_status: "approved",
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
      is_active: true,
    });
    if (error) {
      toast.error("Failed to add loan");
    } else {
      toast.success("Loan added successfully");
      setShowAdd(false);
      setForm({ user_id: "", description: "", total_amount: "", monthly_deduction: "", start_date: "" });
      fetchLoans();
    }
    setSubmitting(false);
  };

  const approveLoan = async (loan: any) => {
    const { error } = await supabase
      .from("employee_loans")
      .update({
        approval_status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        is_active: true,
        start_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", loan.id);
    if (error) toast.error("Failed to approve");
    else { toast.success("Loan approved — deductions will begin"); fetchLoans(); }
  };

  const rejectLoan = async (loan: any) => {
    const { error } = await supabase
      .from("employee_loans")
      .update({ approval_status: "rejected" })
      .eq("id", loan.id);
    if (error) toast.error("Failed to reject");
    else { toast.success("Loan request rejected"); fetchLoans(); }
  };

  const toggleLoan = async (loan: any) => {
    const { error } = await supabase
      .from("employee_loans")
      .update({ is_active: !loan.is_active })
      .eq("id", loan.id);
    if (error) toast.error("Failed to update");
    else fetchLoans();
  };

  const deleteLoan = async (id: string) => {
    const { error } = await supabase.from("employee_loans").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Loan deleted"); fetchLoans(); }
  };

  const filteredLoans = loans.filter((l) => {
    const p = profileMap[l.user_id];
    const matchSearch = !search || p?.name?.toLowerCase().includes(search.toLowerCase()) || l.description.toLowerCase().includes(search.toLowerCase());
    const matchUser = filterUser === "all" || l.user_id === filterUser;
    const status = l.approval_status || "approved";
    const matchStatus = filterStatus === "all" || status === filterStatus;
    return matchSearch && matchUser && matchStatus;
  });

  const pendingCount = loans.filter((l) => (l.approval_status || "approved") === "pending").length;
  const totalActive = loans.filter((l) => l.is_active && (l.approval_status || "approved") === "approved").reduce((s, l) => s + Number(l.monthly_deduction), 0);

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search loans..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Loan
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-xl">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Loans</p>
                <p className="text-2xl font-bold text-foreground">{loans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/10 p-3 rounded-xl">
                <DollarSign className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-on-time/10 p-3 rounded-xl">
                <DollarSign className="w-5 h-5 text-on-time" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Loans</p>
                <p className="text-2xl font-bold text-foreground">{loans.filter((l) => l.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-late/10 p-3 rounded-xl">
                <DollarSign className="w-5 h-5 text-late" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Deductions</p>
                <p className="text-2xl font-bold text-foreground">Rs {totalActive.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employee Loans & Deductions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Monthly Deduction</TableHead>
                <TableHead className="text-right">Total Deducted</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-center">Approval</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No loans found</TableCell>
                </TableRow>
              ) : (
                filteredLoans.map((l) => {
                  const p = profileMap[l.user_id];
                  const remaining = Math.max(0, Number(l.total_amount) - Number(l.total_deducted));
                  const approvalStatus = l.approval_status || "approved";
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm text-foreground">{p?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{p?.employee_id || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-muted-foreground">{l.description}</p>
                          {l.reason && <p className="text-xs text-muted-foreground/70 italic mt-0.5">{l.reason}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">Rs {Number(l.total_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm text-late font-medium">Rs {Number(l.monthly_deduction).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">Rs {Number(l.total_deducted).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-medium">Rs {remaining.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        {approvalStatus === "pending" ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-on-time hover:text-on-time" onClick={() => approveLoan(l)}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => rejectLoan(l)}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          statusBadge(approvalStatus)
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {approvalStatus === "approved" && (
                          <Badge
                            variant="outline"
                            className={l.is_active ? "bg-on-time/10 text-on-time cursor-pointer" : "bg-muted text-muted-foreground cursor-pointer"}
                            onClick={() => toggleLoan(l)}
                          >
                            {l.is_active ? "Active" : "Completed"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLoan(l.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Employee Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm((p) => ({ ...p, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.name} ({p.employee_id || "N/A"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Personal Loan, Salary Advance" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Amount *</Label>
                <Input type="number" value={form.total_amount} onChange={(e) => setForm((p) => ({ ...p, total_amount: e.target.value }))} placeholder="50000" />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Deduction *</Label>
                <Input type="number" value={form.monthly_deduction} onChange={(e) => setForm((p) => ({ ...p, monthly_deduction: e.target.value }))} placeholder="5000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? "Adding..." : "Add Loan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeLoanManager;
