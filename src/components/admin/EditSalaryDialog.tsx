import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  onSuccess: () => void;
}

const EditSalaryDialog = ({ open, onOpenChange, profile, onSuccess }: EditSalaryDialogProps) => {
  const [salary, setSalary] = useState(profile?.salary?.toString() || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ salary: salary ? parseFloat(salary) : null })
      .eq("id", profile.id);
    if (error) {
      toast.error("Failed to update salary");
    } else {
      toast.success(`Salary updated for ${profile.name}`);
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Salary — {profile?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Employee ID</Label>
            <Input value={profile?.employee_id || "—"} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly Salary (Rs)</Label>
            <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Enter salary" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSalaryDialog;
