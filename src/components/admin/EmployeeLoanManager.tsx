import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Loader2, Trash2, DollarSign, Search } from "lucide-react";

interface EmployeeLoanManagerProps {
  profiles: any[];
  profileMap: Record<string, any>;
}

const EmployeeLoanManager = ({ profiles, profileMap }: EmployeeLoanManagerProps) => {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("all");
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
    return matchSearch && matchUser;
  });

  const totalActive = loans.filter((l) => l.is_active).reduce((s, l) => s + Number(l.monthly_deduction), 0);

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
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Loan
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No loans found</TableCell>
                </TableRow>
              ) : (
                filteredLoans.map((l) => {
                  const p = profileMap[l.user_id];
                  const remaining = Math.max(0, Number(l.total_amount) - Number(l.total_deducted));
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm text-foreground">{p?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{p?.employee_id || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.description}</TableCell>
                      <TableCell className="text-right text-sm font-medium">Rs {Number(l.total_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm text-late font-medium">Rs {Number(l.monthly_deduction).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">Rs {Number(l.total_deducted).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-medium">Rs {remaining.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={l.is_active ? "bg-on-time/10 text-on-time cursor-pointer" : "bg-muted text-muted-foreground cursor-pointer"}
                          onClick={() => toggleLoan(l)}
                        >
                          {l.is_active ? "Active" : "Completed"}
                        </Badge>
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
