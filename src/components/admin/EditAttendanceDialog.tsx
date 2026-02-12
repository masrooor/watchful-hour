import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface EditAttendanceDialogProps {
  record: any;
  profileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditAttendanceDialog = ({ record, profileName, open, onOpenChange }: EditAttendanceDialogProps) => {
  const [status, setStatus] = useState(record.status);
  const [clockIn, setClockIn] = useState(
    record.clock_in ? new Date(record.clock_in).toTimeString().slice(0, 5) : ""
  );
  const [clockOut, setClockOut] = useState(
    record.clock_out ? new Date(record.clock_out).toTimeString().slice(0, 5) : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates: any = { status };

    if (clockIn) {
      updates.clock_in = `${record.date}T${clockIn}:00`;
    } else {
      updates.clock_in = null;
    }

    if (clockOut) {
      updates.clock_out = `${record.date}T${clockOut}:00`;
    } else {
      updates.clock_out = null;
    }

    const { error } = await supabase
      .from("attendance_records")
      .update(updates)
      .eq("id", record.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to update record");
    } else {
      toast.success("Attendance record updated");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Attendance — {profileName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Date</Label>
            <Input value={record.date} disabled />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on-time">On Time</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Clock In</Label>
              <Input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
            </div>
            <div>
              <Label>Clock Out</Label>
              <Input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAttendanceDialog;
