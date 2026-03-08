import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Loader2, MapPin } from "lucide-react";

interface MFAVerificationProps {
  onVerified: () => void;
}

const MFAVerification = ({ onVerified }: MFAVerificationProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);

    try {
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors?.totp?.find((f) => f.status === "verified");
      if (!totpFactor) throw new Error("No TOTP factor found");

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      toast.success("Verification successful!");
      onVerified();
    } catch (error: any) {
      toast.error(error.message || "Invalid code. Please try again.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            AttendTrack
          </h1>
        </div>

        <div className="glass-card rounded-xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              Two-Factor Verification
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Enter the 6-digit code from your authenticator app to continue.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Verification Code</Label>
              <Input
                id="mfa-code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
                autoComplete="one-time-code"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.length === 6) handleVerify();
                }}
              />
            </div>
            <Button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Secured with two-factor authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MFAVerification;
