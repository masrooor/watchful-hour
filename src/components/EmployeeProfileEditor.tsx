import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { User, Pencil, Lock, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const EmployeeProfileEditor = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    phone: "", address: "", city: "", emergency_contact_name: "", emergency_contact_phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const handlePasswordChange = async () => {
    if (pwForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    if (error) {
      toast.error(error.message || "Failed to update password");
    } else {
      toast.success("Password updated successfully");
      setPwForm({ newPassword: "", confirmPassword: "" });
      setPwOpen(false);
    }
    setPwSaving(false);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setForm({
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || "",
            emergency_contact_name: data.emergency_contact_name || "",
            emergency_contact_phone: data.emergency_contact_phone || "",
          });
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
    }).eq("id", profile.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated");
      setProfile({ ...profile, ...form });
      setOpen(false);
    }
    setSaving(false);
  };

  if (!profile) return null;

  const fields = [
    { label: "Phone", value: profile.phone },
    { label: "City", value: profile.city },
    { label: "Address", value: profile.address },
    { label: "Emergency Contact", value: profile.emergency_contact_name },
    { label: "Emergency Phone", value: profile.emergency_contact_phone },
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            My Profile
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Pencil className="w-3 h-3 mr-1" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {fields.map((f) => (
            <div key={f.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium text-foreground">{f.value || "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Security
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setPwOpen(true)}>
            Change Password
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Update your password to keep your account secure.</p>
        </CardContent>
      </Card>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder="••••••••" minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="••••••••" minLength={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button onClick={handlePasswordChange} disabled={pwSaving}>
              {pwSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {pwSaving ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit My Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+92 300 1234567" maxLength={20} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Karachi" maxLength={50} />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Street address" maxLength={200} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Emergency Contact Name</Label>
                <Input value={form.emergency_contact_name} onChange={(e) => setForm((p) => ({ ...p, emergency_contact_name: e.target.value }))} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Emergency Contact Phone</Label>
                <Input value={form.emergency_contact_phone} onChange={(e) => setForm((p) => ({ ...p, emergency_contact_phone: e.target.value }))} maxLength={20} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeeProfileEditor;
