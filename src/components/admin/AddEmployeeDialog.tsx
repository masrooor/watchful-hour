import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditLog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddEmployeeDialog = ({ open, onOpenChange, onSuccess }: AddEmployeeDialogProps) => {
  const [form, setForm] = useState({
    name: "", email: "", department: "", password: "",
    cnic: "", phone: "", emergency_contact_name: "", emergency_contact_phone: "",
    address: "", city: "", date_of_birth: "", designation: "",
    employment_type: "full-time", job_status: "probation", salary: "", joining_date: "",
    shift_start: "", shift_end: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const resetForm = () => setForm({
    name: "", email: "", department: "", password: "",
    cnic: "", phone: "", emergency_contact_name: "", emergency_contact_phone: "",
    address: "", city: "", date_of_birth: "", designation: "",
    employment_type: "full-time", job_status: "probation", salary: "", joining_date: "",
    shift_start: "", shift_end: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Name, email, and password are required");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, any> = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v.trim()) body[k] = v.trim();
      });
      if (body.salary) body.salary = parseFloat(body.salary);

      const { data, error } = await supabase.functions.invoke("create-employee", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Employee "${form.name}" added successfully`);
      logAudit("create", "employee", data?.user_id, {
        name: form.name,
        email: form.email,
        department: form.department,
      });
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-name">Full Name *</Label>
                  <Input id="emp-name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="John Doe" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-email">Email *</Label>
                  <Input id="emp-email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="john@company.com" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-dept">Department</Label>
                  <Input id="emp-dept" value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="Engineering" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-pass">Temporary Password *</Label>
                  <Input id="emp-pass" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 characters" required />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-phone">Phone Number</Label>
                  <Input id="emp-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+92 300 1234567" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-city">City</Label>
                  <Input id="emp-city" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Lahore" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-address">Address</Label>
                <Input id="emp-address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Full address" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-ec-name">Emergency Contact Name</Label>
                  <Input id="emp-ec-name" value={form.emergency_contact_name} onChange={(e) => update("emergency_contact_name", e.target.value)} placeholder="Contact person" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-ec-phone">Emergency Contact Phone</Label>
                  <Input id="emp-ec-phone" value={form.emergency_contact_phone} onChange={(e) => update("emergency_contact_phone", e.target.value)} placeholder="+92 300 1234567" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="personal" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-cnic">CNIC / National ID</Label>
                  <Input id="emp-cnic" value={form.cnic} onChange={(e) => update("cnic", e.target.value)} placeholder="12345-6789012-3" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-dob">Date of Birth</Label>
                  <Input id="emp-dob" type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="employment" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-designation">Designation</Label>
                  <Input id="emp-designation" value={form.designation} onChange={(e) => update("designation", e.target.value)} placeholder="Software Engineer" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-type">Employment Type</Label>
                  <Select value={form.employment_type} onValueChange={(v) => update("employment_type", v)}>
                    <SelectTrigger id="emp-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full Time</SelectItem>
                      <SelectItem value="part-time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-job-status">Job Status</Label>
                  <Select value={form.job_status} onValueChange={(v) => update("job_status", v)}>
                    <SelectTrigger id="emp-job-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="probation">Probation</SelectItem>
                      <SelectItem value="permanent">Permanent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-salary">Salary</Label>
                  <Input id="emp-salary" type="number" value={form.salary} onChange={(e) => update("salary", e.target.value)} placeholder="50000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-joining">Joining Date</Label>
                  <Input id="emp-joining" type="date" value={form.joining_date} onChange={(e) => update("joining_date", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-shift-start">Shift Start Time</Label>
                  <Input id="emp-shift-start" type="time" value={form.shift_start} onChange={(e) => update("shift_start", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-shift-end">Shift End Time</Label>
                  <Input id="emp-shift-end" type="time" value={form.shift_end} onChange={(e) => update("shift_end", e.target.value)} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeDialog;
