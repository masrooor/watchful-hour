import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AddAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: any[];
  onSuccess: () => void;
}

const AddAttendanceDialog = ({ open, onOpenChange, profiles, onSuccess }: AddAttendanceDialogProps) => {
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [status, setStatus] = useState("on-time");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !date) {
      toast.error("Employee and date are required");
      return;
    }

    setLoading(true);
    try {
      const record = {
        user_id: userId,
        date,
        status,
        clock_in: clockIn ? `${date}T${clockIn}:00` : null,
        clock_out: clockOut ? `${date}T${clockOut}:00` : null,
      };

      const { error } = await supabase.from("attendance_records").insert([record]);
      if (error) throw error;

      toast.success("Attendance record added");
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to add record");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserId("");
    setDate(new Date().toISOString().split("T")[0]);
    setClockIn("");
    setClockOut("");
    setStatus("on-time");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Attendance Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.name} {p.employee_id ? `(${p.employee_id})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Clock In</Label>
              <Input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Clock Out</Label>
              <Input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="on-time">On Time</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Record"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAttendanceDialog;
