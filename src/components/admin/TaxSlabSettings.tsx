import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Percent } from "lucide-react";
import { toast } from "sonner";

interface TaxSlab {
  id: string;
  min_salary: number;
  max_salary: number | null;
  percentage: number;
  description: string | null;
  is_active: boolean;
}

const TaxSlabSettings = () => {
  const [slabs, setSlabs] = useState<TaxSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSlab, setNewSlab] = useState({ min_salary: "", max_salary: "", percentage: "", description: "" });

  const fetchSlabs = async () => {
    const { data } = await supabase
      .from("tax_slabs")
      .select("*")
      .order("min_salary", { ascending: true });
    setSlabs((data as TaxSlab[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSlabs(); }, []);

  const addSlab = async () => {
    if (!newSlab.min_salary || !newSlab.percentage) {
      toast.error("Min salary and percentage are required");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("tax_slabs").insert({
      min_salary: Number(newSlab.min_salary),
      max_salary: newSlab.max_salary ? Number(newSlab.max_salary) : null,
      percentage: Number(newSlab.percentage),
      description: newSlab.description || null,
    });
    if (error) {
      toast.error("Failed to add tax slab");
    } else {
      toast.success("Tax slab added");
      setNewSlab({ min_salary: "", max_salary: "", percentage: "", description: "" });
      fetchSlabs();
    }
    setAdding(false);
  };

  const deleteSlab = async (id: string) => {
    const { error } = await supabase.from("tax_slabs").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Tax slab deleted");
      fetchSlabs();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("tax_slabs").update({ is_active: !current }).eq("id", id);
    fetchSlabs();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Percent className="w-5 h-5 text-primary" /> Tax Slab Configuration
        </CardTitle>
        <CardDescription>
          Configure income tax slabs. The applicable slab is determined by the employee's gross monthly salary.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new slab */}
        <div className="flex flex-wrap items-end gap-2 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Min Salary (Rs)</label>
            <Input
              type="number"
              placeholder="0"
              value={newSlab.min_salary}
              onChange={(e) => setNewSlab({ ...newSlab, min_salary: e.target.value })}
              className="w-[130px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Max Salary (Rs)</label>
            <Input
              type="number"
              placeholder="No limit"
              value={newSlab.max_salary}
              onChange={(e) => setNewSlab({ ...newSlab, max_salary: e.target.value })}
              className="w-[130px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tax %</label>
            <Input
              type="number"
              step="0.1"
              placeholder="0"
              value={newSlab.percentage}
              onChange={(e) => setNewSlab({ ...newSlab, percentage: e.target.value })}
              className="w-[100px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Input
              placeholder="e.g. Basic slab"
              value={newSlab.description}
              onChange={(e) => setNewSlab({ ...newSlab, description: e.target.value })}
              className="w-[160px]"
            />
          </div>
          <Button size="sm" onClick={addSlab} disabled={adding}>
            <Plus className="w-4 h-4 mr-1" /> Add Slab
          </Button>
        </div>

        {/* Slabs table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Min Salary</TableHead>
              <TableHead>Max Salary</TableHead>
              <TableHead>Tax %</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slabs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No tax slabs configured
                </TableCell>
              </TableRow>
            ) : (
              slabs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">Rs {Number(s.min_salary).toLocaleString()}</TableCell>
                  <TableCell>{s.max_salary ? `Rs ${Number(s.max_salary).toLocaleString()}` : "No limit"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.percentage}%</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.description || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={s.is_active ? "bg-on-time/10 text-on-time cursor-pointer" : "cursor-pointer"}
                      onClick={() => toggleActive(s.id, s.is_active)}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteSlab(s.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TaxSlabSettings;
