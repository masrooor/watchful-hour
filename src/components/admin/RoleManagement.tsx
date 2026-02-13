import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Shield, UserCog, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { logAudit } from "@/lib/auditLog";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-destructive/10 text-destructive border-destructive/20" },
  hr: { label: "HR", color: "bg-primary/10 text-primary border-primary/20" },
  manager: { label: "Manager", color: "bg-warning/10 text-warning border-warning/20" },
  payroll_officer: { label: "Payroll Officer", color: "bg-accent text-accent-foreground border-border" },
  user: { label: "Employee", color: "bg-muted text-muted-foreground border-border" },
};

const ALL_ROLES = ["admin", "hr", "manager", "payroll_officer", "user"] as const;

interface RoleManagementProps {
  profiles: any[];
}

const RoleManagement = ({ profiles }: RoleManagementProps) => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    const { data } = await supabase.from("user_roles").select("*");
    const map: Record<string, string> = {};
    data?.forEach((r) => { map[r.user_id] = r.role; });
    setRoles(map);
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === user?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    const oldRole = roles[userId] || "user";
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as any })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update role: " + error.message);
      return;
    }

    setRoles((prev) => ({ ...prev, [userId]: newRole }));

    const profile = profiles.find((p) => p.user_id === userId);
    await logAudit(
      "role_changed",
      "user_role",
      userId,
      {
        employee: profile?.name || userId,
        from: oldRole,
        to: newRole,
      }
    );

    toast.success(`Role updated to ${ROLE_LABELS[newRole]?.label || newRole}`);
  };

  const filtered = profiles.filter((p) =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.department?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ALL_ROLES.map((r) => {
            const count = Object.values(roles).filter((v) => v === r).length;
            const cfg = ROLE_LABELS[r];
            return (
              <Badge key={r} variant="outline" className={cfg.color}>
                {cfg.label}: {count}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Change Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const currentRole = roles[p.user_id] || "user";
                const cfg = ROLE_LABELS[currentRole] || ROLE_LABELS.user;
                const isSelf = p.user_id === user?.id;

                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {(p.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <span className="font-medium text-sm text-foreground">
                          {p.name || "Unknown"}
                          {isSelf && <span className="text-muted-foreground ml-1">(you)</span>}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.department || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentRole}
                        onValueChange={(val) => handleRoleChange(p.user_id, val)}
                        disabled={isSelf}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RoleManagement;
