import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings2, Save, TreePalm, Thermometer, Briefcase, Loader2, Info } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LeaveSettingsProps {
  profiles: any[];
}

const LeaveSettings = ({ profiles }: LeaveSettingsProps) => {
  const [annualTotal, setAnnualTotal] = useState(14);
  const [casualTotal, setCasualTotal] = useState(10);
  const [sickTotal, setSickTotal] = useState(8);
  const [saving, setSaving] = useState(false);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBalances = async () => {
    const { data } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("year", new Date().getFullYear());
    setBalances(data || []);
    // Use first record to populate defaults if available
    if (data && data.length > 0) {
      setAnnualTotal(data[0].annual_total);
      setCasualTotal(data[0].casual_total);
      setSickTotal(data[0].sick_total);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBalances(); }, []);

  const handleUpdateAll = async () => {
    setSaving(true);
    const year = new Date().getFullYear();

    // Update all existing balance records with new totals
    const { error } = await supabase
      .from("leave_balances")
      .update({
        annual_total: annualTotal,
        casual_total: casualTotal,
        sick_total: sickTotal,
      })
      .eq("year", year);

    if (error) {
      toast.error("Failed to update leave settings: " + error.message);
    } else {
      toast.success("Leave totals updated for all employees");
      fetchBalances();
    }
    setSaving(false);
  };

  // Monthly accrual info
  const annualPerMonth = (annualTotal / 12).toFixed(1);
  const casualPerMonth = (casualTotal / 12).toFixed(1);
  const sickPerMonth = (sickTotal / 12).toFixed(1);

  const profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p]));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            Leave Allocation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-500" />
                Annual Leave (Total/Year)
              </Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={annualTotal}
                onChange={(e) => setAnnualTotal(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Accrual: ~{annualPerMonth} leaves/month
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <TreePalm className="w-4 h-4 text-blue-500" />
                Casual Leave (Total/Year)
              </Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={casualTotal}
                onChange={(e) => setCasualTotal(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Accrual: ~{casualPerMonth} leaves/month
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                Sick Leave (Total/Year)
              </Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={sickTotal}
                onChange={(e) => setSickTotal(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Accrual: ~{sickPerMonth} leaves/month
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <Info className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Leaves are earned proportionally each month. For example, with {annualTotal} annual leaves, 
              an employee earns ~{annualPerMonth} leaves per month. This applies from their joining date.
            </p>
          </div>

          <Button onClick={handleUpdateAll} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? "Saving..." : "Update All Employees"}
          </Button>
        </CardContent>
      </Card>

      {/* Employee Balance Overview */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Employee Leave Balances ({new Date().getFullYear()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Annual</TableHead>
                  <TableHead>Casual</TableHead>
                  <TableHead>Sick</TableHead>
                  <TableHead>Total Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No leave balance records yet
                    </TableCell>
                  </TableRow>
                ) : (
                  balances.map((b) => {
                    const p = profileMap[b.user_id];
                    const totalUsed = b.annual_used + b.casual_used + b.sick_used;
                    return (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {(p?.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <span className="text-sm font-medium text-foreground">{p?.name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{b.annual_used}/{b.annual_total}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{b.casual_used}/{b.casual_total}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{b.sick_used}/{b.sick_total}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={totalUsed > 0 ? "bg-warning/10 text-warning border-warning/20" : "bg-muted text-muted-foreground border-border"}>
                            {totalUsed}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveSettings;
