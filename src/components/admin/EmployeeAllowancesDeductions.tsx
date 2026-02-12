import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, DollarSign, MinusCircle, Loader2 } from "lucide-react";

interface Props {
  profiles: any[];
}

const ALLOWANCE_TYPES = [
  { value: "housing", label: "Housing Allowance" },
  { value: "transport", label: "Transport Allowance" },
  { value: "medical", label: "Medical Allowance" },
  { value: "custom", label: "Custom Allowance" },
];

const DEDUCTION_TYPES = [
  { value: "provident_fund", label: "Provident Fund" },
  { value: "eobi", label: "EOBI" },
  { value: "insurance", label: "Insurance" },
  { value: "custom", label: "Custom Deduction" },
];

const EmployeeAllowancesDeductions = ({ profiles }: Props) => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [allowances, setAllowances] = useState<any[]>([]);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [addType, setAddType] = useState<"allowance" | "deduction" | null>(null);
  const [form, setForm] = useState({ type: "", label: "", amount: "", isPercentage: false });

  useEffect(() => {
    if (selectedEmployee) fetchData();
  }, [selectedEmployee]);

  const fetchData = async () => {
    setLoading(true);
    const [aRes, dRes] = await Promise.all([
      supabase.from("employee_allowances").select("*").eq("user_id", selectedEmployee).order("created_at"),
      supabase.from("employee_deductions").select("*").eq("user_id", selectedEmployee).order("created_at"),
    ]);
    setAllowances(aRes.data || []);
    setDeductions(dRes.data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.type || !form.label.trim() || !form.amount) {
      toast.error("Please fill in all fields");
      return;
    }
    const amount = Number(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    if (addType === "allowance") {
      const { error } = await supabase.from("employee_allowances").insert({
        user_id: selectedEmployee,
        allowance_type: form.type,
        label: form.label.trim(),
        amount,
      });
      if (error) { toast.error("Failed to add allowance"); return; }
      toast.success("Allowance added");
    } else {
      const { error } = await supabase.from("employee_deductions").insert({
        user_id: selectedEmployee,
        deduction_type: form.type,
        label: form.label.trim(),
        amount,
        is_percentage: form.isPercentage,
      });
      if (error) { toast.error("Failed to add deduction"); return; }
      toast.success("Deduction added");
    }
    setAddType(null);
    setForm({ type: "", label: "", amount: "", isPercentage: false });
    fetchData();
  };

  const toggleActive = async (table: "employee_allowances" | "employee_deductions", id: string, current: boolean) => {
    const { error } = await supabase.from(table).update({ is_active: !current }).eq("id", id);
    if (error) toast.error("Failed to update");
    else fetchData();
  };

  const handleDelete = async (table: "employee_allowances" | "employee_deductions", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetchData(); }
  };

  const selectedProfile = profiles.find((p) => p.user_id === selectedEmployee);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select an employee" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p) => (
              <SelectItem key={p.user_id} value={p.user_id}>
                {p.name} ({p.employee_id || p.department})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedEmployee && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select an employee to manage their allowances and deductions.
          </CardContent>
        </Card>
      )}

      {selectedEmployee && loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {selectedEmployee && !loading && (
        <>
          {/* Allowances */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Allowances — {selectedProfile?.name}
              </CardTitle>
              <Button size="sm" onClick={() => { setAddType("allowance"); setForm({ type: "", label: "", amount: "", isPercentage: false }); }}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="text-right">Amount (Rs)</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allowances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No allowances configured</TableCell>
                    </TableRow>
                  ) : (
                    allowances.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Badge variant="secondary">{ALLOWANCE_TYPES.find((t) => t.value === a.allowance_type)?.label || a.allowance_type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{a.label}</TableCell>
                        <TableCell className="text-right text-sm font-medium">Rs {Number(a.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={a.is_active} onCheckedChange={() => toggleActive("employee_allowances", a.id, a.is_active)} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete("employee_allowances", a.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MinusCircle className="w-4 h-4 text-destructive" />
                Custom Deductions — {selectedProfile?.name}
              </CardTitle>
              <Button size="sm" onClick={() => { setAddType("deduction"); setForm({ type: "", label: "", amount: "", isPercentage: false }); }}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No custom deductions configured</TableCell>
                    </TableRow>
                  ) : (
                    deductions.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Badge variant="secondary">{DEDUCTION_TYPES.find((t) => t.value === d.deduction_type)?.label || d.deduction_type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{d.label}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {d.is_percentage ? `${Number(d.amount)}%` : `Rs ${Number(d.amount).toLocaleString()}`}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={d.is_active} onCheckedChange={() => toggleActive("employee_deductions", d.id, d.is_active)} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete("employee_deductions", d.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addType !== null} onOpenChange={(o) => { if (!o) setAddType(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{addType === "allowance" ? "Add Allowance" : "Add Deduction"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => {
                const types = addType === "allowance" ? ALLOWANCE_TYPES : DEDUCTION_TYPES;
                const found = types.find((t) => t.value === v);
                setForm((p) => ({ ...p, type: v, label: found && v !== "custom" ? found.label : p.label }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {(addType === "allowance" ? ALLOWANCE_TYPES : DEDUCTION_TYPES).map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} placeholder="e.g. Housing Allowance" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount {addType === "deduction" && form.isPercentage ? "(% of Gross)" : "(Rs)"}</Label>
              <Input type="number" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
            </div>
            {addType === "deduction" && (
              <div className="flex items-center gap-2">
                <Switch checked={form.isPercentage} onCheckedChange={(v) => setForm((p) => ({ ...p, isPercentage: v }))} />
                <Label className="text-sm text-muted-foreground">Amount is percentage of gross salary</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddType(null)}>Cancel</Button>
            <Button onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeAllowancesDeductions;
