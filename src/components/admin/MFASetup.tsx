import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MFASetup = () => {
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  const checkMFAStatus = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data?.totp && data.totp.length > 0) {
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) {
        setIsEnrolled(true);
        setFactorId(verified.id);
        return true;
      }
    }
    setIsEnrolled(false);
    return false;
  };

  const handleOpenChange = async (open: boolean) => {
    setDialogOpen(open);
    if (open) {
      await checkMFAStatus();
    } else {
      // Reset enrollment state
      setEnrolling(false);
      setQrUri(null);
      setSecret(null);
      setVerifyCode("");
    }
  };

  const startEnrollment = async () => {
    setLoading(true);
    try {
      // Unenroll any unverified factors first
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp) {
        for (const f of factors.totp) {
          if (f.status === "unverified") {
            await supabase.auth.mfa.unenroll({ factorId: f.id });
          }
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "AttendTrack Admin TOTP",
      });
      if (error) throw error;

      setFactorId(data.id);
      setQrUri(data.totp.uri);
      setSecret(data.totp.secret);
      setEnrolling(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to start 2FA setup");
    } finally {
      setLoading(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!factorId || verifyCode.length !== 6) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      setIsEnrolled(true);
      setEnrolling(false);
      setQrUri(null);
      setSecret(null);
      setVerifyCode("");
      toast.success("Two-factor authentication enabled successfully!");
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const disableMFA = async () => {
    if (!factorId) return;
    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setIsEnrolled(false);
      setFactorId(null);
      toast.success("Two-factor authentication disabled");
    } catch (error: any) {
      toast.error(error.message || "Failed to disable 2FA");
    } finally {
      setUnenrolling(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Shield className="w-4 h-4" />
          Two-Factor Auth (2FA)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Add an extra layer of security to your admin account using a TOTP
            authenticator app.
          </DialogDescription>
        </DialogHeader>

        {isEnrolled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <ShieldCheck className="w-6 h-6 text-green-500 shrink-0" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">
                  2FA is enabled
                </p>
                <p className="text-sm text-muted-foreground">
                  Your account is protected with TOTP authentication.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={disableMFA}
              disabled={unenrolling}
              className="w-full"
            >
              {unenrolling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <ShieldOff className="w-4 h-4 mr-2" />
              Disable 2FA
            </Button>
          </div>
        ) : enrolling && qrUri ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google
              Authenticator, Authy, etc.):
            </p>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG value={qrUri} size={200} />
            </div>
            {secret && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Or enter this secret manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 text-xs bg-muted rounded-md font-mono break-all">
                    {secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copySecret}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="totp-code">Enter 6-digit code to verify</Label>
              <Input
                id="totp-code"
                value={verifyCode}
                onChange={(e) =>
                  setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
                autoComplete="one-time-code"
              />
            </div>
            <Button
              onClick={verifyEnrollment}
              disabled={loading || verifyCode.length !== 6}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify & Enable 2FA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <ShieldOff className="w-6 h-6 text-yellow-500 shrink-0" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">
                  2FA is not enabled
                </p>
                <p className="text-sm text-muted-foreground">
                  Protect your admin account with time-based one-time passwords.
                </p>
              </div>
            </div>
            <Button
              onClick={startEnrollment}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Shield className="w-4 h-4 mr-2" />
              Set Up 2FA
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MFASetup;
