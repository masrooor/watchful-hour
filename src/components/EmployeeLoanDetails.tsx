import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Wallet } from "lucide-react";

const EmployeeLoanDetails = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("employee_loans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setLoans(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (loans.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          My Loans & Deductions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loans.map((loan) => {
          const remaining = Math.max(0, Number(loan.total_amount) - Number(loan.total_deducted));
          const progress = Number(loan.total_amount) > 0
            ? (Number(loan.total_deducted) / Number(loan.total_amount)) * 100
            : 0;

          return (
            <div key={loan.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{loan.description}</p>
                <Badge
                  variant="outline"
                  className={loan.is_active ? "bg-on-time/10 text-on-time" : "bg-muted text-muted-foreground"}
                >
                  {loan.is_active ? "Active" : "Completed"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold text-foreground">Rs {Number(loan.total_amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly</p>
                  <p className="font-semibold text-destructive">Rs {Number(loan.monthly_deduction).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-semibold text-foreground">Rs {remaining.toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Repaid: Rs {Number(loan.total_deducted).toLocaleString()}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default EmployeeLoanDetails;
