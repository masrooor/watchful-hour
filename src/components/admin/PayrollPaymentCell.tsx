import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, Upload, Image, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PayrollPaymentCellProps {
  userId: string;
  employeeName: string;
  month: number;
  year: number;
  payment: {
    id?: string;
    is_paid: boolean;
    screenshot_path?: string | null;
    paid_at?: string | null;
  } | null;
  onUpdate: () => void;
}

const PayrollPaymentCell = ({
  userId,
  employeeName,
  month,
  year,
  payment,
  onUpdate,
}: PayrollPaymentCellProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const isPaid = payment?.is_paid ?? false;

  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const path = `${userId}/${year}-${String(month + 1).padStart(2, "0")}-${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-screenshots")
      .upload(path, file);

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    // Upsert payment record
    const { error } = await supabase
      .from("payroll_payments" as any)
      .upsert(
        {
          user_id: userId,
          month: month,
          year: year,
          screenshot_path: path,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id,month,year" }
      );

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Screenshot uploaded");
      onUpdate();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleMarkPaid = async () => {
    setMarking(true);
    const { error } = await supabase
      .from("payroll_payments" as any)
      .upsert(
        {
          user_id: userId,
          month: month,
          year: year,
          is_paid: true,
          paid_by: user?.id,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id,month,year" }
      );

    if (error) {
      toast.error("Failed to mark as paid: " + error.message);
    } else {
      toast.success(`${employeeName} marked as paid`);
      onUpdate();
    }
    setMarking(false);
  };

  const handleMarkUnpaid = async () => {
    setMarking(true);
    const { error } = await supabase
      .from("payroll_payments" as any)
      .upsert(
        {
          user_id: userId,
          month: month,
          year: year,
          is_paid: false,
          paid_by: null,
          paid_at: null,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id,month,year" }
      );

    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(`${employeeName} marked as unpaid`);
      onUpdate();
    }
    setMarking(false);
  };

  const viewScreenshot = async () => {
    if (!payment?.screenshot_path) return;
    setLoadingUrl(true);
    const { data } = await supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(payment.screenshot_path, 120);

    if (data?.signedUrl) {
      setScreenshotUrl(data.signedUrl);
    } else {
      toast.error("Failed to load screenshot");
    }
    setLoadingUrl(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      {isPaid ? (
        <Badge variant="secondary" className="bg-on-time/10 text-on-time text-xs gap-1">
          <CheckCircle className="w-3 h-3" /> Paid
        </Badge>
      ) : (
        <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs gap-1">
          <XCircle className="w-3 h-3" /> Unpaid
        </Badge>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Payment details">
            <Image className="w-3.5 h-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Payment — {employeeName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              {isPaid ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-on-time/10 text-on-time border-0">Paid</Badge>
                  <Button variant="outline" size="sm" onClick={handleMarkUnpaid} disabled={marking}>
                    {marking ? <Loader2 className="w-3 h-3 animate-spin" /> : "Undo"}
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={handleMarkPaid} disabled={marking}>
                  {marking ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                  Mark as Paid
                </Button>
              )}
            </div>

            {/* Payment date */}
            {payment?.paid_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paid on</span>
                <span className="text-sm">{new Date(payment.paid_at).toLocaleDateString()}</span>
              </div>
            )}

            {/* Screenshot upload */}
            <div className="space-y-2">
              <Label className="text-sm">Payment Screenshot</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor={`screenshot-${userId}`} className="cursor-pointer">
                  <Button size="sm" variant="outline" asChild disabled={uploading}>
                    <span>
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      {uploading ? "Uploading..." : "Upload Screenshot"}
                    </span>
                  </Button>
                </Label>
                <Input
                  id={`screenshot-${userId}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadScreenshot}
                />
                {payment?.screenshot_path && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={viewScreenshot}
                    disabled={loadingUrl}
                  >
                    {loadingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5 mr-1" />}
                    View
                  </Button>
                )}
              </div>
            </div>

            {/* Screenshot preview */}
            {screenshotUrl && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={screenshotUrl}
                  alt="Payment screenshot"
                  className="w-full max-h-[400px] object-contain bg-muted"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollPaymentCell;
